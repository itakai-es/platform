-- Las invitaciones personales a una clase ya no se crean ni se consultan: con el
-- código de clase se entra directamente. La tabla se queda con lo que tenga, pero
-- sus dos claves hacia `users` no pueden seguir impidiendo que se borre una
-- cuenta: pasan a borrar en cascada, como ya hacían las de `join_requests` y la
-- de la clase de esta misma tabla.
--
-- Solo cambia la regla de borrado: ninguna fila se toca.

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_student_id_fkey";

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
