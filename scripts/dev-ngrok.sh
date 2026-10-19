#!/usr/bin/env bash
set -euo pipefail

readonly APP_PORT=3050

ngrok http "$APP_PORT" --log stdout > /dev/null &
ngrok_pid=$!
trap 'kill $ngrok_pid 2>/dev/null || true' EXIT

tunnel_url=""
for _ in $(seq 1 30); do
  tunnel_url="$(curl --silent --max-time 2 http://127.0.0.1:4040/api/tunnels |
    node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).tunnels.find((t) => t.public_url.startsWith("https://")).public_url' 2>/dev/null || true)"
  [[ -n "$tunnel_url" ]] && break
  sleep 1
done

if [[ -z "$tunnel_url" ]]; then
  echo "ngrok did not open a tunnel within 30 seconds" >&2
  exit 1
fi

echo "Tunnel: $tunnel_url"
shopify app dev --tunnel-url="${tunnel_url}:${APP_PORT}"
