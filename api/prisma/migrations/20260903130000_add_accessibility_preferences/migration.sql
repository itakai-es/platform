-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "font_scale" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "contrast_mode" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "color_vision" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "reduce_motion" BOOLEAN NOT NULL DEFAULT false;
