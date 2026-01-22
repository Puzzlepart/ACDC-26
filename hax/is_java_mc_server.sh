host="$1"
[ -z "$host" ] && echo "Usage: $0 <host-or-ip>" && exit 1
printf 'FE01' | xxd -r -p | nc -w 3 "$host" 25565 | xxd -p -c 999 | grep -qi 'a7' && echo "Likely Minecraft Java server on port 25565" || echo "No Minecraft Java server detected on port 25565"
