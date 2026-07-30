#!/usr/bin/env bash
# Deploy seguro del frontend estático a producción.
#
# El builder Docker de docker-compose.prod.yml (app-builder) está roto
# (@vue/compiler-sfc no resuelve imports de tipos), así que se genera dentro
# del contenedor de desarrollo `itakai-app-dev` (bind mount de app/) y se
# publica en /home/static/itakai, que nginx sirve directamente.
#
# Usage:
#   ./scripts/deploy-frontend.sh             # comprobar → generar → publicar → verificar
#   ./scripts/deploy-frontend.sh --rollback  # restaurar el backup del deploy anterior
#
# Guardas que aplican (cada una viene de un incidente real):
#   - Aborta si hay cambios sin commitear (no subir trabajo a medias a prod).
#   - Aborta si app/.env tiene finales de línea CRLF (un \r colado en
#     NUXT_PUBLIC_GOOGLE_CLIENT_ID rompió el login con Google el 2026-07-28).
#   - Fuerza NUXT_PUBLIC_API_BASE de prod (el contenedor dev inyecta la URL dev).
#   - Verifica el build generado ANTES de publicar (client ID limpio, apiBase ok).
#   - Guarda backup en /home/static/itakai.bak y publica sin ventana de caída
#     (sobrescribe primero, borra obsoletos después).
#   - Verifica la web en vivo al terminar.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_API_BASE="https://itakai.es/api"
OUT="$REPO_DIR/app/.output/public"

log()  { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✘ %s\033[0m\n' "$*" >&2; exit 1; }

cd "$REPO_DIR"

if [[ "${1:-}" == "--rollback" ]]; then
  log "Restaurando backup /home/static/itakai.bak…"
  docker run --rm -v /home/static:/host busybox sh -c \
    '[ -d /host/itakai.bak ] || exit 1; cp -a /host/itakai.bak/. /host/itakai/ && cd /host/itakai && find . -type f | while read f; do [ -e "/host/itakai.bak/$f" ] || rm -f "$f"; done' \
    || fail "No hay backup en /home/static/itakai.bak"
  ok "Rollback aplicado."
  exit 0
fi

# ── Comprobaciones previas ──────────────────────────────────────────────
log "Comprobando estado del repo…"
[[ -z "$(git status --porcelain)" ]] \
  || fail "Hay cambios sin commitear. Commitea (o stashea) antes de desplegar:\n$(git status --short)"
ok "Working tree limpio en $(git branch --show-current) ($(git rev-parse --short HEAD))."

log "Comprobando finales de línea de app/.env…"
if grep -q $'\r' app/.env; then
  fail "app/.env tiene CRLF (¿editado desde Windows?). Arréglalo con: sed -i 's/\\r\$//' app/.env"
fi
ok "app/.env sin CRLF."

docker inspect itakai-app-dev --format '{{.State.Status}}' 2>/dev/null | grep -q running \
  || fail "El contenedor itakai-app-dev no está corriendo."

# ── Generar ─────────────────────────────────────────────────────────────
log "Generando frontend estático en itakai-app-dev (API base: $PROD_API_BASE)…"
docker exec -e NUXT_PUBLIC_API_BASE="$PROD_API_BASE" itakai-app-dev \
  sh -c 'cd /app && pnpm generate' >/dev/null
ok "Build generado en app/.output/public."

# ── Verificar el build antes de publicar ────────────────────────────────
log "Verificando el build…"
[[ -f "$OUT/index.html" && -f "$OUT/200.html" ]] || fail "Faltan index.html/200.html en el build."

client_id=$(grep -o 'googleClientId:"[^"]*"' "$OUT/index.html" | head -1)
[[ -n "$client_id" ]] || fail "No se encontró googleClientId en el build."
case "$client_id" in
  *'\r'*|*'\n'*|*' "'*) fail "googleClientId con caracteres extraños: $client_id" ;;
  *'.apps.googleusercontent.com"') : ;;
  *) fail "googleClientId no termina en .apps.googleusercontent.com: $client_id" ;;
esac

grep -q "apiBase:\"$PROD_API_BASE\"" "$OUT/index.html" \
  || fail "apiBase incorrecto en el build: $(grep -o 'apiBase:"[^"]*"' "$OUT/index.html" | head -1)"
ok "Build verificado: $client_id, apiBase de prod."

# ── Publicar (backup + sin ventana de caída) ────────────────────────────
log "Guardando backup en /home/static/itakai.bak…"
docker run --rm -v /home/static:/host busybox sh -c \
  'rm -rf /host/itakai.bak && cp -a /host/itakai /host/itakai.bak'

log "Publicando en /home/static/itakai…"
docker run --rm -v "$OUT":/in:ro -v /home/static/itakai:/out busybox sh -c \
  'cp -a /in/. /out/ && cd /out && find . -type f | while read f; do [ -e "/in/$f" ] || rm -f "$f"; done && find . -mindepth 1 -type d -empty -delete'
ok "Publicado (nginx lo sirve al instante, sin recarga)."

# ── Verificar en vivo ───────────────────────────────────────────────────
log "Verificando itakai.es…"
live=$(curl -sS -m 15 https://itakai.es/)
echo "$live" | grep -q "apiBase:\"$PROD_API_BASE\"" || fail "La web en vivo no sirve el apiBase esperado."
echo "$live" | grep -o 'googleClientId:"[^"]*"' | head -1 | grep -q '\.apps\.googleusercontent\.com"$' \
  || fail "La web en vivo sirve un googleClientId sospechoso."
asset=$(echo "$live" | grep -o '/_nuxt/[^">]*\.js' | head -1)
[[ "$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "https://itakai.es$asset")" == "200" ]] \
  || fail "El asset $asset no responde 200."
[[ "$(curl -sSL -m 15 -o /dev/null -w '%{http_code}' https://itakai.es/auth/login)" == "200" ]] \
  || fail "/auth/login no responde 200."
ok "Web en vivo verificada."
ok "Deploy completado: $(git rev-parse --short HEAD) en producción. Rollback: $0 --rollback"
