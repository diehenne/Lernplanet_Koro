"""Erzeugt die Sprach-Bausteine mit der lokalen neuronalen Stimme Piper (Open Source).

Aufruf: python tools/gen_audio.py <pfad/zu/de_DE-thorsten-medium.onnx>
Benötigt: pip install piper-tts, ffmpeg.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

root = Path(__file__).resolve().parent.parent
out_dir = root / "public" / "audio"
out_dir.mkdir(parents=True, exist_ok=True)
corpus = json.loads((root / "tools/.cache/corpus.json").read_text())

voice = PiperVoice.load(sys.argv[1])
cfg = SynthesisConfig(length_scale=1.08, noise_scale=0.5, noise_w_scale=0.6)
# Stille am Anfang/Ende entfernen, damit sich die Bausteine nahtlos aneinanderreihen
trim = "silenceremove=1:0:-45dB,areverse,silenceremove=1:0:-45dB,areverse"

# Einzeln gesprochen klingt "fünf" wie "fun": im Satzkontext erzeugen und das letzte Wort ausschneiden
CONTEXT = {"n5": "Das ist die Zahl, fünf."}


def cut_last_word(wav_path: Path, dst: Path) -> bool:
    log = subprocess.run(
        ["ffmpeg", "-i", str(wav_path), "-af", "silencedetect=n=-40dB:d=0.08", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    starts = [float(l.split("silence_start: ")[1]) for l in log.splitlines() if "silence_start" in l]
    ends = [float(l.split("silence_end: ")[1].split()[0]) for l in log.splitlines() if "silence_end" in l]
    if len(ends) < 3 or not 0.2 < starts[-1] - ends[-2] < 0.7:
        return False
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path), "-ss", f"{ends[-2] - 0.02}", "-to", f"{starts[-1] + 0.03}",
         "-ac", "1", "-b:a", "56k", str(dst)], check=True)
    return True


for stale in out_dir.glob("*.mp3"):
    if stale.stem not in corpus:
        stale.unlink()

todo = [(f, t) for f, t in corpus.items() if not (out_dir / f"{f}.mp3").exists()]
print(f"{len(todo)} von {len(corpus)} Bausteinen neu zu erzeugen")
for i, (name, text) in enumerate(todo, 1):
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = Path(tmp) / "x.wav"
        with wave.open(str(wav_path), "wb") as w:
            voice.synthesize_wav(CONTEXT.get(name, text), w, cfg)
        if name in CONTEXT:
            for _ in range(20):
                if cut_last_word(wav_path, out_dir / f"{name}.mp3"):
                    break
                with wave.open(str(wav_path), "wb") as w:
                    voice.synthesize_wav(CONTEXT[name], w, cfg)
            else:
                raise SystemExit(f"{name}: Wort konnte nicht ausgeschnitten werden")
            continue
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path), "-af", trim,
             "-ac", "1", "-b:a", "56k", str(out_dir / f"{name}.mp3")],
            check=True,
        )
    if i % 50 == 0:
        print(i, "…")
print("fertig")
