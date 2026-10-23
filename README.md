# Lernplanet Koro – Das Abenteuer, das schlau macht

Browserbasiertes 3D-Lernspiel (7–10 Jahre) für Plus, Minus, Mal und Geteilt.
Konzept und Spielregeln: [KONZEPT.md](./KONZEPT.md).

## Start
```
npm install
npm run dev      # Entwicklungsserver (http://localhost:5173)
npm test         # Unit-Tests für Aufgabengenerator und Adaptivität
npm run build    # Typprüfung + Produktions-Build nach dist/
```

## Steuerung
Pfeiltasten/WASD oder Touch-Joystick. In die leuchtenden Kreise laufen startet ein Minispiel.

| Aktion | Tastatur | PS5-Controller |
|---|---|---|
| Laufen / Rennen | Pfeile/WASD / Shift | Stick / R1, R2 |
| Springen | Leertaste | ✕ |
| Werkzeug benutzen | E | □ |
| Einsammeln | R | ◯ |
| Drehen beim Aufstellen | Q | L1 |
| Rucksack / Karte | I / M | △ / Options |
| Werkzeug wählen | 1, 2, 3, 0 | im Rucksack |

In Menüs: Stick/Steuerkreuz bewegen, L1/R1 wechseln, ✕ wählt, ◯ zurück.

## Stand
- Eine große zusammenhängende Welt mit vier Regionen (Plus-Wald, Minus-Berge, Mal-Wüste, Teil-Sümpfe) und Marktplatz; jede Region hat eigene Musik (selbst komponiert, Web Audio)
- Händler mit Münzen legen, Wechselgeld ausrechnen und Verkaufen (Mal-Aufgabe)
- Rucksack, frei platzierbare Dinge, Schaufel/Axt/Schwert (graben, fällen, Schleime besiegen), Schatztruhen mit Inhalt und Lager, begehbare Häuser
- 6 Stufen pro Rechenart, adaptiv (Stufe lässt sich auch von Hand ändern); ab Stufe 3 Zahlenblock
- Entdecker-Held mit Hündchen, Koros als Bewohner (eigene Low-Poly-Figuren)
- Rubine für gelöste Aufgaben, Rubin-Laden zum Kaufen/Bauen von 10 Dingen (Fortschritt in localStorage)
- KI-Stimme: vorab mit Piper (Thorsten) erzeugte mp3-Bausteine in `public/audio/`

## Stimme neu erzeugen (nach Textänderungen)
```
pip install piper-tts   # plus Modell de_DE-thorsten-medium (rhasspy/piper-voices) und ffmpeg
npx tsx tools/dump-corpus.ts
python tools/gen_audio.py <pfad>/de_DE-thorsten-medium.onnx
```
Gesprochene Texte dürfen keine dynamischen Namen enthalten; der Test prüft die Vollständigkeit.

## Neu: Rätsel, Sterne, Gelände, Karte
- **Koros ansprechen** (□ / E): Geschichten in 3 Kapiteln mit Rätseln (Buchstabieren, Lückenwörter, Englisch-Vokabeln, Was passt nicht?, Gegenteile, Sachwissen, Reihenfolgen). Belohnung: Rubine, am Ende ein Stern; danach Zusatzrätsel.
- **Sterne = Lebensenergie** (max. 10). 4 Min. ohne Mathe-Aufgabe: Sterne erlöschen nach und nach (Warnung ab 3 Min.). Bei 0 wird man zum Marktplatz getragen. Schleim kostet einen Stern.
- **Mehr Mathe-Stellen**: Gipfel, Plateau (mit Rampe) und Tal in jeder Welt. Bergauf ist langsamer, steile Wände sind unpassierbar, Abstürze geben „Plumps“.
- **Bäume wachsen nach** (ca. 90 s). **Kleidung** kaufen und im Rucksack anziehen.
- **Karte** (🗺️ / Options): entdeckte Gebiete und Orte; „Reisen“ wechselt die Welt.
- **PS5-Symbole** erscheinen bei verbundenem Controller.

## Neu: Englisch-Insel, Minimap, Abbrechen
- **Englisch-Insel**: Portal auf dem Marktplatz (oder „Englisch-Insel“ im Reisemenü). Rote Telefonzellen starten Runden mit Vokabeln, Schreibweise, Lückensätzen und „Was passt nicht?“ (🔊 liest englische Wörter mit der Browser-Stimme vor). Eigene Musik.
- Koros stellen jetzt viel mehr Englisch-Rätsel (3 neue Englisch-Geschichten, Zusatzrätsel zu 65 % Englisch).
- **Minimap** unten links; **Abbrechen** bei Aufgaben mit ◯ / Button.
- **Sternverlust** wird mit rotem Aufblitzen, Wackeln, Ton und Vibration angezeigt.

### Steuerung & Geräusche (Ergänzung)
- Kamera: rechter Stick am Controller (links/rechts drehen, hoch/runter neigen); Tastatur: C/V drehen, B/N neigen. Bewegung ist kamerarelativ.
- Niedrige Hindernisse (Steine, Truhen, Zäune) kann man erklimmen.
- Geräusche (`src/ui/sfx.ts`): Schwert, Axt, Baumfall, Graben, Truhe, Sprung, Münzen, Portal u. a.
- Karte: „Beenden“ speichert und führt zurück ins Hauptmenü (Spielerwechsel / neues Spiel).

## Neu: Deutsch, Wissen, Sudoku, Rätsel
- Vier neue Lernbereiche nördlich von Englisch-Land, per Straße verbunden und durch Erkunden freischaltbar: **Deutsch-Dorf** (Rechtschreibung, Artikel, Mehrzahl, Wortarten, Zeiten), **Wissens-Wiese** (Sachkunde, Grundschulniveau), **Sudoku-Hügel** (auf einer Anhöhe; 4×4 und 6×6, eindeutig lösbar) und **Rätsel-Berg** (Zahlenfolgen, Knobeleien, Emoji-Rätsel). Jeweils eigene Musik und Wahrzeichen.
- Namenseingabe: Bildschirmtastatur, mit dem Controller bedienbar.
- Grafik: höhere Auflösung (Pixelratio bis 3), 4096er Schattenkarte, Umgebungslicht (IBL).
- Alle Lernbereiche haben Stufen 1–6 (in der Weltkarte einstellbar, passen sich nach jeder Runde an): leichtere Stufen zeigen weniger Antwortmöglichkeiten bzw. kleinere Sudokus mit mehr Hinweisen; höhere Stufen geben mehr Münzen.
- Die Bereiche liegen auf unterschiedlicher Höhe (Sudoku-Hügel und Rätsel-Berg sind erklimmbar).
- „Welcome!“ wird mit englischer Stimme gesprochen; Heldenfigur mit weicheren Formen.

- Marktplatz: Hund Bello mit Rechen-Rennen (20 s, gemischte Aufgaben bis 20, gemeinsame Bestenliste auf dem Gerät).

## Urheberrecht und Lizenzen
© 2026 Hennen Studio. Alle Rechte vorbehalten, siehe [LICENSE](./LICENSE). Der Quelltext ist einsehbar, darf aber ohne Erlaubnis nicht kopiert, verändert oder weiterverbreitet werden.

Verwendete Open-Source-Bausteine: [Three.js](https://threejs.org) (MIT), Sprachsynthese [Piper](https://github.com/rhasspy/piper) (MIT) mit der Stimme „Thorsten" (de_DE-thorsten-medium, rhasspy/piper-voices). Lizenzen der Stimme bitte auf der Modellseite prüfen.
