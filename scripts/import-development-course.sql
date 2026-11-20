-- Importa las seis lecciones de desarrollo en una base de ITAKAI ya migrada.
-- Usa psql con -v ON_ERROR_STOP=1 -v base=https://... -f scripts/import-development-course.sql.
-- Sirve los MP4, portadas, PDF y guía TXT bajo /help-media en ese servidor.
-- Usa -v from_lesson=6 para añadir solo la última lección.
\if :{?from_lesson}
\else
\set from_lesson 1
\endif
BEGIN;

INSERT INTO help_categories (id, slug, name, description, icon, accent, area, order_index, updated_at)
VALUES (
  gen_random_uuid()::text, 'desarrollo', 'Desarrollo de ITAKAI',
  'Vídeos y materiales para empezar a desarrollar en ITAKAI.',
  'desarrollo', 'ia', 'ayuda', 100, now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  accent = EXCLUDED.accent,
  updated_at = now()
WHERE :from_lesson <= 1;

WITH lessons (slug, position, title, summary, duration, steps, links) AS (
  VALUES
    (
      'bienvenida', 1, 'Bienvenida al curso de Itakai',
      'Conoce Itakai y el recorrido del curso. Veremos cómo encajan las herramientas de IA, el método BMAD y el entorno de desarrollo antes de trabajar sobre una funcionalidad real.',
      190, $md$1. Conoce las herramientas de IA del curso y cómo darles contexto para que trabajen sobre el proyecto.
2. Prepara el entorno de desarrollo y conecta herramientas al agente mediante MCP.
3. Usa BMAD-METHOD para convertir una idea o petición de cambio en un plan de trabajo.
4. Arranca ITAKAI en local, revisa cómo está organizado y comprueba que funciona.
5. Aplica el proceso al onboarding del profesorado y prueba y versiona el cambio.$md$,
      $md$- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)$md$
    ),
    (
      'herramientas-ia', 2, 'Herramientas de IA para desarrollar',
      'Explora Claude Code, Codex, Antigravity CLI y OpenCode. Verás cómo cambia el trabajo al usar un asistente desde la terminal y qué contexto darle cuando le pides que trabaje sobre un proyecto.',
      458, $md$### Instalar las herramientas

Elige el sistema donde se ejecutan los comandos. Si usas WSL o te conectas a un servidor Linux desde VS Code, elige **Linux**.

<!-- commands:windows -->

Abre **PowerShell** y ejecuta el bloque de la herramienta que quieras instalar.

**Codex**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

**Claude Code**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Antigravity CLI**

```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```

**OpenCode**

Descarga y extrae el binario oficial para equipos x64 o ARM64. Ejecuta `opencode` desde la misma ventana de PowerShell.

```powershell
$arch = if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq 'Arm64') { 'arm64' } else { 'x64' }
$zip = Join-Path $env:TEMP "opencode-windows-$arch.zip"
$dest = Join-Path $env:LOCALAPPDATA 'OpenCode'
Invoke-WebRequest -Uri "https://opencode.ai/update/api/latest/cli/opencode/opencode-windows-$arch.zip" -OutFile $zip -ErrorAction Stop
Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force -ErrorAction Stop
$opencode = Get-ChildItem -LiteralPath $dest -Filter opencode.exe -Recurse | Select-Object -First 1
if (-not $opencode) { throw 'No se encontró opencode.exe en el ZIP.' }
$env:Path = "$($opencode.DirectoryName);$env:Path"
```

<!-- commands:linux -->

Estos son los comandos de la terminal Linux del vídeo.

**Codex**

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

**Claude Code**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Antigravity CLI**

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

**OpenCode**

```bash
curl -fsSL https://opencode.ai/v2/install | bash
```

<!-- commands:macos -->

Abre **Terminal**. Los bloques con `brew` requieren Homebrew.

**Codex**

```bash
brew install --cask codex
```

**Claude Code**

```bash
brew install --cask claude-code
```

**Antigravity CLI**

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

**OpenCode**

```bash
brew install anomalyco/tap/opencode-v2
```

<!-- commands:end -->

### Abrir y probar un asistente

1. Abre una terminal en la carpeta del proyecto y ejecuta `codex`, `claude`, `agy` u `opencode`, según la herramienta que quieras probar.
2. Sigue el inicio de sesión que te muestre la herramienta.
3. En Antigravity CLI, escribe `/model` para ver los modelos disponibles. En el vídeo se usa Artificial Analysis para comparar inteligencia, tiempo por tarea y coste.

### Mensaje de prueba

Escribe el mismo mensaje que se usa en la demostración para comprobar que el asistente responde.

```text
hola
```$md$,
      $md$- [Guía de inicio de Claude Code](https://code.claude.com/docs/en/quickstart)
- [Guía de instalación de Codex CLI](https://learn.chatgpt.com/docs/codex/cli#getting-started)
- [Guía de Antigravity CLI](https://antigravity.google/docs/getting-started?tab=cli)
- [Instalación de OpenCode](https://opencode.ai/docs/)
- [Homebrew para macOS](https://brew.sh/)
- [Artificial Analysis](https://artificialanalysis.ai/)$md$
    ),
    (
      'entorno-y-mcp', 3, 'Prepara el entorno de Itakai con VS Code, Codex y MCP',
      'Sigue la configuración del entorno desde VS Code, abre el repositorio y recorre sus carpetas. Después verás cómo instalar los MCP de Playwright, Git y Context7 y comprobar desde Codex que responden.',
      558, $md$### Abrir el proyecto en VS Code

1. Instala VS Code. Si trabajas en un servidor como en el vídeo, instala la extensión **Remote - SSH**, conéctate al servidor y abre allí la terminal.
2. En VS Code, elige **Clonar repositorio**, pega la URL de ITAKAI y abre la carpeta `platform`. También puedes clonarlo desde la terminal.

```bash
git clone https://github.com/itakai-es/platform.git
cd platform
```

3. Abre la terminal integrada con `Ctrl+J`. Revisa el `README.md`, los archivos de Docker y los scripts. En `api/` está el backend con Prisma y en `app/` está el frontend, con sus páginas, componentes y traducciones. Instala la extensión de Vue si VS Code te la ofrece al abrir un archivo `.vue`.

### Configurar las herramientas con Codex

Desde la raíz del repositorio, ejecuta `codex`. Si tienes que iniciar sesión, hazlo en la terminal que vas a usar. En el vídeo se revisan las solicitudes de permisos según aparecen.

Pega el mensaje de instalación dentro de Codex.

```text
Instala:
Docker.
git, y los mcp para codex de playwright, git, y context7

dime que tengo que logear
```

### Comandos para configurar el entorno a mano

Elige el sistema de tu terminal. Ejecuta los bloques de Git y Playwright desde la carpeta `platform`. Playwright MCP requiere Node.js 20 o posterior.

<!-- commands:windows -->

**Dependencias en Windows con PowerShell**

```powershell
winget install --id Git.Git --exact
winget install --id OpenJS.NodeJS.LTS --exact
winget install --id Python.Python.3.13 --exact
winget install --id Docker.DockerDesktop --exact
```

Abre Docker Desktop y sigue la configuración inicial. Abre una ventana nueva de PowerShell para que reconozca los programas instalados.

**Git**

```powershell
$gitMcp = Join-Path $env:LOCALAPPDATA 'codex-mcp\git'
py -3.13 -m venv $gitMcp
& "$gitMcp\Scripts\python.exe" -m pip install mcp-server-git
codex mcp add git -- "$gitMcp\Scripts\mcp-server-git.exe" --repository (Get-Location).Path
```

**Playwright con Chromium**

```powershell
$playwrightMcp = Join-Path $env:LOCALAPPDATA 'codex-mcp\playwright'
New-Item -ItemType Directory -Path $playwrightMcp -Force | Out-Null
npm.cmd install --prefix $playwrightMcp @playwright/mcp
node "$playwrightMcp\node_modules\playwright\cli.js" install chromium
codex mcp add playwright -- node "$playwrightMcp\node_modules\@playwright\mcp\cli.js" --headless --browser chromium
```

<!-- commands:linux -->

**Dependencias en Ubuntu 26.04**

Git ya estaba instalado en el servidor de la grabación. El bloque también lo incluye para empezar en un equipo nuevo.

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-v2 nodejs npm python3-venv
```

Las rutas de los bloques siguientes usan tu carpeta de usuario.

**Git**

```bash
python3 -m venv "$HOME/.local/share/codex-mcp/git"
"$HOME/.local/share/codex-mcp/git/bin/pip" install mcp-server-git
codex mcp add git -- "$HOME/.local/share/codex-mcp/git/bin/mcp-server-git" --repository "$PWD"
```

**Playwright con Chromium**

Comprueba con `node --version` que tienes Node.js 20 o posterior.

```bash
mkdir -p "$HOME/.local/share/codex-mcp/playwright"
npm install --prefix "$HOME/.local/share/codex-mcp/playwright" @playwright/mcp
node "$HOME/.local/share/codex-mcp/playwright/node_modules/playwright/cli.js" install --with-deps chromium
codex mcp add playwright -- "$HOME/.local/share/codex-mcp/playwright/node_modules/.bin/playwright-mcp" --headless --browser chromium
```

<!-- commands:macos -->

**Dependencias en macOS con Homebrew**

```bash
brew install git node python
brew install --cask docker-desktop
```

Abre Docker Desktop y sigue la configuración inicial.

**Git**

```bash
python3 -m venv "$HOME/.local/share/codex-mcp/git"
"$HOME/.local/share/codex-mcp/git/bin/python" -m pip install mcp-server-git
codex mcp add git -- "$HOME/.local/share/codex-mcp/git/bin/mcp-server-git" --repository "$PWD"
```

**Playwright con Chromium**

```bash
mkdir -p "$HOME/.local/share/codex-mcp/playwright"
npm install --prefix "$HOME/.local/share/codex-mcp/playwright" @playwright/mcp
node "$HOME/.local/share/codex-mcp/playwright/node_modules/playwright/cli.js" install chromium
codex mcp add playwright -- "$HOME/.local/share/codex-mcp/playwright/node_modules/.bin/playwright-mcp" --headless --browser chromium
```

<!-- commands:end -->

**Context7**

```bash
codex mcp add context7 --url https://mcp.context7.com/mcp
```

Si Context7 te pide iniciar sesión, usa `codex mcp login context7`.

### Comprobar que funciona

Abre otra pestaña de la terminal para listar los servidores registrados.

```bash
codex mcp list
```

Abre una nueva sesión de Codex y pega el mensaje de comprobación.

```text
quiero que hagas una prueba para cada mcp instalado
```

En la grabación, Context7 buscó documentación de React, Playwright abrió el navegador y Git devolvió el estado del repositorio.$md$,
      $md$- [VS Code](https://code.visualstudio.com/)
- [Extensión Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
- [Repositorio de ITAKAI](https://github.com/itakai-es/platform)
- [Instalación de Docker](https://docs.docker.com/engine/install/)
- [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Desktop para macOS](https://docs.docker.com/desktop/setup/install/mac-install/)
- [Homebrew para macOS](https://brew.sh/)
- [Descarga de Node.js](https://nodejs.org/en/download)
- [Comandos MCP de Codex](https://learn.chatgpt.com/docs/developer-commands#codex-mcp)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Git MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/git)
- [Context7](https://context7.com/docs/overview)$md$
    ),
    (
      'bmad-method', 4, 'BMAD-Method en Itakai',
      'Instala BMAD en el proyecto, consulta la ayuda desde Codex y revisa las opciones para planificar una funcionalidad.',
      246, $md$### Qué se hace en el vídeo

1. Instala BMAD desde Codex aprovechando la configuración de Itakai.
2. Consulta la ayuda para decidir cómo abordar una funcionalidad. En la grabación, `bmad-spec` ayuda a definir el alcance y los criterios y `bmad-build` ayuda a implementar.
3. Revisa la propuesta y divide el trabajo en análisis, requisitos, tareas, implementación y comprobación.

### Prompts de la guía para copiar

```text
Instala BMAD para Codex en este proyecto. Usa la configuración BMAD que ya tiene Itakai.
```

```text
$bmad-help ¿Cómo procedo para desarrollar una funcionalidad?
```

### Instalación en una copia nueva

Ejecuta los comandos desde la raíz del proyecto con Node.js, npm, Git y uv. Sirven para Linux, macOS y PowerShell. Si trabajas en Ubuntu por SSH, ejecútalos en Ubuntu.

```sh
npx skills add bmad-code-org/BMAD-METHOD/skills/core-tools --skill '*'
npx skills add bmad-code-org/BMAD-METHOD/skills/method --skill '*'
```

Elige Codex y el ámbito del proyecto. Abre Codex y ejecuta esta instrucción. Las skills disponibles pueden variar con la versión instalada.

```text
Usa la skill bmad para ejecutar bmad setup y después bmad status.
```

### Para practicar

```text
Queremos un asistente de primer acceso para profesores. Antes de implementar, revisa qué existe y hazme las preguntas necesarias para definir los criterios de aceptación.
```$md$,
      $md$- [Instalación y requisitos de BMAD](https://docs.bmad-method.org/start/install-bmad/)
- [Repositorio BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)$md$
    ),
    (
      'itakai-en-local', 5, 'Arrancar Itakai en local',
      'Revisa los servicios de Docker Compose y las variables de entorno, arranca la plataforma y comprueba el acceso de usuarios y el chat desde Itakai.',
      684, $md$### Preparar el entorno

1. Abre `docker-compose.yml`. `postgres` guarda los datos, `api` atiende las peticiones y `app` sirve la interfaz. Adminer es opcional.
2. Crea los archivos `.env` que falten a partir de las plantillas de la raíz, `api/` y `app/`.

<!-- commands:windows -->

Ejecuta este bloque en PowerShell desde la raíz. Conserva los archivos `.env` que ya existan.

```powershell
foreach ($d in '.', 'api', 'app') {
  if (!(Test-Path "$d/.env")) { Copy-Item "$d/.env.example" "$d/.env" }
}
```

<!-- commands:linux -->

Ejecuta este bloque desde la raíz. Conserva los archivos `.env` que ya existan.

```bash
for d in . api app; do
  test -e "$d/.env" || cp "$d/.env.example" "$d/.env"
done
```

<!-- commands:macos -->

Ejecuta este bloque en Terminal desde la raíz. Conserva los archivos `.env` que ya existan.

```bash
for d in . api app; do
  test -e "$d/.env" || cp "$d/.env.example" "$d/.env"
done
```

<!-- commands:end -->

3. Revisa `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` en el archivo de la raíz. Compose construye la conexión de la API con el servicio `postgres` en el puerto 5432.
4. Define `NUXT_PUBLIC_API_BASE=http://localhost:3003` en el `.env` de la raíz y `CORS_ORIGIN=http://localhost:4000` en `api/.env`. Usa valores distintos para `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.

### Arrancar y comprobar

Estos comandos son iguales en Linux, macOS y PowerShell. Ejecútalos desde la raíz.

```sh
docker compose config --services
docker compose up -d --build
docker compose ps
docker compose logs --tail=30 app api
```

Abre [http://localhost:4000](http://localhost:4000). Si trabajas por SSH en VS Code, reenvía 4000 para la web y 3003 para la API a los mismos puertos en tu equipo.

### Primer acceso

Con la API arrancada y el esquema inicializado, el comando de arranque inicial crea un administrador si aún no existe uno. Ejecuta el comando fuera de la grabación para mantener privada la contraseña generada.

```sh
docker compose exec api pnpm db:bootstrap
```

### Configurar el chat y probarlo como alumno

1. Ve a **Administración → Configuración → Inteligencia artificial → Texto**. Para reproducir la prueba con Gemini, usa el endpoint compatible con OpenAI que se indica abajo y una clave de Google AI Studio. En la prueba del curso se usó `gemini-3.1-flash-lite`.

```text
https://generativelanguage.googleapis.com/v1beta/openai/
```

2. Guarda los cambios. En **Administración → Cuentas**, comprueba que aparezca la cuenta de alumno que uses para la prueba.
3. Entra con esa cuenta, abre el asistente y compara la respuesta con las clases del panel del alumno.

```text
¿Cuántas clases tengo?
```

### Prompts de la guía para copiar

```text
Despliega la aplicación en local y configura las variables del entorno de desarrollo. Verifica que la web y la API están accesibles.
```

```text
Crea una cuenta local de prueba con rol de alumno. Indícame cómo acceder para comprobar el primer inicio de sesión.
```$md$,
      $md$- [Repositorio ITAKAI](https://github.com/itakai-es/platform)
- [Docker Compose de la revisión del vídeo](https://github.com/itakai-es/platform/blob/57e0fef/docker-compose.yml)
- [Plantilla de entorno de la raíz](https://github.com/itakai-es/platform/blob/57e0fef/.env.example)
- [Plantilla de entorno de la API](https://github.com/itakai-es/platform/blob/57e0fef/api/.env.example)
- [Google AI Studio](https://aistudio.google.com/)$md$
    ),
    (
      'onboarding-del-profesor', 6, 'Implementar el onboarding del profesor',
      'Sigue una funcionalidad real desde la especificación con BMAD hasta las pruebas del asistente de registro y la revisión de la PR en GitHub.',
      1191, $md$### Del encargo a la especificación

1. Localiza el registro del profesor, el primer acceso y dónde se guarda su perfil.
2. Abre Codex con el proyecto y pega el prompt que se escribe en el vídeo.

```text
$bmad-spec Queremos desarrollar un wizard para los profesores cuando se registren para pedir campos como colegio, experiencia, etc.
```

3. Concreta las preguntas del asistente, el catálogo de centros, la vista de administración y cómo retomar un registro pendiente.
4. Revisa `_bmad-output/specs/spec-registro-docente/SPEC.md` antes de implementar.

### Prompts de práctica de la guía

**Análisis**

```text
Localiza el registro, los roles, el perfil del profesor y el primer acceso. Indica los archivos y cómo se persiste el estado actual.
```

**Plan**

```text
Propón tareas pequeñas para detectar al profesor nuevo, mostrar el wizard, validar, guardar y marcar el onboarding como completado. Añade un criterio de aceptación por tarea.
```

**Implementación**

```text
Implementa la primera tarea acordada siguiendo las convenciones del proyecto. Resume los archivos que cambian y cómo probarla.
```

**Validación**

```text
Prueba el recorrido con un profesor nuevo, un profesor que ya terminó y un alumno. Comprueba qué ocurre con datos incompletos y después de recargar la página.
```

### Recorrer el asistente y revisar la PR

- **12:23**. Entra con la cuenta docente de pruebas, busca un centro y completa el cuestionario hasta llegar al panel.
- **14:34**. Abre **Mi perfil** y verifica los datos guardados.
- **15:18**. Busca al docente desde **Administración** y comprueba los filtros por centro en **Analítica del sistema**.
- **17:13**. Comprueba que la instancia de desarrollo usa otro puerto y su propia configuración.
- **17:41**. Sube la rama y abre una PR para que el equipo revise los cambios.
- **18:31**. Revisa el resumen, el commit y los archivos de la PR.

### Comandos de revisión

Los mismos comandos funcionan en Linux, macOS y PowerShell. Actualiza la referencia local de `origin/main` si necesitas compararla con su versión más reciente.

```sh
git status --short
git branch --show-current
git log -1 --oneline
git diff --stat origin/main...HEAD
git diff
```$md$,
      $md$- [Repositorio de ITAKAI](https://github.com/itakai-es/platform)
- [PR de onboarding que se revisa en el vídeo](https://github.com/itakai-es/platform/pull/20)
- [BMAD-METHOD](https://docs.bmad-method.org/)
- [Playwright](https://playwright.dev/docs/intro)
- [Revisión de cambios con Git](https://git-scm.com/docs/git-diff)$md$
    )
), lesson_media AS (
  SELECT lessons.*,
    rtrim(:'base', '/') || '/help-media/desarrollo__' || slug || '/' AS media,
    CASE WHEN slug = 'onboarding-del-profesor' THEN 'guia-de-la-leccion.txt' ELSE 'diapositivas.pdf' END AS material,
    CASE WHEN slug = 'onboarding-del-profesor' THEN 'Descargar guía de la lección (TXT)' ELSE 'Descargar diapositivas (PDF)' END AS material_label
  FROM lessons
)
INSERT INTO help_articles (
  id, category_id, slug, title, summary, cover_image, body, locale, status, order_index,
  audience, kind, video_url, video_duration_seconds, published_at, updated_at
)
SELECT
  gen_random_uuid()::text, category.id, lesson.slug, lesson.title, lesson.summary,
  lesson.media || 'desarrollo__' || lesson.slug || '-portada.webp',
  lesson.summary || E'\n\n## Material de la lección\n\n'
    || '- [' || lesson.material_label || '](' || lesson.media || lesson.material || E')\n\n'
    || E'## Pasos del vídeo\n\n' || lesson.steps
    || E'\n\n## Enlaces de interés\n\n' || lesson.links,
  'es', 'publicado', lesson.position, 'ambos', 'video',
  lesson.media || 'desarrollo__' || lesson.slug || '.mp4',
  lesson.duration, now(), now()
FROM lesson_media lesson
CROSS JOIN help_categories category
WHERE category.slug = 'desarrollo'
  AND lesson.position >= :from_lesson
ON CONFLICT (category_id, slug, locale) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  cover_image = EXCLUDED.cover_image,
  body = EXCLUDED.body,
  status = EXCLUDED.status,
  order_index = EXCLUDED.order_index,
  audience = EXCLUDED.audience,
  kind = EXCLUDED.kind,
  video_url = EXCLUDED.video_url,
  video_duration_seconds = EXCLUDED.video_duration_seconds,
  published_at = COALESCE(help_articles.published_at, EXCLUDED.published_at),
  updated_at = now();

COMMIT;
