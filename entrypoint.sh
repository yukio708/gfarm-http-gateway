#!/bin/bash
set -eu

# # Optional: Download HPCI CA certificate if not mounted or present
# CERT_FILE=/etc/pki/tls/certs/gfarm/21d9c8b3.0
# if [ ! -f "$CERT_FILE" ]; then
#   echo "[INFO] Downloading HPCI TLS certificate..."
#   mkdir -p /etc/pki/tls/certs/gfarm
#   cd /etc/pki/tls/certs/gfarm
#   wget https://www.hpci-office.jp/info/download/attachments/425328655/21d9c8b3.0 || {
#     echo "[WARN] Failed to download HPCI TLS cert. Continuing anyway..."
#   }
# fi


if [ -f /config/gfarm2.conf ]; then
  ln -sf /config/gfarm2.conf /etc/gfarm2.conf
else
  echo "[WARN] /config/gfarm2.conf not found"
fi

if [ -d /config/certs ]; then
  mkdir -p /etc/pki/tls/certs/gfarm
  cp /config/certs/* /etc/pki/tls/certs/gfarm/
else
  echo "[WARN] /config/certs not found"
fi

# Launch gfarm-http-gateway
exec /app/gfarm-http-gateway/bin/gfarm-http.sh --proxy-headers "$@"
