-- Maná en los comportamientos: cuánto da (o quita) la plantilla y cuánto movió
-- cada aplicación. Hasta ahora un comportamiento solo podía tocar XP, monedas y
-- vidas, aunque los ajustes dejaban activar comportamientos con solo maná.
--
-- Solo añade dos columnas con valor por defecto 0; no cambia ninguna fila.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "behavior_templates" ADD COLUMN "mana_delta" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "behavior_applications" ADD COLUMN "mana_delta" INTEGER NOT NULL DEFAULT 0;
