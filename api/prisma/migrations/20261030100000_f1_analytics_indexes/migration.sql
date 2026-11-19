-- F1, entrega 1: los índices que faltan para calcular la analítica en vivo, y
-- una sola entrega pendiente por enigma y estudiante.
--
-- Hasta aquí, `enigma_submissions` no tenía más índice que la clave primaria:
-- cada entrega (la comprobación de «ya tienes una pendiente»), el recuento de
-- pendientes de la clase y el «en curso» del camino recorrían la tabla de toda
-- la instancia. Lo mismo les pasaba a los enigmas, al progreso y a los
-- documentos de una misión, que no tenían índice por misión ni por enigma, y a
-- las conversaciones y los mensajes del asistente por su clave ajena. Con estos
-- índices, todo lo de una clase llega por índice y se agrupa en SQL (ver
-- src/modules/analytics/).
--
-- No cambia ninguna fila. El índice por clase de los comportamientos se
-- sustituye por el de clase y fecha, que sirve igual para lo que buscaba el
-- otro (empieza por la clase) y además ordena por fecha.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan. El
-- índice único parcial del final tampoco lo modela Prisma (vive solo aquí, con
-- una nota en el esquema), pero no lo ve como deriva: `migrate diff` no propone
-- borrarlo.

-- Una sola entrega pendiente por enigma y estudiante: es la regla de
-- `submitEnigma` (ver submissions.service.ts), que hasta ahora solo se miraba
-- antes de escribir, así que dos entregas a la vez (un doble clic) dejaban dos.
-- Si ya hay alguna repetida, la migración se para y dice cuáles son: no se
-- pueden borrar solas porque son del estudiante, y hay que decidir a mano con
-- cuál se queda (la otra se borra) antes de volver a lanzarla. Para verlo antes
-- de migrar:
--   SELECT student_id, enigma_id, count(*) FROM enigma_submissions
--    WHERE status = 'pendiente' GROUP BY 1, 2 HAVING count(*) > 1;
DO $$
DECLARE
  repeated text;
BEGIN
  SELECT string_agg(pair, '; ')
    INTO repeated
    FROM (
      SELECT format('estudiante %s, enigma %s: %s', "student_id", "enigma_id", count(*)) AS pair
        FROM "enigma_submissions"
       WHERE "status" = 'pendiente'
       GROUP BY "student_id", "enigma_id"
      HAVING count(*) > 1
    ) AS dup;

  IF repeated IS NOT NULL THEN
    RAISE EXCEPTION 'Hay entregas pendientes repetidas del mismo enigma y estudiante (%). Decide con cual se queda cada una y borra las demas antes de aplicar esta migracion.', repeated;
  END IF;
END
$$;

-- CreateIndex
CREATE INDEX "enigma_submissions_enigma_id_status_idx" ON "enigma_submissions"("enigma_id", "status");

-- CreateIndex
CREATE INDEX "enigma_submissions_student_id_enigma_id_idx" ON "enigma_submissions"("student_id", "enigma_id");

-- Único parcial: solo entre las pendientes (las aprobadas pueden ser varias).
CREATE UNIQUE INDEX "enigma_submissions_one_pending_key" ON "enigma_submissions"("student_id", "enigma_id") WHERE "status" = 'pendiente';

-- CreateIndex
CREATE INDEX "mission_enigmas_mission_id_order_index_idx" ON "mission_enigmas"("mission_id", "order_index");

-- CreateIndex
CREATE INDEX "student_mission_progress_mission_id_idx" ON "student_mission_progress"("mission_id");

-- CreateIndex
CREATE INDEX "student_enigma_progress_enigma_id_idx" ON "student_enigma_progress"("enigma_id");

-- CreateIndex
CREATE INDEX "mission_documents_mission_id_idx" ON "mission_documents"("mission_id");

-- CreateIndex
CREATE INDEX "chat_conversations_user_id_idx" ON "chat_conversations"("user_id");

-- CreateIndex
CREATE INDEX "chat_conversations_mission_id_idx" ON "chat_conversations"("mission_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- El de clase y fecha sustituye al de solo clase.
DROP INDEX "behavior_applications_class_id_idx";

-- CreateIndex
CREATE INDEX "behavior_applications_class_id_created_at_idx" ON "behavior_applications"("class_id", "created_at");
