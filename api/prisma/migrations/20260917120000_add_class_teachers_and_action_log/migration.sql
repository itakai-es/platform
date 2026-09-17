-- Profesorado por clase y registro de acciones de clase.
--
-- Solo añade: dos enums, dos tablas, sus índices y una fila de propietario por
-- cada clase que ya existe. No toca ni borra ninguna columna: `classes.teacher_id`
-- se queda como propietario de la clase y coincide con la fila `is_owner`.

-- CreateEnum
CREATE TYPE "ClassAccessLevel" AS ENUM ('read', 'edit', 'admin');

-- CreateEnum
CREATE TYPE "ClassTeacherProfile" AS ENUM ('titular', 'sustituto', 'practicas');

-- CreateTable
CREATE TABLE "class_teachers" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access" "ClassAccessLevel" NOT NULL,
    "profile" "ClassTeacherProfile" NOT NULL,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "added_by_id" TEXT,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_action_log" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "actor_avatar" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "target_user_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_teachers_user_id_idx" ON "class_teachers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_teachers_class_id_user_id_key" ON "class_teachers"("class_id", "user_id");

-- Un solo propietario por clase. Es un índice único parcial, que Prisma no sabe
-- expresar: vive solo aquí. Prisma tampoco lo ve al comparar el esquema con la
-- base, así que hoy no propone borrarlo; si alguna versión lo hiciera en una
-- migración posterior, hay que quitar esa sentencia a mano.
CREATE UNIQUE INDEX "class_teachers_one_owner" ON "class_teachers"("class_id") WHERE "is_owner";

-- CreateIndex
CREATE INDEX "class_action_log_class_id_created_at_idx" ON "class_action_log"("class_id", "created_at");

-- CreateIndex
CREATE INDEX "class_action_log_target_user_id_created_at_idx" ON "class_action_log"("target_user_id", "created_at");

-- CreateIndex
CREATE INDEX "classes_teacher_id_idx" ON "classes"("teacher_id");

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_action_log" ADD CONSTRAINT "class_action_log_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_action_log" ADD CONSTRAINT "class_action_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_action_log" ADD CONSTRAINT "class_action_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Propietario de cada clase que ya existe: todas, también las archivadas y las
-- publicadas como plantilla. Los id de esta base son texto, de ahí el `::text`.
-- Se puede repetir sin efecto: no pisa una fila que ya exista ni añade un
-- segundo propietario a una clase que ya tenga uno.
INSERT INTO "class_teachers" ("id", "class_id", "user_id", "access", "profile", "is_owner", "created_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", c."teacher_id", 'admin', 'titular', true, c."created_at", CURRENT_TIMESTAMP
FROM "classes" c
WHERE NOT EXISTS (
    SELECT 1 FROM "class_teachers" t WHERE t."class_id" = c."id" AND t."is_owner"
)
ON CONFLICT ("class_id", "user_id") DO NOTHING;

-- Comprobación de coherencia, para después de aplicar. Debe dar 0: cuenta las
-- clases que no tienen exactamente un propietario o cuyo propietario no es
-- `classes.teacher_id`.
--
--   SELECT count(*) FROM "classes" c
--   WHERE (SELECT count(*) FROM "class_teachers" t
--          WHERE t."class_id" = c."id" AND t."is_owner" AND t."user_id" = c."teacher_id") <> 1
--      OR (SELECT count(*) FROM "class_teachers" t
--          WHERE t."class_id" = c."id" AND t."is_owner") <> 1;
--
-- Si no da 0 (por ejemplo, una clase creada por una versión anterior del código
-- justo después de aplicar esto), repetir el INSERT de arriba cubre las clases
-- que no tienen ninguna fila de su `teacher_id`. No cubre una clase cuyo
-- `teacher_id` ya tenga una fila que no sea de propietario: el ON CONFLICT la
-- deja como está. Esta otra consulta repara los dos casos:
--
--   INSERT INTO "class_teachers" ("id", "class_id", "user_id", "access", "profile", "is_owner", "created_at", "updated_at")
--   SELECT gen_random_uuid()::text, c."id", c."teacher_id", 'admin', 'titular', true, c."created_at", CURRENT_TIMESTAMP
--   FROM "classes" c
--   WHERE NOT EXISTS (
--       SELECT 1 FROM "class_teachers" t WHERE t."class_id" = c."id" AND t."is_owner"
--   )
--   ON CONFLICT ("class_id", "user_id") DO UPDATE
--   SET "is_owner" = true, "access" = 'admin', "ends_at" = NULL, "updated_at" = CURRENT_TIMESTAMP;
