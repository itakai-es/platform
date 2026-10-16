-- Misiones por equipos, nivel básico: la misión puede decir con qué agrupación
-- de equipos se hace. Es solo informativo; las entregas siguen siendo de cada
-- estudiante.
--
-- Solo añade una columna que admite nulos; si se borra la agrupación, la misión
-- vuelve a ser individual.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "team_set_id" TEXT;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_team_set_id_fkey" FOREIGN KEY ("team_set_id") REFERENCES "team_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
