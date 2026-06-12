#!/usr/bin/env bash
#
# Generate the local RS256 keypair used by the service-JWT signer.
#
# - private.pem  signs JWTs (Express → DIMS); stored at the path env declares.
# - public.pem   is served via /.well-known/jwks.json (DIMS verifies with it).
#
# Production never uses these files — the keypair lives in a secrets manager
# (Azure Key Vault / AWS Secrets Manager / K8s sealed secret) and is mounted
# at the env-declared path. This script is for local dev only.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/keys"

mkdir -p "$KEYS_DIR"

PRIV="$KEYS_DIR/private.pem"
PUB="$KEYS_DIR/public.pem"

if [[ -f "$PRIV" || -f "$PUB" ]]; then
  echo "Refusing to overwrite existing keys at $KEYS_DIR"
  echo "Move or rename them first if you want a fresh pair."
  exit 1
fi

openssl genrsa -out "$PRIV" 2048
openssl rsa -in "$PRIV" -pubout -out "$PUB"
chmod 600 "$PRIV"
chmod 644 "$PUB"

echo "Generated:"
echo "  $PRIV (mode 600)"
echo "  $PUB  (mode 644)"
echo
echo "These files are gitignored. Do not commit them."
