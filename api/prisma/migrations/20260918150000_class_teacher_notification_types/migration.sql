-- Avisos al profesorado de una clase: le añaden, le cambian el perfil o el
-- nivel, le quitan o recibe la propiedad. Van solos en esta migración: un valor
-- nuevo de un enum no se puede usar en la misma transacción que lo añade.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'class_teacher_added';
ALTER TYPE "NotificationType" ADD VALUE 'class_teacher_changed';
ALTER TYPE "NotificationType" ADD VALUE 'class_teacher_removed';
ALTER TYPE "NotificationType" ADD VALUE 'class_ownership_received';
