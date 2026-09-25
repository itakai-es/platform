-- Ayuda: la etiqueta «Pendiente de entrar» de las cuentas sin correo, que no
-- cuentan para el resto de la clase hasta que entran, y el borrado de una cuenta
-- que no se ha usado nunca al quitarla de su clase de origen.
--
-- Como el resto del contenido de serie, el panel de administración manda: cada
-- UPDATE solo cambia el cuerpo si sigue exactamente con el texto de serie, así
-- que lo que alguien haya editado se queda como está. Por slug, nunca por id.

-- alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase
UPDATE "help_articles" a SET "body" = $itakai$El menú **⋮** de cada alumno, en la pestaña **Alumnos** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase.

## Cambiar el alias

El alias es el nombre con el que el alumno sale en esa clase y en su ranking. Al unirse le toca uno al azar, y él lo puede cambiar cuando quiera en su pestaña **Avatar**. Si pone uno que no es adecuado, elige **Cambiar alias**, escribe el nuevo (hasta 20 caracteres) y pulsa **Guardar**.

Solo cambia en esta clase: en las demás sigue con el suyo. Como el alumno puede volver a cambiarlo, conviene hablarlo con él. El avatar no se cambia desde aquí.

## Quitar de la clase

**Quitar de la clase** saca al alumno de esta clase y borra todo lo que tenía en ella:

- su nivel, XP, monedas, maná y vidas;
- su progreso en las misiones, sus entregas y las insignias de esas misiones;
- sus compras y usos en la tienda y los comportamientos que se le han aplicado;
- su historial, sus avisos y sus conversaciones con el asistente sobre esta clase.

Lo que tenga en otras clases no cambia, y su cuenta sigue existiendo. **No se puede deshacer**: si vuelve a entrar con el código, empieza de cero.

Si es una cuenta sin correo creada en esta clase, después solo la administración de la plataforma podrá restablecer su contraseña. Y si además **no ha entrado nunca** y no está en ninguna otra clase, la cuenta se borra del todo, no solo de la clase: es lo que pasa con una cuenta creada por error. La ventana te avisa de cada caso antes de confirmar.

> Para cerrar un curso no hace falta quitar a nadie: archiva la clase y todo se queda como estaba.

Las dos acciones quedan anotadas en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE a."category_id" = c."id" AND c."slug" = $itakai$alumnado$itakai$ AND a."slug" = $itakai$cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase$itakai$
  AND a."body" = $itakai$El menú **⋮** de cada alumno, en la pestaña **Alumnos** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase.

## Cambiar el alias

El alias es el nombre con el que el alumno sale en esa clase y en su ranking. Al unirse le toca uno al azar, y él lo puede cambiar cuando quiera en su pestaña **Avatar**. Si pone uno que no es adecuado, elige **Cambiar alias**, escribe el nuevo (hasta 20 caracteres) y pulsa **Guardar**.

Solo cambia en esta clase: en las demás sigue con el suyo. Como el alumno puede volver a cambiarlo, conviene hablarlo con él. El avatar no se cambia desde aquí.

## Quitar de la clase

**Quitar de la clase** saca al alumno de esta clase y borra todo lo que tenía en ella:

- su nivel, XP, monedas, maná y vidas;
- su progreso en las misiones, sus entregas y las insignias de esas misiones;
- sus compras y usos en la tienda y los comportamientos que se le han aplicado;
- su historial, sus avisos y sus conversaciones con el asistente sobre esta clase.

Lo que tenga en otras clases no cambia, y su cuenta sigue existiendo. **No se puede deshacer**: si vuelve a entrar con el código, empieza de cero.

Si es una cuenta sin correo creada en esta clase, después solo la administración de la plataforma podrá restablecer su contraseña. La ventana te lo avisa antes de confirmar.

> Para cerrar un curso no hace falta quitar a nadie: archiva la clase y todo se queda como estaba.

Las dos acciones quedan anotadas en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).$itakai$;

-- alumnado/dar-de-alta-alumnos-sin-correo
UPDATE "help_articles" a SET "body" = $itakai$Para el alumnado que no tiene correo —o que prefieres que no se registre por su cuenta— puedes crear tú las cuentas. Cada alumno entra con un **usuario** y una **contraseña temporal** que le das tú, y la cambia la primera vez que entra. La cuenta nace ya matriculada en tu clase: no necesita el código.

## Dónde se hace

Entra en la clase, pulsa **Invitar**, en la cabecera, y abre la pestaña **Crear cuentas**. Hace falta acceso de administración en la clase, y la clase no puede estar archivada.

Hay dos formas, y con las dos puedes crear hasta 50 cuentas de una vez:

- **Escribir los nombres**: una fila por alumno. Con **Añadir otro alumno** sumas una fila más.
- **Pegar o subir una lista**: para traerla de una hoja de cálculo o de un CSV. Se explica en [importar una lista de alumnos](/ayuda/alumnado/importar-una-lista-de-alumnos).

## El usuario

Al escribir el nombre, la plataforma propone un usuario: el nombre, la inicial del apellido y un sufijo corto, como `ana.g.k7`. Puedes cambiarlo antes de crear la cuenta. Admite letras sin tilde, números y los signos `.`, `_` y `-`, de 3 a 30 caracteres.

El usuario es único en toda la plataforma. Si el que escribes ya lo tiene otra cuenta, se usa uno parecido con un sufijo detrás; el definitivo es el que sale en la hoja de credenciales. Al entrar da igual si el alumno lo escribe en mayúsculas o en minúsculas.

## Al crear las cuentas

Pulsa el botón de crear, que dice cuántas van (por ejemplo, **Crear 3 cuentas**). Se crean todas a la vez o ninguna: si una fila tiene un problema, no se crea nada hasta que la corrijas o la quites. Cada alumno queda matriculado en la clase con un alias y un avatar al azar, como cualquiera que entra con el código.

Al terminar se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales), con el usuario y la contraseña temporal de cada uno. **Es la única vez que se ven las contraseñas**: cópialas, descárgalas o imprímelas antes de recargar la página.

## En la lista de la clase

En la pestaña **Alumnos**, estas cuentas llevan la etiqueta **Sin correo**, y mientras el alumno no entre con su contraseña temporal, también **Pendiente de entrar**. Hasta que entra por primera vez, sus compañeros no lo ven: no sale en el ranking ni cuenta en las medias de la clase. Si ha perdido la contraseña antes de entrar, restablécela y tendrá una nueva. Desde el menú **⋮** de cada una puedes [restablecer su contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno), y también [cambiar su alias o quitarla de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase).

## Lo que conviene saber

- Esta clase es su **clase de origen**: su contraseña la restablece quien tiene administración en ella.
- El alumno puede unirse a otras clases con su código, como cualquier otro.
- No puede cambiar su nombre ni su usuario, añadir un correo a la cuenta ni borrarla.
- Se pueden crear cuentas aunque el registro público de la plataforma esté cerrado.

Lo que tiene que hacer el alumno para entrar está en [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE a."category_id" = c."id" AND c."slug" = $itakai$alumnado$itakai$ AND a."slug" = $itakai$dar-de-alta-alumnos-sin-correo$itakai$
  AND a."body" = $itakai$Para el alumnado que no tiene correo —o que prefieres que no se registre por su cuenta— puedes crear tú las cuentas. Cada alumno entra con un **usuario** y una **contraseña temporal** que le das tú, y la cambia la primera vez que entra. La cuenta nace ya matriculada en tu clase: no necesita el código.

## Dónde se hace

Entra en la clase, pulsa **Invitar**, en la cabecera, y abre la pestaña **Crear cuentas**. Hace falta acceso de administración en la clase, y la clase no puede estar archivada.

Hay dos formas, y con las dos puedes crear hasta 50 cuentas de una vez:

- **Escribir los nombres**: una fila por alumno. Con **Añadir otro alumno** sumas una fila más.
- **Pegar o subir una lista**: para traerla de una hoja de cálculo o de un CSV. Se explica en [importar una lista de alumnos](/ayuda/alumnado/importar-una-lista-de-alumnos).

## El usuario

Al escribir el nombre, la plataforma propone un usuario: el nombre, la inicial del apellido y un sufijo corto, como `ana.g.k7`. Puedes cambiarlo antes de crear la cuenta. Admite letras sin tilde, números y los signos `.`, `_` y `-`, de 3 a 30 caracteres.

El usuario es único en toda la plataforma. Si el que escribes ya lo tiene otra cuenta, se usa uno parecido con un sufijo detrás; el definitivo es el que sale en la hoja de credenciales. Al entrar da igual si el alumno lo escribe en mayúsculas o en minúsculas.

## Al crear las cuentas

Pulsa el botón de crear, que dice cuántas van (por ejemplo, **Crear 3 cuentas**). Se crean todas a la vez o ninguna: si una fila tiene un problema, no se crea nada hasta que la corrijas o la quites. Cada alumno queda matriculado en la clase con un alias y un avatar al azar, como cualquiera que entra con el código.

Al terminar se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales), con el usuario y la contraseña temporal de cada uno. **Es la única vez que se ven las contraseñas**: cópialas, descárgalas o imprímelas antes de recargar la página.

## En la lista de la clase

En la pestaña **Alumnos**, estas cuentas llevan la etiqueta **Sin correo**. Desde el menú **⋮** de cada una puedes [restablecer su contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno), y también [cambiar su alias o quitarla de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase).

## Lo que conviene saber

- Esta clase es su **clase de origen**: su contraseña la restablece quien tiene administración en ella.
- El alumno puede unirse a otras clases con su código, como cualquier otro.
- No puede cambiar su nombre ni su usuario, añadir un correo a la cuenta ni borrarla.
- Se pueden crear cuentas aunque el registro público de la plataforma esté cerrado.

Lo que tiene que hacer el alumno para entrar está en [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).$itakai$;
