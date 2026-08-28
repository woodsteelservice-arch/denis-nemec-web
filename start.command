#!/bin/bash
cd "$(dirname "$0")"

PORT=5180   # 5173 obsadzuje Ensola web
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

echo ""
echo "  Web beží — nechaj toto okno otvorené."
echo ""
echo "  Na tomto počítači:  http://localhost:$PORT"
if [ -n "$IP" ]; then
  echo "  Na mobile/tablete:  http://$IP:$PORT"
  echo "  (telefón musí byť na rovnakej Wi-Fi)"
fi
echo ""
echo "  Zastavenie: Ctrl + C"
echo ""

open "http://localhost:$PORT"
python3 -m http.server $PORT
