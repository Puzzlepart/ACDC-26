addr="$1"
port="${2:-19132}"
if [ -z "$addr" ]; then
  echo "Usage: $0 host [port]" >&2
  return 1 2>/dev/null || exit 1
fi
payload='\x0f\x00\x04\x09Minecraft\x00\x00\x00\x00\x00'
printf "$payload" | nc -w 3 "$addr" "$port" >/dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Host $addr port $port accepts TCP; checking Minecraft status..."
else
  echo "Cannot connect to $addr on port $port (TCP failed)."
  return 1 2>/dev/null || exit 1
fi
resp=$(printf '\x0f\x00\x04\x09Minecraft\x00\x00\x00\x00\x00' | nc -w 3 "$addr" "$port" 2>/dev/null | head -c 512)
if echo "$resp" | grep -qi "minecraft"; then
  echo "Likely a Minecraft server (response contains 'minecraft')."
else
  echo "Did not detect typical Minecraft handshake response."
fi
