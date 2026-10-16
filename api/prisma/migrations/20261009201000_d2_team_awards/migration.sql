-- Premios de equipo: el marcador es la suma de sus puntos (un libro, no un
-- contador), y cada aplicación repartida a un integrante sabe de qué premio vino.
--
-- Solo añade una tabla y una columna que admite nulos. El premio cuelga del
-- equipo (en cascada); su autor y su comportamiento quedan en nulo si se borran,
-- igual que la columna de la aplicación si se borra el premio.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- AlterTable
ALTER TABLE "behavior_applications" ADD COLUMN     "team_award_id" TEXT;

-- CreateTable
CREATE TABLE "team_awards" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "teacher_id" TEXT,
    "behavior_id" TEXT,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "xp_delta" INTEGER NOT NULL DEFAULT 0,
    "coin_delta" INTEGER NOT NULL DEFAULT 0,
    "mana_delta" INTEGER NOT NULL DEFAULT 0,
    "life_delta" INTEGER NOT NULL DEFAULT 0,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_awards_team_id_idx" ON "team_awards"("team_id");

-- CreateIndex
CREATE INDEX "behavior_applications_team_award_id_idx" ON "behavior_applications"("team_award_id");

-- AddForeignKey
ALTER TABLE "behavior_applications" ADD CONSTRAINT "behavior_applications_team_award_id_fkey" FOREIGN KEY ("team_award_id") REFERENCES "team_awards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_awards" ADD CONSTRAINT "team_awards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_awards" ADD CONSTRAINT "team_awards_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_awards" ADD CONSTRAINT "team_awards_behavior_id_fkey" FOREIGN KEY ("behavior_id") REFERENCES "behavior_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
