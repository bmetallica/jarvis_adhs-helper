#!/usr/bin/env bash
# Installiert den ADHS-Helper als systemd-Dienst auf Debian/Ubuntu.
# Idempotent: kann zum Aktualisieren erneut ausgeführt werden.
#
# Voraussetzungen: Node.js >= 20, npm. Mit root/sudo ausführen.
#   sudo ./deploy/install.sh
set -euo pipefail

APP_DIR="/opt/adhs-helper"
SERVICE_USER="adhs"
UNIT_SRC="$APP_DIR/deploy/adhs-helper.service"
UNIT_DST="/etc/systemd/system/adhs-helper.service"
ENV_EXAMPLE="$APP_DIR/deploy/adhs-helper.env.example"
ENV_DST="/etc/adhs-helper.env"

if [[ $EUID -ne 0 ]]; then
  echo "Bitte mit sudo/root ausführen." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nicht gefunden. Bitte Node >= 20 installieren." >&2
  exit 1
fi
echo "==> Node: $(node -v)"

# 1) Dienstnutzer anlegen (System-Account, ohne Login-Shell).
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "==> Lege Dienstnutzer '$SERVICE_USER' an"
  useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
else
  echo "==> Dienstnutzer '$SERVICE_USER' existiert bereits"
fi

# 2) Abhängigkeiten installieren + bauen (als Root im App-Verzeichnis).
echo "==> Installiere Abhängigkeiten (npm ci)"
cd "$APP_DIR"
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
echo "==> Baue Produktions-Bundle (npm run build)"
npm run build

# 3) Eigentümer setzen, damit der Dienstnutzer dist/ lesen kann.
echo "==> Setze Eigentümer auf $SERVICE_USER"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR/dist"

# 4) Env-Datei anlegen (falls noch nicht vorhanden — bestehende NICHT überschreiben).
if [[ ! -f "$ENV_DST" ]]; then
  echo "==> Lege $ENV_DST aus Beispiel an"
  cp "$ENV_EXAMPLE" "$ENV_DST"
  chmod 640 "$ENV_DST"
else
  echo "==> $ENV_DST existiert bereits (bleibt unverändert)"
fi

# 5) systemd-Unit installieren + aktivieren.
echo "==> Installiere systemd-Unit"
cp "$UNIT_SRC" "$UNIT_DST"
systemctl daemon-reload
systemctl enable adhs-helper
systemctl restart adhs-helper

echo
echo "Fertig. Status:  sudo systemctl status adhs-helper"
echo "Logs:           journalctl -u adhs-helper -f"
PORT_LINE="$(grep -E '^PORT=' "$ENV_DST" 2>/dev/null || echo 'PORT=8090')"
echo "Erreichbar auf Port aus $ENV_DST ($PORT_LINE)."
