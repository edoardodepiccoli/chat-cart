#!/usr/bin/env bash
set -euo pipefail

readonly APP_PORT=3050
readonly NGROK_LOG="$(mktemp -t chat-cart-ngrok)"

widget_pid=""
ngrok_pid=""
trap 'kill $widget_pid $ngrok_pid 2>/dev/null || true' EXIT

npm run reset
npm run seed

npm run widget:dev &
widget_pid=$!

echo "Starting ngrok on port ${APP_PORT}..."
ngrok http "$APP_PORT" --log stdout > "$NGROK_LOG" 2>&1 &
ngrok_pid=$!

tunnel_url=""
for _ in $(seq 1 30); do
  tunnel_url="$(curl --silent --max-time 2 http://127.0.0.1:4040/api/tunnels |
    node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).tunnels.find((t) => t.public_url.startsWith("https://")).public_url' 2>/dev/null || true)"
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
