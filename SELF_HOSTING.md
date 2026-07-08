# Auto-hospedaje de ITAKAI

Despliega tu propia instancia de ITAKAI con Docker. **Arranca con un solo comando
y sin configurar nada**: trae defaults sensatos y autogenera los secretos. Los
servicios (IA, generación de imágenes, almacenamiento, dominio…) se conectan
después desde el panel de administración.

## Requisitos

- Docker y Docker Compose (v2 reciente).

## 1. Arranque (un comando)

```bash
docker compose -f docker-compose.selfhost.yml up -d --build
```

Levanta Postgres + API + la web + nginx, aplica las migraciones y crea el
administrador automáticamente. Cuando termine, tienes ITAKAI en **http://localhost**.

**Credenciales del admin**: si no definiste una contraseña, se genera y se imprime
en los logs. Míralas con:

```bash
docker compose -f docker-compose.selfhost.yml logs api | grep -A4 "Administrador creado"
```

(email por defecto `admin@itakai.local`). Entra y **cambia la contraseña** desde tu
perfil.

## 2. Configurar los servicios (desde el panel)

Entra como admin → **Configuración**:

- **Inteligencia artificial** — dos endpoints compatibles con la API de OpenAI (uno
  para texto y otro para imágenes): URL base, clave y modelo. Apunta a lo que
  quieras: OpenAI, tu propio Spark, vLLM, Groq, Together, OpenRouter, o Gemini vía
  su endpoint OpenAI. *(Hasta que lo configures la app funciona, pero las funciones
  de IA no.)*
- **Almacenamiento** — local por defecto (volumen Docker); para escalar, S3 /
  Cloudflare R2.
- **Dominio** — URL pública de la instancia (enlaces de los emails) y orígenes CORS.
- **General** — nombre de la plataforma, idioma por defecto, registro abierto/
  cerrado y modo mantenimiento.

Las API keys y las claves de R2 se guardan **cifradas** (AES-256-GCM) en la base de
datos; en el panel se muestran para que puedas revisarlas.

## 3. Cambiar los defaults (opcional)

¿Quieres tu dominio, otro puerto, tu propia contraseña de admin o credenciales de
BD? Copia el ejemplo, edita **solo lo que quieras** y pásalo al arrancar:

```bash
cp .env.selfhost.example .env.selfhost
# edita .env.selfhost (todo está comentado; descomenta lo que cambies)
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build
```

**Para servir en tu dominio** (por ejemplo el del instituto, resuelto por la DNS de
tu red): en `.env.selfhost` defines el dominio y nginx se configura con él (como el
"site URL" de WordPress):
```bash
SERVER_NAME=itakai.miinstituto.es          # el dominio (nginx server_name)
CORS_ORIGIN=https://itakai.miinstituto.es  # (o http:// si sin TLS)
APP_URL=https://itakai.miinstituto.es
```
Que ese dominio apunte al servidor (DNS del router/WiFi del instituto) es un paso
aparte de tu red — ITAKAI solo necesita saber su dominio con esas variables.

> **HTTPS / producción**: el stack sirve HTTP en el puerto 80, apto para local o red
> interna. Para una instancia accesible desde internet, pon TLS delante (Caddy,
> Traefik, Cloudflare) y en `.env.selfhost` define `COOKIE_SECURE=true` y tu
> `CORS_ORIGIN` / `APP_URL` con `https://`. Servir la autenticación por HTTP plano
> solo es aceptable en redes internas de confianza.

## Notas de operación

- **Backups**: los volúmenes `postgres_data` (base de datos), `api_uploads`
  (ficheros subidos en modo local) y `api_data` (los secretos autogenerados — si lo
  borras, rotarían las claves y habría que reintroducir los secretos del panel).
- **Actualizar**: `git pull` y repite el `up -d --build`; las migraciones se aplican
  solas al arrancar.
- **Prioridad de configuración**: los valores del panel (en base de datos) tienen
  prioridad sobre el `.env`, que solo aporta los defaults de arranque.
