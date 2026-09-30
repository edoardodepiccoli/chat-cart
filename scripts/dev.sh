#!/usr/bin/env bash
set -euo pipefail

echo "Tunnel:"
select tunnel in "cloudflare (embedded admin works, widget replies arrive all at once)" "ngrok (widget replies stream, embedded admin won't load)"; do
  [[ -n "$tunnel" ]] && break
done
choice="$REPLY"

read -rp "Reset conversations first? [y/N] " reset
if [[ "$reset" == [yY] ]]; then
  npm run reset
fi

npm run widget:dev &
widget_pid=$!
trap 'kill "$widget_pid" 2>/dev/null || true' EXIT

if [[ "$choice" == 1 ]]; then
  shopify app dev
else
  ./scripts/dev-ngrok.sh
fi
