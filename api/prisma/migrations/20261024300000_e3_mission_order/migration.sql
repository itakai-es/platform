-- E3, entrega 1: el orden de la progresión. Cada misión guarda su posición
-- dentro de su clase (desde 0), la que fija el profesorado al ordenarlas; a
-- igualdad, la más antigua primero. Es la columna que existió hasta febrero
-- (20260202000001), ahora con índice por clase.
--
-- El relleno respeta lo que había: en cada clase, por orden de creación, de la
-- más antigua a la más reciente (y por id si dos se crearon a la vez). No cambia
-- nada más.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "missions" ADD COLUMN "order_index" INTEGER NOT NULL DEFAULT 0;

-- Relleno: posición por clase en el orden de creación
UPDATE "missions" m
SET "order_index" = o."position"
FROM (
  SELECT "id", (ROW_NUMBER() OVER (PARTITION BY "class_id" ORDER BY "created_at", "id") - 1)::integer AS "position"
  FROM "missions"
) o
WHERE m."id" = o."id";

-- CreateIndex
CREATE INDEX "missions_class_id_order_index_idx" ON "missions"("class_id", "order_index");
