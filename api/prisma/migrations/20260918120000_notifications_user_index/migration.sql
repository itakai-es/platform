-- Los avisos se consultan siempre por destinatario (la lista, el recuento de no
-- leídos y el marcado como leídos), y la tabla no tenía más índice que su clave.

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
