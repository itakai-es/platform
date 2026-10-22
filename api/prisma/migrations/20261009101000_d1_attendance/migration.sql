-- Asistencia: sesiones de clase (clase + fecha + tramo) y el estado de cada
-- estudiante en ellas.
--
-- Solo añade un enum, dos tablas, sus índices y claves. La sesión cuelga de la
-- clase y el registro de la matrícula, los dos en cascada: purgar la clase o
-- sacar a alguien de ella borra su asistencia. `start_time` no admite nulos (""
-- es la sesión sin horario) para que el único impida dos sesiones sin hora el
-- mismo día.
--
-- Escrita a mano: `migrate dev` propone además borrar el índice GIN y el valor
-- por defecto de `search_vector`, que Prisma no modela. Aquí no se tocan.

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'excused');

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL DEFAULT '',
    "end_time" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "taken_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "note" TEXT,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_class_id_date_start_time_key" ON "attendance_sessions"("class_id", "date", "start_time");

-- CreateIndex
CREATE INDEX "attendance_records_enrollment_id_idx" ON "attendance_records"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_enrollment_id_key" ON "attendance_records"("session_id", "enrollment_id");

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_taken_by_id_fkey" FOREIGN KEY ("taken_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "class_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
