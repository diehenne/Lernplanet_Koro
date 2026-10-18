#!/bin/bash
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
tools/autostart-mac.sh
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
echo
echo "Link (Cmd + Klick zum Öffnen):"
echo "  https://${IP:-localhost}:5179"
open "https://localhost:5179"
echo
read -n 1 -s -r -p "Fertig. Beliebige Taste zum Schließen..."
