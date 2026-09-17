-- Correo opcional y usuario propio: una cuenta puede entrar con uno o con el otro.
--
-- Solo añade y relaja: `users.email` deja de ser obligatorio pero mantiene su
-- unicidad, y aparecen el usuario, el tipo de cuenta, quién la creó, su clase de
-- origen y las marcas de contraseña. Ninguna columna se borra ni se renombra, así
-- que lo que ya existe sigue funcionando igual: todas las cuentas de hoy tienen
-- correo y quedan como autogestionadas.

-- CreateEnum
-- Una cuenta `self` la lleva su dueño (se registró él); una `managed` la creó y
-- la mantiene el profesorado: sin correo, y con el usuario como identificador.
CREATE TYPE "UserAccountType" AS ENUM ('self', 'managed');

-- El correo se guarda y se busca en minúsculas, así que lo que ya estuviera en
-- mayúsculas se normaliza aquí.
--
-- Si dos cuentas tienen el mismo correo escrito con distintas mayúsculas, solo
-- una puede quedarse con él: bajarlas las dos choca con la unicidad, y dejar una
-- sin bajar la deja sin poder entrar (a partir de ahora la búsqueda compara
-- siempre en minúsculas, así que su correo tal cual no se encuentra). No hay
-- forma automática de acertar, así que la migración se para y dice qué cuentas
-- son: hay que decidir a mano con cuál se queda cada correo —vaciando el de la
-- otra, que ya se puede dejar sin correo— y volver a lanzarla. Para verlo antes
-- de migrar:
--   SELECT lower(email), count(*) FROM users WHERE email IS NOT NULL
--    GROUP BY 1 HAVING count(*) > 1;
DO $$
DECLARE
  clashing text;
BEGIN
  SELECT string_agg(DISTINCT u."id", ', ')
    INTO clashing
    FROM "users" u
    JOIN "users" o ON o."id" <> u."id" AND lower(o."email") = lower(u."email")
   WHERE u."email" IS NOT NULL;

  IF clashing IS NOT NULL THEN
    RAISE EXCEPTION 'Hay cuentas cuyo correo solo se diferencia en las mayusculas (%). Decide con cual se queda cada correo antes de aplicar esta migracion.', clashing;
  END IF;
END
$$;

UPDATE "users"
SET "email" = lower("email")
WHERE "email" <> lower("email");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "account_type" "UserAccountType" NOT NULL DEFAULT 'self';
ALTER TABLE "users" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "users" ADD COLUMN "home_class_id" TEXT;
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_created_by_id_idx" ON "users"("created_by_id");

-- CreateIndex
CREATE INDEX "users_home_class_id_idx" ON "users"("home_class_id");

-- CreateIndex
CREATE INDEX "users_account_type_idx" ON "users"("account_type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_home_class_id_fkey" FOREIGN KEY ("home_class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Toda cuenta se identifica por algo con lo que entrar: correo, usuario o los
-- dos. Es un CHECK, que Prisma no sabe expresar: vive solo aquí, y el esquema
-- lo explica. Prisma tampoco lo ve al comparar el esquema con la base, así que
-- hoy no propone borrarlo; si alguna versión lo hiciera en una migración
-- posterior, hay que quitar esa sentencia a mano.
ALTER TABLE "users" ADD CONSTRAINT "users_email_or_username" CHECK ("email" IS NOT NULL OR "username" IS NOT NULL);
