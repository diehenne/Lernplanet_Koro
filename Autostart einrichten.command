#!/bin/bash
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
tools/autostart-mac.sh
echo
read -n 1 -s -r -p "Fertig. Beliebige Taste zum Schließen..."
