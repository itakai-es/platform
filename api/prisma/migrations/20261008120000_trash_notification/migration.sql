-- Aviso de cortesía de la papelera de clases: a quien tiene la propiedad de una
-- clase en la papelera le llega unos días antes de que se borre para siempre.
-- Va sola en esta migración: un valor nuevo de un enum no se puede usar en la
-- misma transacción que lo añade.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'class_purge_soon';
