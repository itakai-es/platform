-- Pistas en las misiones (E1): usar una pista es una acción del estudiante y va a
-- su muro de actividad, como una compra en la tienda. Un valor nuevo del tipo,
-- solo, en su propia migración (ADD VALUE no se puede usar en la misma
-- transacción que lo añade).

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'hint_used';
