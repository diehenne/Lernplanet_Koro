#!/bin/bash
cd "$(dirname "$0")"
tools/autostart-mac.sh remove
echo
read -n 1 -s -r -p "Fertig. Beliebige Taste zum Schließen..."
