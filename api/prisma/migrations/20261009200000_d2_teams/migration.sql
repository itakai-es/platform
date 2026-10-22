-- Equipos: agrupaciones de la clase (de base y temporales), sus equipos y quién
-- está en cada uno.
--
-- Solo añade tres tablas, sus índices y claves. La agrupación cuelga de la clase
-- y la pertenencia de la matrícula, en cascada: purgar la clase o sacar a alguien
-- de ella lo borra. La pertenencia apunta a la pareja (equipo, agrupación), así
-- que no puede quedar en una agrupación que no es la de su equipo, y el único
-- (agrupación, matrícula) impide estar en dos equipos de la misma agrupación.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- CreateTable
CREATE TABLE "team_sets" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'base',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT,
    "emblem" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_sets_class_id_idx" ON "team_sets"("class_id");

-- CreateIndex
CREATE INDEX "teams_set_id_idx" ON "teams"("set_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_id_set_id_key" ON "teams"("id", "set_id");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_enrollment_id_idx" ON "team_members"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_set_id_enrollment_id_key" ON "team_members"("set_id", "enrollment_id");

-- AddForeignKey
ALTER TABLE "team_sets" ADD CONSTRAINT "team_sets_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "team_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_set_id_fkey" FOREIGN KEY ("team_id", "set_id") REFERENCES "teams"("id", "set_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "class_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
