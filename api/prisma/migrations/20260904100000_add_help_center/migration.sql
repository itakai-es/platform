-- CreateEnum
CREATE TYPE "HelpArticleStatus" AS ENUM ('borrador', 'publicado');

-- CreateTable
CREATE TABLE "help_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "accent" TEXT NOT NULL DEFAULT 'purple',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "help_categories_slug_key" ON "help_categories"("slug");

-- Búsqueda en castellano que además ignora las tildes: quien escribe
-- "configuracion" tiene que encontrar "configuración".
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'itakai_es') THEN
    CREATE TEXT SEARCH CONFIGURATION itakai_es (COPY = spanish);
    ALTER TEXT SEARCH CONFIGURATION itakai_es
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, spanish_stem;
  END IF;
END
$$;

-- CreateTable
CREATE TABLE "help_articles" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "status" "HelpArticleStatus" NOT NULL DEFAULT 'borrador',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "not_helpful" INTEGER NOT NULL DEFAULT 0,
    "search_vector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('itakai_es'::regconfig, coalesce("title", '')), 'A') ||
      setweight(to_tsvector('itakai_es'::regconfig, coalesce("summary", '')), 'B') ||
      setweight(to_tsvector('itakai_es'::regconfig, coalesce("body", '')), 'C')
    ) STORED,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "help_articles_category_id_slug_locale_key" ON "help_articles"("category_id", "slug", "locale");
CREATE INDEX "help_articles_status_locale_idx" ON "help_articles"("status", "locale");
CREATE INDEX "help_articles_category_id_order_index_idx" ON "help_articles"("category_id", "order_index");
CREATE INDEX "help_articles_search_idx" ON "help_articles" USING GIN ("search_vector");

-- AddForeignKey
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "help_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
