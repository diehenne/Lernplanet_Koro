# Aufbau von Lernplanet Koro

Dieses Dokument erklärt, wie das Spiel gebaut ist: welche Teile es gibt, wer mit wem spricht und wo man bei Änderungen anfassen muss.

## 1. Das große Bild

Es ist eine reine Webseite. Es gibt keinen Spiel-Server und keine Datenbank.

```
 Browser (Tablet / Handy / Mac)
 ┌──────────────────────────────────────────────────────────┐
 │  index.html ──► src/main.ts   "Schaltzentrale"           │
 │                    │                                      │
 │      ┌─────────────┼───────────────┬──────────────┐       │
 │      ▼             ▼               ▼              ▼       │
 │   src/core/     src/game/       src/ui/       src/i18n/   │
 │   Regeln,       3D-Welt,        Menüs, Ton,   alle        │
 │   Aufgaben,     Figuren,        Sprache,      deutschen   │
 │   Speicher      Eingabe         Musik         Texte       │
 │   (kein DOM,    (Three.js)                                │
 │   kein 3D)                                                │
 │                                                           │
 │  Spielstand: localStorage im jeweiligen Browser           │
 └──────────────────────────────────────────────────────────┘
            ▲ liefert nur fertige Dateien aus
 Mac: Vite-Server (Autostart, https://<Mac-IP>:5179)
```

- **Technik:** TypeScript, 3D mit Three.js, Bündeln und Server mit Vite, Tests mit Vitest.
- **Server:** Der Mac liefert nur Dateien aus. Alles Rechnen, Zeichnen und Speichern passiert im Browser des Kindes.
- **Spielstände** liegen deshalb pro Gerät und pro Adresse. Wechselt man die Adresse, sind die Profile weg.

## 2. Die vier Schichten

Die Abhängigkeiten gehen nur in eine Richtung: `main.ts` → `ui` / `game` → `core`. `core` kennt nichts von den anderen.

### `src/core/` – das Gehirn (ohne Bildschirm)
Reine Logik. Dadurch ist sie gut mit Tests prüfbar.

| Datei | Aufgabe |
|---|---|
| `types.ts` | Alle Grunddatentypen: `Task` (eine Aufgabe), `Profile` (ein Kind mit Stufen, Sternen, Münzen, Inventar, Gebautem …), Konstanten wie `MAX_LEVEL`, `MAX_STARS` |
| `generator.ts` | Erzeugt Rechenaufgaben je Rechenart und Stufe (alle Ergebnisse ≤ 100) und falsche Antwortmöglichkeiten |
| `adaptive.ts` | Wählt die nächste Aufgabe, wertet Antworten aus und steigert oder senkt die Stufe je nach Erfolg. Enthält `newProfile` und `normalizeProfile` (ergänzt alte Spielstände) |
| `hints.ts` | Schrittweise Lösungswege in Worten, wenn ein Kind nicht weiterkommt |
| `lessons.ts`, `riddles.ts`, `sudoku.ts` | Aufgaben für Deutsch, Wissen, Englisch, Rätsel und Sudoku |
| `shop.ts`, `money.ts`, `loot.ts` | Preise, Belohnungen, Münzen (1, 2, 5, 10, 20 Rubine), Truhen-Inhalt |
| `layout.ts` | Karte der Welt: vier Regionen als Quadranten, Marktplatz in der Mitte, Positionen aller Stationen |
| `dash.ts` | Regeln für das 20-Sekunden-Rechenrennen mit dem Hund |
| `storage.ts` | Lesen und Schreiben der Profile im Browser (Schlüssel `zahlenland.profiles.v1`) |

### `src/game/` – die 3D-Welt
| Datei | Aufgabe |
|---|---|
| `world.ts` | Das größte Stück: Klasse `World`. Baut die Landschaft, steuert Kamera, Bewegung, Kollisionen, Tag und Nacht, Werkzeuge, Platzieren von Bauteilen, Hündchen und die Spielschleife `frame()`. Meldet Ereignisse nach außen (z. B. "Spieler steht an Station X") |
| `characters.ts` | Alle Figuren als Three.js-Modelle: Held (`createHero`, je Tier eigener Kopf über `buildAnimalHead`), Hündchen, Koros, Bello, Kleidung (`applyOutfit`) |
| `interior.ts` | Innenräume der Häuser |
| `textures.ts` | Erzeugte Oberflächen (Holz, Gras, …) ohne Bilddateien |
| `input.ts` | Tastatur, Touch-Joystick, PS5-Controller. `createGamepadNav` steuert auch die Menü-Auswahl mit dem Controller nach Richtung |
| `minigames/round.ts` | Eine Aufgabenrunde (5 Aufgaben): zeigt Aufgabe, Hilfen, Auswertung und Belohnung |

### `src/ui/` – alles, was man liest, hört und anklickt
Menüs sind normale HTML-Elemente, die über das 3D-Bild gelegt werden (`#screen`, `#overlay`).

- `trade.ts`, `inventory.ts`, `riddle.ts`, `english.ts`, `sudoku.ts`, `dash.ts`: die einzelnen Fenster.
- `speech.ts`, `speechText.ts`, `speechCorpus.ts`: Sprachausgabe. Sätze werden in vorab erzeugte MP3-Bausteine zerlegt (Zahlen, Rechenzeichen, feste Textstücke). Die Audiodateien liegen in `public/audio` und werden mit `tools/gen_audio.py` erzeugt.
- `music.ts`, `sfx.ts`: Musik und Geräusche, live im Browser synthetisch erzeugt (Web Audio). Es werden keine Dateien geladen.

### `src/i18n/de.ts`
Alle sichtbaren und gesprochenen Texte an einer Stelle, dazu die Tierliste für die Figurenwahl.

### `src/main.ts` – die Schaltzentrale
Verbindet alles:
- Startmenü, Profile, neues Kind anlegen, Tier wählen
- HUD (Sterne, Münzen, Minimap)
- Weltkarte und Reisen zwischen den Regionen
- Befehle vom Spieler (`command`): springen, Aktion, Rucksack …
- Sterne-Timer: Sterne sind Lebensenergie und gehen verloren, wenn das Kind nur herumsteht
- Abschluss einer Runde (`finishRound`): Sterne und Münzen buchen und speichern

## 3. Der Spielablauf

```
Start ► Profil wählen ► Hub (Marktplatz) ► in eine Region laufen
   ► an einer Station "Aktion" drücken
   ► main.ts öffnet eine Runde (minigames/round.ts)
        ├─ core/adaptive.ts liefert die nächste Aufgabe (Stufe des Kindes)
        ├─ Kind antwortet, bei Fehler gibt core/hints.ts eine Hilfe
        └─ Ende: Sterne + Münzen werden gebucht, Stufe angepasst, Profil gespeichert
   ► Münzen im Markt ausgeben (shop.ts / trade.ts) ► Dinge bauen, anziehen, Truhen öffnen
```

Die Schwierigkeit hängt an zwei Stellen:
1. **Stufe** (1 bis 6) je Rechenart im Profil. Sie bestimmt, welche Aufgabentypen in `generator.ts` vorkommen.
2. **Verlauf** der letzten Antworten (`recent` im Profil). `adaptive.ts` steigert oder senkt danach die Stufe.

## 4. Die Spielschleife (3D)

`World.frame()` läuft rund 60-mal pro Sekunde:
1. Eingabe lesen (Tastatur, Joystick oder Controller)
2. Held bewegen, Kollisionen prüfen
3. Hündchen nachziehen (läuft nur, wenn der Held läuft)
4. Kamera nachführen, Tag und Nacht und Animationen aktualisieren
5. Prüfen, was in Reichweite ist (Station, Koro, Truhe) und `main.ts` per Rückruf informieren
6. Bild zeichnen

Die Welt weiß nichts von Rechenaufgaben. Sie sagt nur "Spieler steht an Station X". Was dann passiert, entscheidet `main.ts`.

## 5. Spielstand und Daten

- Ein **Profil** ist ein einziges Objekt (`Profile` in `types.ts`) mit allem, was ein Kind erreicht hat. Es wird als JSON im Browser gespeichert.
- `normalizeProfile` ergänzt bei älteren Ständen neue Felder. Neue Spielstand-Felder gehören immer zuerst dorthin.
- Der Spielstand lässt sich als Datei herunterladen und wieder laden (`koro-spielstaende.json`).
- Die Bestenliste des Rechen-Rennens liegt lokal im Browser (Top 10 pro Gerät).

## 6. Tests und Werkzeuge

- `npm test` prüft Aufgabenerzeugung, Stufenlogik, Münzen, Karten-Layout und, ob für jeden gesprochenen Satz eine Audiodatei existiert.
- `npx tsc --noEmit` ist die Typprüfung. `npm run build` führt Typprüfung und Bauen zusammen aus.
- `tools/dump-corpus.ts` sammelt alle gesprochenen Texte, `tools/gen_audio.py` erzeugt daraus die MP3s. Das ist nötig, wenn Texte in `de.ts` oder `riddles.ts` geändert werden.
- `tools/autostart-mac.sh` richtet den Dauerbetrieb auf dem Mac ein.
- `.github/workflows/pages.yml` veröffentlicht optional auf GitHub Pages.

## 7. Wo ändere ich was?

| Ich will … | Dann in … |
|---|---|
| Aufgaben leichter oder schwerer machen | `core/generator.ts` (Tabelle `KINDS`) und `core/adaptive.ts` |
| Belohnungen oder Preise ändern | `core/shop.ts`, `core/money.ts` |
| Einen Text oder eine Ansage ändern | `i18n/de.ts`, danach Audio neu erzeugen |
| Eine Spielfigur ändern | `game/characters.ts` |
| Die Welt, Wege oder Stationen ändern | `core/layout.ts` (Positionen), `game/world.ts` (Aussehen) |
| Neue Controller-Taste | `game/input.ts` |
| Neues Fenster oder Menü | neue Datei in `ui/`, Aufruf aus `main.ts` |
| Neues Feld im Spielstand | `core/types.ts`, `newProfile` und `normalizeProfile` in `core/adaptive.ts` |

## 8. Bekannte Schwächen

- `world.ts` (rund 1500 Zeilen) und `main.ts` (rund 700 Zeilen) sind groß. Beim Weiterbauen sollten sie in kleinere Dateien aufgeteilt werden, z. B. Terrain, Bewegung und Hündchen getrennt.
- Alles hängt am Browser-Speicher. Es gibt keine geräteübergreifenden Spielstände und keine gemeinsame Bestenliste.
- Noch ungetestet: echter PS5-Controller mit der neuen Menünavigation, Touch auf Tablets und die Leistung auf schwachen Geräten.
