# Betrieb als Debian-Dienst (systemd)

Diese Anleitung richtet den **ADHS-Helper** als dauerhaft laufenden Dienst auf Debian/Ubuntu ein.

## Was läuft hier eigentlich?

Der ADHS-Helper ist eine **PWA (statisches Frontend)**. Der Dienst startet einen schlanken,
**abhängigkeitsfreien Node-Server** (`server/serve.js`), der den gebauten Ordner `dist/` ausliefert
(SPA-Fallback, korrekte MIME-Typen, optional HTTPS).

Die KI-/Sprach-/RAG-/Benachrichtigungs-Funktionen liefert das **JARVIS-Gateway** (Port `8088`).
Es gibt zwei Betriebsarten:

**A) Zentraler Proxy (empfohlen).** Der ADHS-Server hält die JARVIS-Zugangsdaten (in
`/etc/adhs-helper.env`) und **leitet `/api/*` an JARVIS weiter** (Key serverseitig injiziert). Vorteile:
zentrale Konfiguration (einmal hier statt in jedem Client), Key bleibt geheim, **kein CORS-/
Zertifikatsproblem im Browser** (same-origin). Familien-**Accounts kommen zentral aus JARVIS** und
erscheinen auf jedem Gerät gleich.

```
 Browser/Handy ──HTTP(S)──► [adhs-helper.service :8096] ──Proxy /api/*──► [JARVIS :8088]
                              (Frontend + zentraler Proxy, Key serverseitig)
```

**B) Direktverbindung (ohne Proxy).** `JARVIS_UPSTREAM` leer lassen; dann gibt jeder Client Host +
Plugin-Key im App-Admin selbst ein und spricht JARVIS direkt an (CORS am Gateway nötig).

> Der ADHS-Helper-Dienst hat **keine** Abhängigkeit zu JARVIS beim Start — die App ist offline-first
> und läuft auch ohne erreichbares JARVIS (KI/Accounts sind dann inaktiv, lokal bleibt alles nutzbar).

## Schnellinstallation (empfohlen)

Voraussetzung: **Node.js ≥ 20** und npm sind installiert; das Repo liegt unter `/opt/adhs-helper`.

```bash
cd /opt/adhs-helper
sudo ./deploy/install.sh
```

Das Skript ist **idempotent** (erneut ausführbar zum Aktualisieren) und erledigt:

1. Dienstnutzer `adhs` anlegen (System-Account, ohne Login-Shell).
2. `npm ci` (bzw. `npm install`) + `npm run build`.
3. Eigentümer von `dist/` auf `adhs` setzen.
4. `/etc/adhs-helper.env` aus der Beispieldatei anlegen (bestehende bleibt unverändert).
5. systemd-Unit installieren, aktivieren und starten.

Danach:

```bash
sudo systemctl status adhs-helper      # Status
journalctl -u adhs-helper -f           # Live-Logs
```

Die App ist nun im LAN unter `http://<server-ip>:8090` erreichbar.

## Konfiguration

Alle Einstellungen liegen in **`/etc/adhs-helper.env`** (Vorlage: `deploy/adhs-helper.env.example`):

| Variable   | Bedeutung                                   | Default              |
|------------|---------------------------------------------|----------------------|
| `HOST`     | Bind-Adresse (`0.0.0.0` = LAN, `127.0.0.1`) | `0.0.0.0`            |
| `PORT`     | Port des Frontend-Servers                   | `8090`               |
| `DIST_DIR` | Auszuliefernder Build-Ordner                | `/opt/adhs-helper/dist` |
| `TLS_CERT` | Pfad zum Zertifikat (PEM) — aktiviert HTTPS | *(leer = HTTP)*      |
| `TLS_KEY`  | Pfad zum privaten Schlüssel (PEM)           | *(leer = HTTP)*      |
| `JARVIS_UPSTREAM` | JARVIS-Gateway-URL → aktiviert den **Proxy** | *(leer = aus)*  |
| `JARVIS_KEY` | Plugin-API-Key (jvp_…), serverseitig injiziert | *(leer)*          |
| `JARVIS_INSECURE` | `1` = selbstsigniertes JARVIS-Zert akzeptieren | *(leer)*       |

### Zentrale JARVIS-Anbindung & Accounts (Proxy-Modus)

1. Im JARVIS-Admin-UI das Plugin `adhs` registrieren und einen **API-Key** erzeugen (siehe
   `material/pluginsystem.md` Kap. 14). Scope `api:act_as_user` gewähren, damit die App im Auftrag der
   Familienmitglieder handeln darf, plus die genutzten `api:*`-Scopes.
2. In `/etc/adhs-helper.env` `JARVIS_UPSTREAM`, `JARVIS_KEY` (und im LAN meist `JARVIS_INSECURE=1`)
   setzen, dann `sudo systemctl restart adhs-helper`.
3. **Familienmitglieder als JARVIS-Nutzer** im JARVIS-Admin anlegen. Die App lädt sie automatisch
   (`/api/v1/users`) — auf **jedem** Gerät erscheint dieselbe Account-Liste, man wählt beim Start
   seinen Account. Avatare/Farben werden geräteübergreifend im geteilten Storage abgelegt.

> Damit entfällt jede Pro-Client-Konfiguration. Der Browser sieht den Key nie, CORS und das
> Self-Signed-Zertifikat sind kein Thema mehr (alles same-origin über den Proxy).

Nach jeder Änderung:

```bash
sudo systemctl restart adhs-helper
```

## TLS / HTTPS — der Upgrade-Pfad

PWA-Features (Installation auf dem Homescreen, Web-Push, Service-Worker im Hintergrund) verlangen
einen **sicheren Kontext**. Es gibt zwei Phasen — passend zur Projektentscheidung „IP zuerst,
Domain später" (siehe `KONZEPT.md` §10):

### Phase 1 — IP + selbstsigniertes Zertifikat

```bash
# Zertifikat für die Server-IP erzeugen (SAN-Eintrag inklusive — Pflicht für Browser):
./deploy/gen-cert.sh 192.168.1.50

# Ausgegebene Pfade in /etc/adhs-helper.env eintragen:
#   TLS_CERT=/opt/adhs-helper/deploy/certs/adhs-helper.crt
#   TLS_KEY=/opt/adhs-helper/deploy/certs/adhs-helper.key
sudo systemctl restart adhs-helper
```

Dann auf **jedem Gerät einmalig** das Zertifikat akzeptieren (im Browser `https://<ip>:8090`
öffnen und die Ausnahme bestätigen) bzw. das Zertifikat als vertrauenswürdig importieren.

> **Realität:** Bei selbstsigniertem Zertifikat sind **Homescreen-Installation und Web-Push
> eingeschränkt** (besonders iOS ist streng). Bis Phase 2 funktionieren Erinnerungen über den
> WebSocket (solange die App offen ist) und über JARVIS-Kanäle (Telegram/Satellit). Die App selbst
> ist voll nutzbar.

### Phase 2 — Domain + gültiges Zertifikat über Reverse-Proxy (empfohlenes Ziel)

Einen Reverse-Proxy (Caddy/Traefik/nginx) mit echtem Zertifikat (z. B. Let's Encrypt) vor den
Dienst schalten. Der ADHS-Helper-Dienst läuft dann intern auf `127.0.0.1` ohne eigenes TLS:

```ini
# /etc/adhs-helper.env
HOST=127.0.0.1
PORT=8090
# TLS_CERT / TLS_KEY leer lassen — der Proxy terminiert TLS.
```

Beispiel **Caddy** (`/etc/caddy/Caddyfile`) — Let's Encrypt automatisch:

```caddy
adhs.familie.haus {
    reverse_proxy 127.0.0.1:8090
}
```

Beispiel **nginx**:

```nginx
server {
    listen 443 ssl;
    server_name adhs.familie.haus;
    ssl_certificate     /etc/letsencrypt/live/adhs.familie.haus/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/adhs.familie.haus/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ab jetzt sind **Homescreen-Installation und Web-Push** voll verfügbar. Im App-Admin nur noch die
Basis-URL von der IP auf die Domain umstellen — **kein Rebuild nötig**.

## Aktualisieren (neue Version einspielen)

```bash
cd /opt/adhs-helper
git pull          # bzw. neue Dateien einspielen
sudo ./deploy/install.sh   # baut neu, setzt Rechte, startet den Dienst neu
```

Alternativ ohne das Skript:

```bash
cd /opt/adhs-helper
npm ci && npm run build
sudo chown -R adhs:adhs dist
sudo systemctl restart adhs-helper
```

## Dienst verwalten

```bash
sudo systemctl start adhs-helper        # starten
sudo systemctl stop adhs-helper         # stoppen
sudo systemctl restart adhs-helper      # neu starten
sudo systemctl disable adhs-helper      # Autostart aus
sudo systemctl enable adhs-helper       # Autostart an
journalctl -u adhs-helper -f            # Logs verfolgen
```

## Manuell starten (ohne systemd, z. B. zum Testen)

```bash
npm run build
PORT=8090 HOST=0.0.0.0 npm run serve
# oder mit TLS:
PORT=8090 TLS_CERT=deploy/certs/adhs-helper.crt TLS_KEY=deploy/certs/adhs-helper.key npm run serve
```

## Deinstallieren

```bash
sudo systemctl disable --now adhs-helper
sudo rm /etc/systemd/system/adhs-helper.service
sudo rm -f /etc/adhs-helper.env
sudo systemctl daemon-reload
sudo userdel adhs        # optional: Dienstnutzer entfernen
```

## Aus dem Internet erreichbar machen (sicher)

Ziel: Die Familie nutzt die App von unterwegs, **JARVIS bleibt aber LAN-intern** und ist **nie**
direkt aus dem Internet erreichbar. Das löst die Proxy-Architektur: Der adhs-helper ist das einzige
nach außen sichtbare Stück und relayt `/api/*` intern an JARVIS.

```
 Internet ──HTTPS──► [Reverse-Proxy + gültiges Zert] ──► [adhs-helper :8096] ──LAN──► [JARVIS :8088]
                                                          (Master-Login schützt /api/*)        (nur LAN!)
```

**Pflicht-Schritte:**

1. **Masterpasswort setzen** (sonst wäre der Proxy offen!). In `/etc/adhs-helper.env`:
   ```ini
   APP_PASSWORD=ein-gutes-familien-passwort
   APP_SESSION_SECRET=<openssl rand -hex 32>
   JARVIS_UPSTREAM=https://192.168.1.224:8088
   JARVIS_KEY=jvp_adhs_…
   JARVIS_INSECURE=1
   HOST=127.0.0.1   # nur lokal binden; nach außen geht nur der Reverse-Proxy
   PORT=8096
   ```
   `sudo systemctl restart adhs-helper`. Der Server verlangt nun vor jedem `/api/*`-Zugriff und dem
   WebSocket eine Anmeldung (Session-Cookie). Beim ersten Öffnen erscheint der Master-Login; **danach
   kann man in der App frei zwischen den Familien-Profilen wechseln** (das ist Absicht).

2. **Reverse-Proxy** mit echtem Zertifikat (Let's Encrypt) nur auf den adhs-helper zeigen lassen —
   **niemals** auf JARVIS. Beispiel Caddy:
   ```caddy
   adhs.deine-domain.de {
       reverse_proxy 127.0.0.1:8096
   }
   ```
   Caddy holt automatisch ein gültiges Zertifikat → Mikrofon/STT, PWA-Installation und Web-Push
   funktionieren, und das Master-Cookie wird als `Secure` gesetzt.

3. **JARVIS abschotten:** sicherstellen, dass das JARVIS-Gateway (`:8088`) **nicht** vom Router nach
   außen weitergeleitet ist. Nur der Reverse-Proxy-Port (443) zeigt ins Internet.

> Warum serverseitig? Ein reines Passwort im Browser würde den Proxy nicht schützen — wer die
> Adresse kennt, könnte sonst `…/api/v1/*` direkt aufrufen und JARVIS nutzen. Deshalb sitzt der
> Schutz im Server und gated **/api/* und den WebSocket**.

**Brute-Force-Schutz:** Nach mehreren Fehlversuchen pro IP sperrt der Login kurz (HTTP 429).
**Abmelden:** über „Ich → Abmelden" (löscht das Session-Cookie).

## Fehlersuche

**`EADDRINUSE: address already in use 0.0.0.0:8090` / Dienst startet immer wieder neu**
Der gewählte Port ist bereits von einem anderen Dienst belegt. Freien Port finden und eintragen:

```bash
sudo ss -ltnp | grep :8090        # zeigt, wer den Port hält
sudoedit /etc/adhs-helper.env     # PORT=... auf einen freien Wert ändern (z. B. 8096)
sudo systemctl restart adhs-helper
```

Der Server erkennt diesen Fall jetzt und meldet ihn verständlich im Log. Die Unit gibt nach
mehreren Sofort-Fehlstarts auf (`StartLimitBurst`), statt endlos neu zu starten — nach dem Fix:

```bash
sudo systemctl reset-failed adhs-helper && sudo systemctl restart adhs-helper
```

**Status/Logs ansehen**
```bash
sudo systemctl status adhs-helper
journalctl -u adhs-helper -n 50 --no-pager
```

## Sicherheitshinweise

- Die Unit ist **gehärtet** (`NoNewPrivileges`, `ProtectSystem=strict`, `PrivateTmp`,
  eingeschränkte Adressfamilien usw.). Der Statik-Server schreibt nichts ins Dateisystem.
- TLS-Schlüssel (`*.key`) sind über `.gitignore` vom Repo ausgeschlossen — niemals einchecken.
- Der Dienst sollte im **LAN** bleiben (wie das JARVIS-Gateway). Externe Erreichbarkeit nur bewusst
  über einen abgesicherten Reverse-Proxy.
- Die hochsensiblen Daten (Tagebuch/Medikation) liegen **nicht** in diesem Dienst, sondern lokal im
  Browser (IndexedDB) bzw. — sobald angebunden — in den nutzer-isolierten JARVIS-Namespaces.
