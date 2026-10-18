#!/bin/bash
# Richtet auf dem Mac einen Autostart ein: Das Spiel läuft nach jedem Login/Neustart
# automatisch im WLAN unter http://<Mac-IP>:4173
# Deinstallieren: tools/autostart-mac.sh remove
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="de.lernplanet.koro"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE_DIR="$(dirname "$(command -v node)")"

if [ "$1" = "remove" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Autostart entfernt."
  exit 0
fi

cd "$DIR"
npm install
npm run build

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_DIR/node</string>
    <string>$DIR/node_modules/vite/bin/vite.js</string>
    <string>preview</string>
    <string>--host</string>
    <string>--port</string>
    <string>4173</string>
    <string>--strictPort</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/lernplanet-koro.log</string>
  <key>StandardErrorPath</key><string>/tmp/lernplanet-koro.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 2
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '<Mac-IP>')"
echo "Läuft! Auf Tablet/Handy im WLAN öffnen: http://$IP:4173"
