-- F1: el índice de las insignias por misión. «Mi progreso», el listado de alumnado
-- del profesorado y las fichas buscan las insignias de una misión o de las
-- misiones de una clase (`badges.mission_id`), y sin índice cada consulta recorría
-- la tabla entera de la instancia.
--
-- No cambia ninguna fila. Escrita a mano: `migrate dev` propone además borrar el
-- índice GIN y el valor por defecto de `search_vector` de la ayuda, que Prisma no
-- modela. Aquí no se tocan.

-- CreateIndex
CREATE INDEX "badges_mission_id_idx" ON "badges"("mission_id");
