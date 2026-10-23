-- E4: avatar del profesorado, uno por cuenta. Guarda la clave del catálogo
-- docente (hoy, un color de la paleta: «purple», «mint»…), nunca una ruta ni una
-- URL. Nulo es «sin elegir»: iniciales sobre un color derivado del id de la
-- cuenta. La lista de claves la valida la API (utils/avatars.ts), así que añadir
-- un retrato no pide otra migración.
ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
