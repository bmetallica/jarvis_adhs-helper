#!/usr/bin/env bash
# Erzeugt ein selbstsigniertes Zertifikat für den ADHS-Helper (Phase 1: IP + self-signed).
# Das Zertifikat enthält die angegebene IP/Domain als SubjectAltName (SAN) — sonst akzeptieren
# moderne Browser es nicht. Für einen echten, vertrauenswürdigen Kontext (PWA-Install/Web-Push)
# später per Reverse-Proxy ein gültiges Zertifikat vorschalten (siehe DEPLOY.md / KONZEPT.md §10).
#
# Nutzung:
#   ./deploy/gen-cert.sh 192.168.1.50
#   ./deploy/gen-cert.sh adhs.familie.haus
set -euo pipefail

HOST="${1:-}"
if [[ -z "$HOST" ]]; then
  echo "Bitte IP oder Domain angeben, z. B.:  $0 192.168.1.50" >&2
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$DIR"
CRT="$DIR/adhs-helper.crt"
KEY="$DIR/adhs-helper.key"

# IP vs. DNS automatisch erkennen für den SAN-Eintrag.
if [[ "$HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  SAN="IP:$HOST"
else
  SAN="DNS:$HOST"
fi

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$KEY" -out "$CRT" \
  -days 825 \
  -subj "/CN=$HOST" \
  -addext "subjectAltName=$SAN"

chmod 600 "$KEY"
echo
echo "Zertifikat erstellt:"
echo "  TLS_CERT=$CRT"
echo "  TLS_KEY=$KEY"
echo
echo "→ Diese Pfade in /etc/adhs-helper.env eintragen und 'sudo systemctl restart adhs-helper'."
echo "→ Auf jedem Gerät das Zertifikat einmal akzeptieren bzw. die CA importieren (DEPLOY.md)."
