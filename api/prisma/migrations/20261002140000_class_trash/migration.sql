-- Papelera de clases: cuándo se envió una clase a la papelera y quién lo hizo.
--
-- Solo añade dos columnas nulas y su referencia; no toca ninguna fila. Una
-- clase con `deleted_at` está en la papelera: sale de todos los listados y, a
-- los 30 días, la purga la borra de verdad. Si se borra la cuenta de quien la
-- envió, la clase sigue en la papelera sin autor.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
