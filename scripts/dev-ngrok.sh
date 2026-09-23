#!/usr/bin/env bash
set -euo pipefail

readonly APP_PORT=3050
readonly NGROK_API="http://127.0.0.1:4040/api/tunnels"
readonly NGROK_LOG="$(mktemp -t chat-cart-ngrok)"

ngrok_pid=""

cleanup() {
  if [[ -n "$ngrok_pid" ]] && kill -0 "$ngrok_pid" 2>/dev/null; then
    kill "$ngrok_pid"
  fi
}
trap cleanup EXIT

read_tunnel_url() {
  local response
  if ! response="$(curl --silent --max-time 2 "$NGROK_API")"; then
    return 0
  fi

  printf '%s' "$response" | python3 -c '
import json, sys

try:
    tunnels = json.load(sys.stdin)["tunnels"]
except (ValueError, KeyError):
    sys.exit(0)

for tunnel in tunnels:
    if tunnel.get("public_url", "").startswith("https://"):
        print(tunnel["public_url"])
        break
'
}

echo "Starting ngrok on port ${APP_PORT}..."
ngrok http "$APP_PORT" --log stdout > "$NGROK_LOG" 2>&1 &
ngrok_pid=$!

tunnel_url=""
for _ in $(seq 1 30); do
  tunnel_url="$(read_tunnel_url)"
  [[ -n "$tunnel_url" ]] && break

  if ! kill -0 "$ngrok_pid" 2>/dev/null; then
    echo "ngrok exited before opening a tunnel:" >&2
    cat "$NGROK_LOG" >&2
    exit 1
  fi

  sleep 1
done

if [[ -z "$tunnel_url" ]]; then
  echo "ngrok did not report a tunnel within 30 seconds:" >&2
  cat "$NGROK_LOG" >&2
  exit 1
fi

echo "Tunnel: $tunnel_url"
shopify app dev --tunnel-url="${tunnel_url}:${APP_PORT}"
