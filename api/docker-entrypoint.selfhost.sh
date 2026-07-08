#!/bin/sh
# Entrypoint del despliegue AUTO-HOSTEABLE. Objetivo: que un `docker compose up`
# deje ITAKAI funcionando sin configurar nada.
#  1) genera secretos únicos la primera vez y los persiste (volumen api_data),
#  2) aplica migraciones,
#  3) crea el admin + insignias si no existen (bootstrap),
#  4) arranca la API.
# Cualquier variable definida por el usuario (env / .env.selfhost) tiene prioridad.
set -e

SECRETS_FILE="/app/data/selfhost-secrets.env"
mkdir -p /app/data

if [ ! -f "$SECRETS_FILE" ]; then
  echo "[selfhost] Primer arranque: generando secretos únicos de esta instancia..."
  {
    printf 'JWT_ACCESS_SECRET=%s\n'      "$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))")"
    printf 'JWT_REFRESH_SECRET=%s\n'     "$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))")"
    printf 'SETTINGS_ENCRYPTION_KEY=%s\n' "$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))")"
  } > "$SECRETS_FILE"
fi

# Carga del fichero SOLO las variables que no vengan ya por entorno (respeta overrides).
while IFS='=' read -r k v; do
  [ -z "$k" ] && continue
  eval "cur=\${$k:-}"
  [ -z "$cur" ] && export "$k=$v"
done < "$SECRETS_FILE"

echo "[selfhost] Aplicando migraciones de base de datos..."
pnpm exec prisma migrate deploy

echo "[selfhost] Preparando administrador e insignias del sistema..."
pnpm tsx prisma/bootstrap.ts || echo "[selfhost] aviso: el bootstrap falló; la app arranca igualmente"

echo "[selfhost] Arrancando API..."
exec pnpm tsx src/index.ts
