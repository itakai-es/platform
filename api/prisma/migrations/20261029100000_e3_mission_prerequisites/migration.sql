-- E3, entrega 3: dependencias del mapa de misiones. Cada fila dice que, para
-- abrir una misión, hay que completar antes otra de su clase (si son varias,
-- todas). Las reglas (misma clase, sin ciclos, como mucho tres por misión) las
-- hace cumplir el servidor al guardarlas; aquí solo va la que la base puede
-- comprobar sola: una misión no se pide a sí misma.
--
-- Solo añade una tabla, sus índices y sus claves; no cambia ninguna fila. Las
-- dos claves van en cascada: la fila se va con cualquiera de las dos misiones (y
-- con la clase, al purgarla de la papelera).
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- CreateTable
CREATE TABLE "mission_prerequisites" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "required_mission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_prerequisites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mission_prerequisites_not_self" CHECK ("mission_id" <> "required_mission_id")
);

-- CreateIndex
CREATE INDEX "mission_prerequisites_required_mission_id_idx" ON "mission_prerequisites"("required_mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_prerequisites_mission_id_required_mission_id_key" ON "mission_prerequisites"("mission_id", "required_mission_id");

-- AddForeignKey
ALTER TABLE "mission_prerequisites" ADD CONSTRAINT "mission_prerequisites_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_prerequisites" ADD CONSTRAINT "mission_prerequisites_required_mission_id_fkey" FOREIGN KEY ("required_mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
