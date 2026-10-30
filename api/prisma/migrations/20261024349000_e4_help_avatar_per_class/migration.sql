-- Ayuda de E4, retoques: la guía de entrar en una clase decía que el avatar
-- viaja con la cuenta, y es de cada clase, como cuentan las guías de avatares.
--
-- Como el resto del contenido de serie, el panel de administración manda. Cada
-- UPDATE solo cambia un campo si sigue exactamente con el texto de serie, así
-- que lo que alguien haya editado se queda como está. Siempre por slug de
-- categoría y de artículo, nunca por id.

-- si-eres-alumno/como-entro-en-mi-clase: el avatar es de cada clase, no viaja con la cuenta.
UPDATE "help_articles" a
SET "body" = $itakai$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu docente: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

> **¿Tu docente te ha dado un usuario y una contraseña?** Entonces ya estás en su clase y no necesitas código: mira [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).

## Paso a paso

1. Pide el código a tu docente.
2. Entra en ITAKAI con tu cuenta. Si todavía no tienes, créala con **Crear Cuenta Nueva**, en la pantalla de inicio de sesión, y cuando te pregunte por tu perfil elige **Estudiante**.
3. Ve a **Mis Clases**, en el menú de la izquierda, y pulsa **Unirse a clase**. En el móvil tienes **Unirse a Clase** arriba del todo, al abrir el menú.
4. Escribe el código y pulsa **Unirse a la clase**. Da igual si usas mayúsculas o minúsculas.

Y ya estás dentro: la plataforma te lleva a la clase, y a partir de ahí la tienes siempre en **Mis Clases**.

## Si te sale un error

- **«Código de clase inválido».** Revisa que esté bien copiado: es fácil confundir la O con el cero o la I con el uno. Si sigue sin funcionar, pregúntale a tu docente si es el código de tu grupo.
- **«Esta clase está archivada y no admite más estudiantes».** Esa clase ya está cerrada. Díselo a tu docente para que te dé el código de la clase que usa ahora.
- **«Ya estás en esta clase».** Ya estabas dentro: búscala en **Mis Clases**.

## Si no aparece la clase

Comprueba con qué cuenta has entrado. Si tienes dos —la del centro y una personal—, la clase solo está en la cuenta con la que escribiste el código.

También puede ser que la clase esté archivada porque el curso ya ha terminado: entonces no la vas a ver aunque estuvieras dentro.

## Tu cuenta es tuya

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: en ella tienes todas tus clases, con tu progreso y tus insignias. Tu avatar y tu alias, en cambio, son de cada clase: lo cuenta [mi avatar y mi nombre en clase](/ayuda/si-eres-alumno/mi-avatar-y-mi-nombre-en-clase).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entro-en-mi-clase$itakai$
  AND a."body" = $itakai$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu docente: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

> **¿Tu docente te ha dado un usuario y una contraseña?** Entonces ya estás en su clase y no necesitas código: mira [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).

## Paso a paso

1. Pide el código a tu docente.
2. Entra en ITAKAI con tu cuenta. Si todavía no tienes, créala con **Crear Cuenta Nueva**, en la pantalla de inicio de sesión, y cuando te pregunte por tu perfil elige **Estudiante**.
3. Ve a **Mis Clases**, en el menú de la izquierda, y pulsa **Unirse a clase**. En el móvil tienes **Unirse a Clase** arriba del todo, al abrir el menú.
4. Escribe el código y pulsa **Unirse a la clase**. Da igual si usas mayúsculas o minúsculas.

Y ya estás dentro: la plataforma te lleva a la clase, y a partir de ahí la tienes siempre en **Mis Clases**.

## Si te sale un error

- **«Código de clase inválido».** Revisa que esté bien copiado: es fácil confundir la O con el cero o la I con el uno. Si sigue sin funcionar, pregúntale a tu docente si es el código de tu grupo.
- **«Esta clase está archivada y no admite más estudiantes».** Esa clase ya está cerrada. Díselo a tu docente para que te dé el código de la clase que usa ahora.
- **«Ya estás en esta clase».** Ya estabas dentro: búscala en **Mis Clases**.

## Si no aparece la clase

Comprueba con qué cuenta has entrado. Si tienes dos —la del centro y una personal—, la clase solo está en la cuenta con la que escribiste el código.

También puede ser que la clase esté archivada porque el curso ya ha terminado: entonces no la vas a ver aunque estuvieras dentro.

## Tu cuenta es tuya

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: tu progreso, tus insignias y tu avatar viajan contigo.$itakai$;
