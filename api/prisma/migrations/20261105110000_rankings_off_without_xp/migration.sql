-- El ranking ya no pide XP: cada tipo pide lo suyo. Una clase con la XP apagada que
-- nunca guardó `rankings` tenía el ranking apagado de hecho (la regla antigua lo
-- apagaba al leer) y, sin esto, pasaría a tenerlo encendido, con la comparación y
-- quizá los equipos. Se guarda lo que ya había: `rankings: false`. Solo toca esas
-- filas y es idempotente: una segunda pasada no encuentra ninguna.
UPDATE "classes"
   SET "settings" = "settings" || '{"rankings": false}'::jsonb
 WHERE "settings"->>'xp' = 'false'
   AND coalesce("settings"->>'rankings', 'true') = 'true';
