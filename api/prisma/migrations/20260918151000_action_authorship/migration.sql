-- Autoría de lo que el profesorado hace sobre el alumnado.
--
-- Solo añade columnas nulas e índices, y cambia qué pasa con tres referencias
-- a una cuenta cuando esa cuenta se borra. No borra ni reescribe filas.
--
-- - `enigma_submissions.reviewed_by_id`: quién aprobó la entrega.
-- - `activities.actor_id` y `actor_name`: quién hizo lo que cuenta la entrada
--   del feed del alumno (aprobar, aplicar un comportamiento), con el nombre
--   copiado. Y los índices por alumno y por clase, que la tabla no tenía.
-- - `behavior_applications.teacher_id` pasa a admitir null: al borrar la cuenta
--   del profesor la aplicación se conserva sin autor, en vez de borrarse.
-- - `badges.teacher_id` deja de quedarse en null al borrar al autor: una
--   insignia sin autor es del sistema y la verían todos. Ahora la base impide
--   ese borrado y la aplicación pasa antes las insignias a quien corresponda.

-- AlterTable
ALTER TABLE "enigma_submissions" ADD COLUMN "reviewed_by_id" TEXT;

-- AlterTable
ALTER TABLE "activities" ADD COLUMN "actor_id" TEXT,
ADD COLUMN "actor_name" TEXT;

-- AlterTable
ALTER TABLE "behavior_applications" ALTER COLUMN "teacher_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "activities_user_id_created_at_idx" ON "activities"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_class_id_created_at_idx" ON "activities"("class_id", "created_at");

-- AddForeignKey
ALTER TABLE "enigma_submissions" ADD CONSTRAINT "enigma_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "behavior_applications" DROP CONSTRAINT "behavior_applications_teacher_id_fkey";

-- AddForeignKey
ALTER TABLE "behavior_applications" ADD CONSTRAINT "behavior_applications_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "badges" DROP CONSTRAINT "badges_teacher_id_fkey";

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
