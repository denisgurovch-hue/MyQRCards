#!/usr/bin/env bash
# Apply repo nginx site to the host, preserving Certbot SSL lines from the live file.
# Safe to re-run. Requires passwordless sudo for nginx -t / reload (ubuntu/deploy).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myqrcards}"
TEMPLATE="${TEMPLATE:-$APP_DIR/deploy/nginx/myqrcards.conf}"
LIVE="${LIVE:-/etc/nginx/sites-available/myqrcards}"
ENABLED="${ENABLED:-/etc/nginx/sites-enabled/myqrcards}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing nginx template: $TEMPLATE" >&2
  exit 1
fi

DOMAIN="${DOMAIN:-}"
if [[ -z "$DOMAIN" && -f "$ENV_FILE" ]]; then
  # Prefer public origin host (NEXT_PUBLIC_APP_URL / WEB_ORIGIN).
  DOMAIN="$(
    python3 - "$ENV_FILE" <<'PY'
import re, sys
path = sys.argv[1]
vals = {}
with open(path, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        vals[k.strip()] = v.strip().strip('"').strip("'")
url = vals.get("NEXT_PUBLIC_APP_URL") or vals.get("WEB_ORIGIN") or ""
m = re.match(r"https?://([^/:]+)", url)
print(m.group(1) if m else "")
PY
  )"
fi
DOMAIN="${DOMAIN:-smartvizitka.ru}"
if [[ "$DOMAIN" == www.* ]]; then
  DOMAIN="${DOMAIN#www.}"
fi

TMP="$(mktemp)"
BACKUP="${LIVE}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
trap 'rm -f "$TMP"' EXIT

python3 - "$TEMPLATE" "$LIVE" "$TMP" "$DOMAIN" <<'PY'
import pathlib, re, sys

template_path, live_path, out_path, domain = sys.argv[1:5]
template = pathlib.Path(template_path).read_text(encoding="utf-8")
live = pathlib.Path(live_path).read_text(encoding="utf-8") if pathlib.Path(live_path).exists() else ""

# Collect SSL / certbot-managed directives from the live site (any 443 block).
ssl_keys = (
    "ssl_certificate",
    "ssl_certificate_key",
    "ssl_dhparam",
    "ssl_trusted_certificate",
    "ssl_stapling",
    "ssl_stapling_verify",
)
ssl_lines = []
seen = set()
for line in live.splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue
    if stripped.startswith("include ") and "options-ssl-nginx.conf" in stripped:
        key = "include-options-ssl"
    elif any(stripped.startswith(k + " ") or stripped.startswith(k + "\t") for k in ssl_keys):
        key = stripped.split()[0]
    else:
        continue
    if key in seen:
        continue
    seen.add(key)
    ssl_lines.append("    " + stripped.rstrip(";") + ";")

if not ssl_lines:
    # Fall back to standard Let's Encrypt paths for this apex.
    ssl_lines = [
        f"    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;",
        f"    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;",
        "    include /etc/letsencrypt/options-ssl-nginx.conf;",
        "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;",
    ]

# Keep production HSTS if present on the live apex block.
hsts = None
for line in live.splitlines():
    s = line.strip()
    if s.startswith("add_header Strict-Transport-Security"):
        hsts = "    " + s.rstrip(";") + ";"
        break

rendered = template.replace("DOMAIN", domain)

# Drop commented Certbot placeholders; inject live SSL after each HTTPS server_name.
out_lines = []
i = 0
lines = rendered.splitlines()
https_server = False
injected = False
while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    if stripped.startswith("server {"):
        https_server = False
        injected = False
        out_lines.append(line)
        i += 1
        continue

    if "listen" in stripped and "443" in stripped:
        https_server = True

    # Skip commented certbot placeholder lines in the template.
    if stripped.startswith("#") and any(
        tok in stripped
        for tok in (
            "ssl_certificate",
            "ssl_certificate_key",
            "options-ssl-nginx.conf",
            "ssl_dhparam",
            "Managed by Certbot",
            "Cert must include",
            "ssl_certificate     /etc/letsencrypt",
            "live dir is usually",
        )
    ):
        i += 1
        continue

    out_lines.append(line)

    if (
        https_server
        and not injected
        and stripped.startswith("server_name ")
    ):
        out_lines.extend(ssl_lines)
        # Keep production HSTS on the apex HTTPS server only.
        if hsts and stripped == f"server_name {domain};":
            out_lines.append(hsts)
        injected = True

    i += 1

pathlib.Path(out_path).write_text("\n".join(out_lines) + "\n", encoding="utf-8")
print(f"Rendered nginx site for domain={domain} (ssl_lines={len(ssl_lines)})")
PY

# Prefer sudo when not root (Actions SSH is usually ubuntu).
run() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

run cp -a "$LIVE" "$BACKUP" 2>/dev/null || true
run cp "$TMP" "$LIVE"
# sites-enabled must be a symlink (file copy was a past prod footgun).
run ln -sfn "$LIVE" "$ENABLED"
run rm -f /etc/nginx/sites-enabled/default
run nginx -t
run systemctl reload nginx
echo "Nginx site applied and reloaded (backup: $BACKUP)."
