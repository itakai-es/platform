-- AlterTable
ALTER TABLE "class_enrollments" ADD COLUMN     "is_preview" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "class_enrollments_class_id_is_preview_idx" ON "class_enrollments"("class_id", "is_preview");
