-- Plantillas recomendadas: cuándo marcó la administración una plantilla como
-- recomendada y quién lo hizo.
--
-- Solo añade dos columnas nulas y su referencia; no toca ninguna fila. Una
-- clase con `recommended_at` es una plantilla recomendada: sale primero en los
-- catálogos con su distintivo. Retirarla del catálogo o enviarla a la papelera
-- le quita la marca. Si se borra la cuenta de quien la marcó, sigue
-- recomendada sin autor.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "recommended_at" TIMESTAMP(3),
ADD COLUMN "recommended_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_recommended_by_id_fkey" FOREIGN KEY ("recommended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
