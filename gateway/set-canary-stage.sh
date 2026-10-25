#!/usr/bin/env bash
# ==============================================================================
# SWIFT Strangler Gateway - Canary Upstream Weight Shifter
# SIAA-98: Dark Traffic Shadowing & Canary Traffic Ramping
# ==============================================================================

set -euo pipefail

STAGE="${1:-100}"

case "$STAGE" in
  10|25|50|80|100)
    ;;
  *)
    echo "Usage: $0 [10|25|50|80|100]"
    exit 1
    ;;
esac

SPRING_WEIGHT="$STAGE"
NEXTJS_WEIGHT=$((100 - STAGE))

echo "=========================================================================="
echo "SWIFT Strangler Gateway: Shifting Canary Stage to STAGE_${STAGE}"
echo "Spring Boot Target Weight: ${SPRING_WEIGHT}%"
echo "Next.js Target Weight:    ${NEXTJS_WEIGHT}%"
echo "=========================================================================="

CONF_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/nginx-strangler-gateway.conf"

sed -i -E "s/X-Swift-Canary-Stage \"STAGE_[0-9]+\"/X-Swift-Canary-Stage \"STAGE_${STAGE}\"/g" "$CONF_PATH"

echo "Configuration updated successfully."
echo "Reloading NGINX gateway..."
if command -v docker >/dev/null 2>&1; then
  docker compose exec -T gateway nginx -s reload || true
fi
echo "Canary shift to ${STAGE}% complete."
