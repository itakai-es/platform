ALTER TABLE "users" ADD COLUMN "teacher_registration_pending" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "education_centers" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "merged_into_id" TEXT REFERENCES "education_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "education_centers_identity_key" ON "education_centers"("identity");

CREATE TABLE "teacher_professional_profiles" (
    "user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "center_id" TEXT REFERENCES "education_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "center_answered" BOOLEAN NOT NULL DEFAULT false,
    "experience" TEXT,
    "stages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "gamification_experience" TEXT,
    "gamification_frequency" TEXT,
    "completed_at" TIMESTAMP(3)
);

CREATE INDEX "teacher_professional_profiles_center_id_idx" ON "teacher_professional_profiles"("center_id");
