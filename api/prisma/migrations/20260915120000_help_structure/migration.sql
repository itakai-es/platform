-- Estructura del centro de ayuda: audiencia, tipo, área y
-- vídeo. Enums nuevos (CREATE TYPE + DEFAULT), así que todo va en una
-- transacción sin las limitaciones de ALTER TYPE ... ADD VALUE.

-- CreateEnum
CREATE TYPE "HelpAudience" AS ENUM ('profesor', 'alumno', 'ambos');

-- CreateEnum
CREATE TYPE "HelpArticleKind" AS ENUM ('guia', 'tutorial', 'faq', 'video');

-- CreateEnum
CREATE TYPE "HelpArea" AS ENUM ('ayuda', 'blog');

-- AlterTable
ALTER TABLE "help_articles" ADD COLUMN     "audience" "HelpAudience" NOT NULL DEFAULT 'profesor',
ADD COLUMN     "kind" "HelpArticleKind" NOT NULL DEFAULT 'guia',
ADD COLUMN     "video_url" TEXT;

-- AlterTable
ALTER TABLE "help_categories" ADD COLUMN     "area" "HelpArea" NOT NULL DEFAULT 'ayuda',
ALTER COLUMN "accent" SET DEFAULT 'stats';

-- CreateIndex
CREATE INDEX "help_categories_area_order_index_idx" ON "help_categories"("area", "order_index");

-- Acentos: la tarjeta de categoría solo entiende ia, stats, clases y pending. El
-- DEFAULT antiguo ('purple') no era ninguno de ellos; lo que quede fuera pasa a stats.
-- Pisa una columna editable a propósito: esos valores no se pueden pintar.
UPDATE "help_categories" SET "accent" = 'stats'
WHERE "accent" NOT IN ('ia', 'stats', 'clases', 'pending');

-- Etiquetado del contenido de serie. Los ids son gen_random_uuid() por instancia:
-- SIEMPRE por slug de categoría + slug de artículo. Los DEFAULT ya dejan los 40 en
-- profesor / guia / ayuda; solo se corrige lo que se aparta. Todo editable en el panel.

-- Audiencia: `si-eres-alumno` habla al alumno. `alumnado` («Cómo lo ve el alumno y
-- cómo se gestiona») está escrita para el docente y se queda con el DEFAULT.
UPDATE "help_articles" a SET "audience" = 'alumno'
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = 'si-eres-alumno';

-- Audiencia: lo que sirve igual a docentes y a alumnado (cuenta y problemas de acceso).
UPDATE "help_articles" a SET "audience" = 'ambos'
FROM (VALUES
  ('tu-cuenta',         'accesibilidad'),
  ('tu-cuenta',         'avisos-y-recordatorios'),
  ('tu-cuenta',         'seguridad-de-tu-cuenta'),
  ('cuando-algo-falla', 'no-puedo-entrar-en-mi-cuenta'),
  ('cuando-algo-falla', 'no-puedo-subir-un-archivo')
) AS v(category_slug, slug)
JOIN "help_categories" c ON c."slug" = v.category_slug
WHERE a."category_id" = c."id" AND a."slug" = v.slug;

-- Destacados del alumnado: la portada del alumno necesita los suyos. `featured` ya
-- se editaba en el panel, así que es solo un valor inicial: si el alumnado ya tiene
-- algún destacado, alguien lo ha elegido y no se toca.
UPDATE "help_articles" a SET "featured" = true
FROM (VALUES
  ('si-eres-alumno', 'como-entro-en-mi-clase'),
  ('si-eres-alumno', 'como-entrego-una-mision')
) AS v(category_slug, slug)
JOIN "help_categories" c ON c."slug" = v.category_slug
WHERE a."category_id" = c."id" AND a."slug" = v.slug
  AND NOT EXISTS (
    SELECT 1 FROM "help_articles" x
    JOIN "help_categories" xc ON xc."id" = x."category_id"
    WHERE xc."slug" = 'si-eres-alumno' AND x."featured"
  );
