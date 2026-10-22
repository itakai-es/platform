-- Papelera de clases: cuándo se avisó a quien tiene la propiedad de que la
-- clase se borra pronto.
--
-- Solo añade una columna nula; no toca ninguna fila. Es lo que impide que el
-- aviso salga dos veces para el mismo envío a la papelera, aunque se borre la
-- notificación: restaurar la clase o volver a enviarla la deja otra vez en null.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "trash_warned_at" TIMESTAMP(3);
