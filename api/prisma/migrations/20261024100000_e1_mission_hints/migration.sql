-- Pistas en las misiones (E1): las pistas de cada misión, en el orden que fija
-- el profesorado y con su coste (monedas, XP o un % de lo que la misión aún tiene
-- que pagar), y cada uso que hace un estudiante, con lo que le costó entonces.
-- En el progreso de cada enigma queda además el % que restaban sus pistas al
-- aprobarlo, para que subir luego la recompensa no devuelva el descuento.
--
-- Solo añade dos tablas, sus índices y claves, y una columna con valor por
-- defecto 0; no cambia ninguna fila. La pista cuelga de la misión en cascada; el
-- uso, de la misión y de la cuenta en cascada, y de la pista sin cascada: la
-- base no deja borrar una pista que alguien ha usado. Al borrar la misión o la
-- clase los usos se van con ella, porque esa clave se comprueba al final de la
-- sentencia.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "student_enigma_progress" ADD COLUMN "hint_penalty" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "mission_hints" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "cost_type" TEXT NOT NULL DEFAULT 'coins',
    "cost" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_hint_uses" (
    "id" TEXT NOT NULL,
    "hint_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "cost_type" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_hint_uses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_hints_mission_id_order_index_idx" ON "mission_hints"("mission_id", "order_index");

-- CreateIndex
CREATE INDEX "mission_hint_uses_mission_id_student_id_idx" ON "mission_hint_uses"("mission_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_hint_uses_hint_id_student_id_key" ON "mission_hint_uses"("hint_id", "student_id");

-- AddForeignKey
ALTER TABLE "mission_hints" ADD CONSTRAINT "mission_hints_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_hint_uses" ADD CONSTRAINT "mission_hint_uses_hint_id_fkey" FOREIGN KEY ("hint_id") REFERENCES "mission_hints"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_hint_uses" ADD CONSTRAINT "mission_hint_uses_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_hint_uses" ADD CONSTRAINT "mission_hint_uses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
