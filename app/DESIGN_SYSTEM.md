# ITAKAI - Sistema de Diseño

**Fecha:** 2026-11-10
**Versión:** 2.0.0 (Reestructurado)
**Estado:** ✅ Listo para implementar diseños del diseñador

---

## 🎯 Resumen Ejecutivo

El proyecto ha sido completamente reestructurado con un sistema de diseño **centralizado y escalable**. Ahora puedes cambiar TODOS los colores, tipografía y estilos desde **UN SOLO LUGAR** y se aplicará automáticamente en toda la aplicación.

**IMPORTANTE:** Este sistema está configurado para **Light Mode** y es **genérico** (sin personalización por rol).

---

## 📁 Estructura del Sistema

```
/
├── app/
│   ├── assets/css/
│   │   └── tailwind.css           ← 🔥 MODIFICAR AQUÍ: Variables CSS principales
│   ├── utils/
│   │   └── designTokens.ts        ← Variables exportables para TypeScript
│   ├── composables/
│   │   └── useDesignSystem.ts     ← Helpers para acceder al sistema
│   └── components/
│       ├── atoms/                  ← Componentes base (Button, Input, Badge, etc.)
│       ├── molecules/              ← Componentes compuestos (Card, FormField, etc.)
│       └── organisms/              ← Componentes complejos (Navbar, Sidebar, etc.)
├── tailwind.config.ts              ← Configuración de Tailwind (apunta a variables CSS)
└── nuxt.config.ts                  ← Configuración de Nuxt
```

---

## 🎨 Cómo Cambiar el Diseño Completo

### Paso 1: Actualizar Variables CSS

**Archivo:** `app/assets/css/tailwind.css`

Busca la sección `:root` y modifica los valores:

```css
@layer base {
  :root {
    /* ========================================
       COLORES - Cambia estos valores
       ======================================== */

    /* Backgrounds */
    --color-bg-primary: #FFFFFF;        /* ← Fondo principal */
    --color-bg-secondary: #F8F9FA;      /* ← Fondo secundario */
    --color-bg-tertiary: #F1F3F5;       /* ← Fondo terciario */

    /* Text */
    --color-text-primary: #212529;      /* ← Texto principal */
    --color-text-secondary: #495057;    /* ← Texto secundario */
    --color-text-tertiary: #6C757D;     /* ← Texto terciario */
    --color-text-muted: #ADB5BD;        /* ← Texto apagado/placeholder */
    --color-text-inverse: #FFFFFF;      /* ← Texto sobre fondos oscuros */

    /* Brand Colors - REEMPLAZA CON TUS COLORES */
    --color-primary: #7C3AED;           /* ← Color principal */
    --color-primary-hover: #6D28D9;     /* ← Hover del principal */
    --color-primary-active: #5B21B6;    /* ← Active del principal */
    --color-primary-light: #EDE9FE;     /* ← Background claro del principal */

    --color-secondary: #10B981;         /* ← Color secundario */
    --color-secondary-hover: #059669;
    --color-secondary-active: #047857;
    --color-secondary-light: #D1FAE5;

    --color-accent: #F59E0B;            /* ← Color de acento */
    --color-accent-hover: #D97706;
    --color-accent-active: #B45309;
    --color-accent-light: #FEF3C7;

    /* Semantic Colors */
    --color-success: #10B981;           /* ← Success/correcto */
    --color-warning: #F59E0B;           /* ← Warning/advertencia */
    --color-error: #EF4444;             /* ← Error/peligro */
    --color-info: #3B82F6;              /* ← Info/información */

    /* Borders */
    --color-border-primary: #E5E7EB;    /* ← Bordes principales */
    --color-border-secondary: #D1D5DB;
    --color-border-tertiary: #9CA3AF;

    /* ========================================
       TIPOGRAFÍA - Cambia fuentes y tamaños
       ======================================== */

    /* Fuentes */
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Courier New', monospace;
    --font-display: 'Inter', system-ui, sans-serif;

    /* Tamaños de fuente */
    --text-xs: 0.75rem;      /* 12px */
    --text-sm: 0.875rem;     /* 14px */
    --text-base: 1rem;       /* 16px - base */
    --text-lg: 1.125rem;     /* 18px */
    --text-xl: 1.25rem;      /* 20px */
    --text-2xl: 1.5rem;      /* 24px */
    --text-3xl: 1.875rem;    /* 30px */
    --text-4xl: 2.25rem;     /* 36px */
    --text-5xl: 3rem;        /* 48px */

    /* ========================================
       BORDER RADIUS - Cambia redondez
       ======================================== */

    --radius-none: 0;
    --radius-sm: 0.375rem;   /* 6px */
    --radius-md: 0.5rem;     /* 8px */
    --radius-lg: 0.75rem;    /* 12px */
    --radius-xl: 1rem;       /* 16px */
    --radius-2xl: 1.5rem;    /* 24px */
    --radius-full: 9999px;   /* Círculo completo */

    /* ========================================
       SHADOWS - Cambia sombras
       ======================================== */

    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

    /* ========================================
       SPACING - Cambia espaciado
       ======================================== */

    --spacing-xs: 0.25rem;   /* 4px */
    --spacing-sm: 0.5rem;    /* 8px */
    --spacing-md: 1rem;      /* 16px */
    --spacing-lg: 1.5rem;    /* 24px */
    --spacing-xl: 2rem;      /* 32px */
    --spacing-2xl: 3rem;     /* 48px */
    --spacing-3xl: 4rem;     /* 64px */
  }
}
```

### Paso 2: Actualizar Fuentes (Opcional)

**Si cambias las fuentes, actualiza también:**

**Archivo:** `app/app.vue`

```typescript
useHead({
  link: [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: '',
    },
    {
      rel: 'stylesheet',
      // Cambia esta URL por la de tus fuentes
      href: 'https://fonts.googleapis.com/css2?family=TU_FUENTE_AQUI',
    },
  ],
})
```

### Paso 3: (Opcional) Actualizar TypeScript Tokens

**Archivo:** `app/utils/designTokens.ts`

Si quieres acceder a los colores desde JavaScript/TypeScript, actualiza también este archivo para que coincida con tus CSS variables.

---

## 🔧 Uso de Clases de Tailwind

Gracias a la reestructuración, ahora puedes usar clases semánticas en todo el proyecto:

### Colores

```vue
<!-- Backgrounds -->
<div class="bg-primary">        <!-- Fondo color principal -->
<div class="bg-secondary">      <!-- Fondo color secundario -->
<div class="bg-surface">        <!-- Fondo de cards/contenedores -->
<div class="bg-bg-primary">     <!-- Fondo de página -->

<!-- Textos -->
<p class="text-primary">        <!-- Texto color principal -->
<p class="text-text-primary">   <!-- Texto principal de página -->
<p class="text-text-secondary"> <!-- Texto secundario -->
<p class="text-text-muted">     <!-- Texto apagado/hints -->

<!-- Bordes -->
<div class="border-primary">        <!-- Border color principal -->
<div class="border-border-primary"> <!-- Border estándar -->

<!-- Semantic -->
<div class="bg-success">        <!-- Success/correcto -->
<div class="bg-warning">        <!-- Warning/advertencia -->
<div class="bg-error">          <!-- Error/peligro -->
<div class="bg-info">           <!-- Info/información -->
```

### Tipografía

```vue
<!-- Tamaños -->
<p class="text-xs">   <!-- 12px -->
<p class="text-sm">   <!-- 14px -->
<p class="text-base"> <!-- 16px - por defecto -->
<p class="text-lg">   <!-- 18px -->
<p class="text-xl">   <!-- 20px -->

<!-- Pesos -->
<p class="font-normal">    <!-- 400 -->
<p class="font-medium">    <!-- 500 -->
<p class="font-semibold">  <!-- 600 -->
<p class="font-bold">      <!-- 700 -->
```

### Border Radius

```vue
<div class="rounded-sm">   <!-- 6px -->
<div class="rounded-md">   <!-- 8px -->
<div class="rounded-lg">   <!-- 12px -->
<div class="rounded-xl">   <!-- 16px -->
<div class="rounded-2xl">  <!-- 24px -->
<div class="rounded-full"> <!-- Círculo -->
```

### Shadows

```vue
<div class="shadow-sm">   <!-- Sombra pequeña -->
<div class="shadow-md">   <!-- Sombra mediana -->
<div class="shadow-lg">   <!-- Sombra grande -->
<div class="shadow-xl">   <!-- Sombra extra grande -->
```

---

## 🧩 Componentes Disponibles

### Atoms (Componentes Básicos)

#### Button
```vue
<Button variant="primary">Guardar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="outline">Ver más</Button>
<Button variant="ghost">Cerrar</Button>
<Button variant="danger">Eliminar</Button>

<!-- Tamaños -->
<Button size="sm">Pequeño</Button>
<Button size="md">Mediano</Button>
<Button size="lg">Grande</Button>

<!-- Estados -->
<Button :loading="true">Cargando...</Button>
<Button :disabled="true">Deshabilitado</Button>
```

#### Input
```vue
<Input v-model="value" placeholder="Escribe algo..." />
<Input v-model="email" type="email" :error="hasError" />
<Input v-model="password" type="password" :required="true" />
```

#### Badge
```vue
<Badge variant="primary">Nuevo</Badge>
<Badge variant="success">Completado</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>

<!-- Variantes de raridad (para misiones) -->
<Badge variant="common">Común</Badge>
<Badge variant="rare">Rara</Badge>
<Badge variant="epic">Épica</Badge>
<Badge variant="legendary">Legendaria</Badge>
```

#### ProgressBar
```vue
<ProgressBar :percentage="75" variant="primary" />
<ProgressBar :percentage="50" variant="success" size="lg" />
```

#### Avatar
```vue
<Avatar src="/avatar.jpg" size="md" />
<Avatar username="Juan Pérez" size="lg" />
```

#### Spinner
```vue
<Spinner size="sm" />
<Spinner size="md" class="text-primary" />
```

### Molecules (Componentes Compuestos)

#### Card
```vue
<Card>
  <template #header>
    <h2>Título</h2>
  </template>

  Contenido de la card

  <template #footer>
    <Button>Acción</Button>
  </template>
</Card>

<!-- Variantes -->
<Card variant="default">Normal</Card>
<Card variant="elevated">Con sombra</Card>
<Card variant="outlined">Con borde</Card>

<!-- Hoverable -->
<Card :hoverable="true">Click me</Card>
```

#### FormField
```vue
<FormField
  v-model="email"
  label="Correo electrónico"
  type="email"
  placeholder="tu@email.com"
  :required="true"
  :error-message="emailError"
  hint="Usa tu correo institucional"
/>
```

#### StatTile
```vue
<!-- Una cifra con su etiqueta (<dl>: el lector dice «Misiones de media: 3 de 8») -->
<StatTile :label="t('…avg_missions')" :value="3" :total="8">
  <template #detail>Media de la clase: 35 %</template>
</StatTile>
```

Los gráficos de analítica (`ChartFigure`, `StackedBar`, `ActivityColumns`,
`CompareMeter`, `ChartLegend`, `ChartTable`, `SignalList`) documentan su uso en la
cabecera de cada componente. Los estados de una misión (`chart-status.ts`) van con
trama e icono además del color: de la API llegan con `countsFromSegments`, y la
leyenda enseña solo los que se usan (`statusesInUse`). Las filas de cifras, con
`CardGrid cols="tiles"`, que no deja tarjetas descolgadas.

Para que los paneles no se vean planos, las mismas piezas que el mapa de misiones,
cada una en un solo sitio:

- `ProgressRing`: el anillo de progreso (SVG en un `viewBox` de 100, tamaño en rem,
  color de token). Lleva la cifra dentro (`StatTile` con `ring`), los enigmas
  aprobados de cada misión, el nivel alrededor de un avatar y el anillo de los
  medallones del mapa. Se llena al aparecer, salvo con «Reducir movimiento».
- `LevelAvatar`: el avatar dentro del anillo de su nivel (`ClassXPBar`, la página
  del estudiante). El nivel y la XP van siempre escritos al lado.
- `IconCircle`: un icono en blanco en un círculo macizo (azul marino o morado
  oscuro de marca): el `symbol` de `StatTile`, el motivo de cada señal y los puntos
  de la línea de tiempo (`RecentActivityCard` con `variant="timeline"`).
- `MissionCover`: la portada de una misión en su medallón, con el aro de su rareza
  (el del mapa). La rareza, si importa, va escrita al lado.
- `AvatarStack`: avatares unos sobre otros y «+N» (quién ha completado una misión).

Las geometrías están en `utils/progress-ring.ts`, `avatarStack` (`utils/avatar.ts`)
y `stackedColumns` (`utils/chart-scale.ts`), con sus pruebas en `tests/`. Las
columnas de actividad (`ActivityColumns`) se apilan por tipo con `parts`, cada uno
con su relleno y su trama (`ChartFill` con `series`). Las barras y las columnas
crecen al aparecer con `chart-grow-x` y `chart-grow-y`, solo si no se ha pedido
menos movimiento (`useReducedMotion`).

Lo que ve el alumnado de sí mismo usa las mismas piezas: `MissionResultRow` con
`variant="student"` (su vocabulario, en neutro y sin media) y `ClassCompareCard`
(«Tú y tu clase», con `CompareMeter`). No calculan nada: la media redondeada y la
banda llegan hechas de la API (`api/src/utils/anonymous-stats.ts`), que es donde se
garantiza la anonimidad.

---

## 🎯 Composables Disponibles

### useDesignSystem()

Accede al sistema de diseño desde JavaScript/TypeScript:

```vue
<script setup lang="ts">
const { colors, spacing, typography } = useDesignSystem()

// Usar en computed, methods, etc.
const buttonColor = colors.primary.default
const cardPadding = spacing.md

// Helpers
const primaryColor = getColor('primary.default')
const mediumSpacing = getSpacing('md')
const primaryWithOpacity = withOpacity('#7C3AED', 0.5)
</script>
```

### useTailwindClasses()

Genera clases de Tailwind dinámicamente:

```vue
<script setup lang="ts">
const { getButtonClasses, getCardClasses, getInputClasses, getBadgeClasses } = useTailwindClasses()

const buttonClass = getButtonClasses('primary', 'md')
const cardClass = getCardClasses('hover', 'lg')
</script>
```

---

## 📦 Assets del Diseñador

Cuando traigas los diseños del diseñador, guárdalos en:

```
/app/assets/
├── images/              ← Imágenes
│   ├── logo.svg
│   ├── hero-bg.jpg
│   └── icons/
├── fonts/               ← Fuentes custom (si no usas Google Fonts)
│   ├── MiFuente-Regular.woff2
│   └── MiFuente-Bold.woff2
└── css/
    └── tailwind.css     ← Aquí están las variables
```

---

## ✅ Testing

Después de cambiar los colores/diseño, verifica que todo funciona:

```bash
# Ver la app en desarrollo
docker logs itakai-frontend --tail 100 -f

# Acceder a la app
# http://localhost:4000

# Ejecutar tests E2E (opcional)
docker exec itakai-frontend npm run test:e2e
```

---

## 🚀 Flujo de Trabajo Recomendado

1. **Recibe los mockups del diseñador**
   - Extrae colores primarios, secundarios, etc.
   - Identifica la tipografía
   - Nota los border-radius y sombras

2. **Actualiza `app/assets/css/tailwind.css`**
   - Reemplaza las CSS variables con tus colores
   - Actualiza fuentes si es necesario
   - Ajusta border-radius y shadows

3. **Carga fuentes en `app/app.vue`** (si cambias tipografía)

4. **Verifica en el navegador**
   - Visita http://localhost:4000
   - Los cambios se aplican AUTOMÁTICAMENTE en toda la app

5. **Ajusta componentes individuales** (solo si es necesario)
   - La mayoría ya usarán el nuevo diseño automáticamente
   - Solo modifica componentes específicos si el diseñador tiene variaciones únicas

---

## 📚 Archivos Clave

| Archivo | Propósito | Modificar |
|---------|-----------|-----------|
| `app/assets/css/tailwind.css` | **Variables CSS principales** | ✅ SÍ - Aquí van tus colores |
| `tailwind.config.ts` | Configuración de Tailwind | ❌ NO - Ya apunta a las variables |
| `app/utils/designTokens.ts` | Tokens para TypeScript | 🟡 OPCIONAL - Si usas colores en JS |
| `app/app.vue` | Carga de fuentes | 🟡 SOLO SI cambias tipografía |
| `app/components/atoms/*` | Componentes base | ❌ NO - Ya están genéricos |

---

## 🎨 Ejemplo: Implementar Diseños de Duolingo/Kahoot

Si tus diseños son tipo Duolingo/Kahoot, podrías usar colores como:

```css
:root {
  /* Duolingo-style colors */
  --color-primary: #58CC02;        /* Verde Duolingo */
  --color-primary-hover: #4CAF00;
  --color-primary-light: #E8F5E9;

  --color-secondary: #1CB0F6;      /* Azul */
  --color-accent: #FF9600;         /* Naranja */

  --color-success: #58CC02;
  --color-warning: #FFC800;
  --color-error: #FF4B4B;

  /* Fuentes más lúdicas */
  --font-sans: 'Nunito', 'Poppins', system-ui, sans-serif;

  /* Border radius más redondeados */
  --radius-md: 1rem;      /* 16px */
  --radius-lg: 1.5rem;    /* 24px */
  --radius-xl: 2rem;      /* 32px */
}
```

Y cargar las fuentes en `app.vue`:

```typescript
href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap'
```

---

## 🔗 Referencias

- [Tailwind CSS - Variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
- [Nuxt 4 - Assets](https://nuxt.com/docs/getting-started/assets)
- [Google Fonts](https://fonts.google.com/)

---

**Última actualización:** 2026-11-10
**Autor:** Sistema automatizado Claude
**Versión:** 2.0.0
