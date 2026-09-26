-- Firma de las entradas del blog: texto libre, opcional, sin relación con
-- ninguna cuenta. Solo la enseña el blog; en la ayuda se queda vacía.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.
ALTER TABLE "help_articles" ADD COLUMN "author_name" TEXT;
