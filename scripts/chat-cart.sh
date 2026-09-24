#!/usr/bin/env bash
set -euo pipefail

npm run reset

npm run widget:dev &
widget_pid=$!
trap 'kill "$widget_pid" 2>/dev/null || true' EXIT

npm run dev:ngrok
