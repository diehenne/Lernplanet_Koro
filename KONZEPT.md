# Lernplanet Koro – Konzept

Browserbasiertes 3D-Lernspiel (7–10 Jahre) für +, −, ×, ÷. Stil: warme Lernwelt
(à la Edurino), Cel-Shading/Aquarellfarben (inspiriert von BotW). Figuren sind
**eigene** Waldgeister, keine geschützten Zelda-Charaktere.

## Unverrückbare Spielregeln
1. Keine Strafen, keine Bloßstellung. Fehler → Erklärung + ähnliche Aufgabe.
2. Kein Zeitdruck (nur optional später).
3. Keine Accounts, kein Tracking, nur localStorage.
4. Jede Aufgabe: erst bildlich, dann halb-abstrakt, dann Zahl (CPA).
5. Sprachausgabe + große Schrift, Touch-Ziele ≥ 48 px.

## Technik
Vite + TypeScript + Three.js (Toon-Shader), Vitest. Kein Backend.

## Ordnerstruktur
```
src/
  core/            reine Logik, ohne DOM/3D, voll testbar
    types.ts       Aufgaben-/Fortschrittsmodell
    generator.ts   Aufgabengenerator je Operation & Level
    adaptive.ts    Adaptivität (Level-Anpassung, Gewichtung schwacher Typen)
    hints.ts       Schrittweise Lösungswege (Text)
    storage.ts     Profile + Fortschritt (localStorage)
  game/
    world.ts       3D-Szene Plus-Wald, Toon-Look, Figuren, Steuerung
    input.ts       Tastatur + Touch-Joystick
    characters.ts  Prozedurale low-poly Figuren
    minigames/
      fruitBaskets.ts   Früchte in Körbe (Plus, konkret)
      bridge.ts         Brücke aus Zahlenblöcken (Plus, halb-abstrakt)
  ui/
    screens.ts     Start, Profilwahl, Overlay, Feedback
    speech.ts      Web Speech API
  i18n/de.ts       Alle Texte
  main.ts
```

## Datenmodell
- `Task { op, a, b, answer, level, kind }` – `kind` = Aufgabentyp (z. B. `add-tenbridge`).
- `Profile { id, name, avatar, levels: Record<Op, number>, stats: Record<kind, {right, wrong, avgMs}>, stars }`.

## Adaptivität
Pro Operation Level 1–4. Nach je 5 Aufgaben: ≥ 90 % richtig → Level +1,
≤ 50 % → Level −1. Aufgabentyp-Auswahl gewichtet nach Fehlerquote (Wiederholung schwacher Typen).

## Level
- Plus: 1 bis 10 · 2 bis 20 · 3 bis 100 ohne Übergang · 4 bis 100 mit Zehnerübergang
- Minus: analog · Mal: 1 = 2/5/10 · 2 = 3/4 · 3 = alle · 4 = bis 10×10 gemischt
- Geteilt: Umkehr der Malreihen (ohne Rest); Level 4 mit Rest

## Regionen (Roadmap)
Plus-Wald (Slice, jetzt) → Minus-Berge → Mal-Wüste → Teil-Sümpfe → Finale-Dungeon.

## Minispiele Plus-Wald (Slice)
1. **Früchte-Körbe:** zwei Körbe mit Früchten, Kind tippt Gesamtsumme.
2. **Brückenbau:** Lücke der Länge N, Kind wählt Blöcke, die zusammen N ergeben (a + ? = N).

## Roadmap
Elternbereich, Sounds/Musik, Sammelkarten, weitere Regionen, Dyskalkulie-Modus.
