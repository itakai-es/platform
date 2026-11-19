-- Configuración del ranking por clase. Nulo = como siempre (XP y equipos, completo
-- y sin temporada): ninguna clase existente cambia y no hay que rellenar nada.
ALTER TABLE "classes" ADD COLUMN "ranking_config" JSONB;
