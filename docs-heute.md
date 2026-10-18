# Was wurde heute gemacht? (Sitzungsprotokoll, 18.10.2026)

Kurz und ohne Fachchinesisch. Wer's genauer wissen will, findet die Dateinamen in Klammern.

## 1. Spielfigur: Tier statt Menschenkind
- Die Hauptfigur ist jetzt das Tier, das man im ersten Menü wählt: Fuchs, Bär, Hase, Frosch, Eule oder Pinguin.
- Jedes Tier hat eigene Ohren, Augen, Schnauze bzw. Schnabel und Schwanz. Das Fell ersetzt die Hautfarbe, die Hände passen dazu. (`src/game/characters.ts`)
- Wechselt man das Tier im Profil, wird die Figur im Spiel sofort neu gebaut (`setAvatar` in `src/game/world.ts`).
- Mützen sind standardmäßig weg und kommen nur aus dem Shop.
- Die Schuhe sind neu: abgerundet, rot, mit schmaler heller Sohle statt der eckigen Klötze.
- Zuvor wurden mehrere Frisuren ausprobiert und wieder verworfen. Der Haar-Code ist entfernt.

## 2. Das Hündchen
- Der kleine Hund läuft nur, wenn die Figur läuft, und steht still, wenn sie steht.
- Er schaut immer in Laufrichtung (kein Rückwärtslaufen mehr). Beine und Schwanz bewegen sich nur beim Laufen, im Stand wedelt er leicht.

## 3. Name und Umbenennungen
- Spiel heißt jetzt **Lernplanet Koro**. Die Figuren heißen **Koros**.
- Angepasst in Texten, Titel, README, Paketname und Download-Dateiname.
- Die Sprachausgabe wurde komplett neu erzeugt.
- Bewusst unverändert: alte Speicher-Schlüssel, damit bestehende Spielstände nicht verloren gehen.

## 4. GitHub
- Lokales Git-Repo angelegt, `.gitignore` erstellt, erster Commit.
- Verbunden mit `https://github.com/diehenne/Lernplanet_Koro` und gepusht.
- Der Server hatte schon einen "Initial commit" mit README. Beide Stände wurden zusammengeführt (Merge).
- **GitHub Pages:** `vite.config.ts` hat `base: './'`, und `.github/workflows/pages.yml` testet, baut und veröffentlicht bei jedem Push. Das ist nicht aktiviert: Im Repo Settings → Pages → Source "GitHub Actions" wählen. Bei privaten Repos braucht Pages einen bezahlten Plan.

## 5. Spiel automatisch auf dem Mac starten
- `tools/autostart-mac.sh` baut das Spiel und legt einen macOS-Dienst an (LaunchAgent `de.lernplanet.koro`). Er startet beim Login, startet bei Absturz neu und liefert das Spiel aus.
- Adresse ist dieselbe wie früher: `https://<Mac-IP>:5179` (wichtig, weil Spielstände an der Adresse hängen).
- Doppelklick im Finder:
  - `Autostart einrichten.command` richtet alles ein, zeigt den Link und öffnet den Browser.
  - `Autostart entfernen.command` schaltet den Dienst wieder aus.
- Fehler "Bootstrap failed: 5" wurde behoben (Dienst wird erst entladen, kurz gewartet, dann neu geladen).
- Log: `/tmp/lernplanet-koro.log`. Der Mac muss wach und angemeldet sein.

## 6. Controller-Menü
- Die Navigation mit Stick/Steuerkreuz folgt jetzt strikt der Richtung: links geht nach links, runter nach unten.
- Erst wird ein Button in derselben Zeile bzw. Spalte gesucht, sonst der nächste in dieser Richtung. Es springt nichts mehr in die Gegenrichtung. (`createGamepadNav` in `src/game/input.ts`)

## Wie funktioniert das Ganze eigentlich?
- **Technik:** Eine Webseite mit TypeScript, 3D mit Three.js, gebaut mit Vite. Es gibt keinen eigenen Server mit Spiellogik. Der Mac liefert nur die fertigen Dateien aus (`dist/`).
- **Ordner:** `src/core` Rechenaufgaben, Level, Shop, Speicherung. `src/game` 3D-Welt, Figuren, Eingabe. `src/ui` Menüs, Ton, Sprache. `src/i18n/de.ts` alle Texte. `public/audio` die Sprachausgabe als MP3.
- **Spielstände:** Liegen im Browser des jeweiligen Geräts (localStorage), nicht auf dem Mac.
- **Prüfung:** `npm test` (31 Tests) und `npx tsc --noEmit` (Typprüfung).
- **Änderung veröffentlichen:** `git add -A && git commit -m "..." && git push`. Danach auf dem Mac `tools/autostart-mac.sh` erneut ausführen.

## Noch nicht getestet / offen
- Echter PS5-Controller im Menü nach der neuen Navigation, Touch auf Tablets, Musik und Geräusche, Leistung auf schwachen Geräten.
- Gemeinsame Bestenliste über mehrere Geräte.
- Vor einer öffentlichen Veröffentlichung: Figuren weiter von Nintendo-Vorlagen entfernen.
