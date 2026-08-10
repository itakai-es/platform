#!/usr/bin/env bash
# ITAKAI production deploy helper.
#
# Usage:
#   ./scripts/deploy.sh --api              # rebuild + recreate API container
#   ./scripts/deploy.sh --app              # rebuild app-builder + regenerate static frontend
#   ./scripts/deploy.sh --all              # API + frontend + Prisma migrate (recommended)
#   ./scripts/deploy.sh --api --migrate    # build → migrate → recreate (safe schema rollout)
#   ./scripts/deploy.sh --migrate          # run `prisma migrate deploy` only
#   ./scripts/deploy.sh --env              # recreate API to pick up new .env.prod (no build)
#   ./scripts/deploy.sh --nginx            # reload nginx config (no rebuild)
#
# Migration step uses an ephemeral container from the freshly-built API image
# (so the new migration files travel with it). It runs BEFORE the live API
# container is recreated, so the old code keeps serving until the schema is
# ready. Additive migrations (ADD COLUMN/CREATE TABLE) are safe to apply this
# way; destructive ones need a maintenance window outside this script.
#
# Run from anywhere — the script cd's into the repo root.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose -f docker-compose.prod.yml"

cd "$REPO_DIR"

do_api=false
do_app=false
do_migrate=false
do_env=false
do_nginx=false

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 [--api] [--app] [--migrate] [--all] [--env] [--nginx]" >&2
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    --api)     do_api=true ;;
    --app)     do_app=true ;;
    --migrate) do_migrate=true ;;
    --all)     do_api=true; do_app=true; do_migrate=true ;;
    --env)     do_env=true ;;
    --nginx)   do_nginx=true ;;
    -h|--help)
      sed -n '2,18p' "$0"; exit 0 ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 1 ;;
  esac
done

log()  { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✘ %s\033[0m\n' "$*" >&2; exit 1; }

# La conexión a producción vive en api/.env.prod y en ningún otro sitio. Antes se
# construía en docker-compose.prod.yml interpolando POSTGRES_*, que el .env de la
# raíz define con los valores de DESARROLLO: un deploy podía recrear la API contra
# la base de dev (existe en este mismo servidor, así que ni fallaba) o sin poder
# autenticarse. Se comprueba antes de construir o migrar nada.
if $do_api || $do_migrate || $do_env; then
  log "Comprobando la conexión de producción en api/.env.prod…"
  [[ -f api/.env.prod ]] \
    || fail "Falta api/.env.prod."
  grep -qE '^DATABASE_URL=' api/.env.prod \
    || fail "api/.env.prod no define DATABASE_URL. Añádela (es la conexión de PRODUCCIÓN):\n  DATABASE_URL=postgresql://USUARIO:CONTRASEÑA@127.0.0.1:5432/itakai_prod"
  grep -qE '^DATABASE_URL=.*/itakai_prod(\?|$)' api/.env.prod \
    || fail "El DATABASE_URL de api/.env.prod no apunta a itakai_prod. Revísalo antes de desplegar."
  ok "api/.env.prod define la conexión a itakai_prod."
fi

# Build first so the migrate step uses the new image (with new migration files).
if $do_api; then
  log "Rebuilding API image…"
  $COMPOSE build api
fi

# Migrate against prod DB BEFORE recreating the live container. Old code keeps
# serving while we apply schema changes — safe for additive migrations.
if $do_migrate; then
  log "Running Prisma migrate deploy (ephemeral container, live API untouched)…"
  $COMPOSE run --rm --no-deps \
    -e PGOPTIONS='-c lock_timeout=3s -c statement_timeout=30s' \
    --entrypoint sh api -c 'pnpm prisma migrate deploy'
  ok "Migrations applied."
fi

if $do_api; then
  log "Recreating API container…"
  $COMPOSE up -d --force-recreate --no-deps api
  ok "API deployed."
fi

if $do_env && ! $do_api; then
  log "Recreating API container to pick up new env vars…"
  $COMPOSE up -d --force-recreate --no-deps api
  ok "API env reloaded."
fi

if $do_app; then
  log "Rebuilding app-builder image…"
  $COMPOSE build app-builder
  log "Regenerating static frontend → /home/static/itakai…"
  $COMPOSE run --rm app-builder
  ok "Frontend deployed (nginx serves the new files immediately, no reload needed)."
fi

if $do_nginx; then
  log "Reloading nginx config…"
  docker exec itakai-nginx nginx -t
  docker exec itakai-nginx nginx -s reload
  ok "Nginx reloaded."
fi

ok "Done."
