# Permisos del profesorado y cuentas del alumnado

> Borrador. Documento técnico para quien administra una instancia de ITAKAI o la
> autohospeda. Describe cómo se reparte el acceso a cada clase, cómo funcionan
> las cuentas de alumnado sin correo y qué hay que configurar y revisar para
> que todo ello funcione bien en una instalación propia. Para instalar la
> plataforma, empieza por [SELF_HOSTING.md](../SELF_HOSTING.md).

## Índice

1. [Profesorado de una clase](#1-profesorado-de-una-clase)
2. [La administración de la plataforma hace de «centro»](#2-la-administración-de-la-plataforma-hace-de-centro)
3. [Cuentas de alumnado sin correo](#3-cuentas-de-alumnado-sin-correo)
4. [Primer acceso, restablecimiento y sesiones](#4-primer-acceso-restablecimiento-y-sesiones)
5. [Límites de intentos](#5-límites-de-intentos)
6. [Dirección real de quien entra (detrás de un proxy)](#6-dirección-real-de-quien-entra-detrás-de-un-proxy)
7. [Ficheros privados y almacenamiento externo](#7-ficheros-privados-y-almacenamiento-externo)
8. [Qué revisar si autohospedas](#8-qué-revisar-si-autohospedas)

---

## 1. Profesorado de una clase

Una clase puede tener varios profesores. Cada uno tiene en ella un **nivel de
acceso**, que decide lo que puede hacer, y un **perfil**, que es una etiqueta
para saber quién es quién. Además, cada clase tiene **un único propietario**.

### Niveles

| Nivel | Qué permite, en resumen |
|---|---|
| **Lectura** | Ver la clase: misiones, entregas, tienda, comportamientos, alumnado (nombre y correo, sin exportar), profesorado e historial. Duplicar la clase. |
| **Edición** | Lo de lectura y, además, tocar el contenido: misiones, enigmas, documentos, tienda y comportamientos; aplicar comportamientos, aprobar entregas y generar avatares del alumnado. |
| **Administración** | Lo de edición y, además, los ajustes de la clase, el código de invitación, el alumnado (altas, contraseñas, alias, quitar de la clase), archivar la clase y gestionar el profesorado. |
| **Propietario** | Todo lo anterior y, en exclusiva, publicar la clase como plantilla y traspasar su propiedad. |

Cada nivel incluye a los anteriores. El propietario no es un nivel guardado
aparte: es una marca sobre una fila de profesorado que, a efectos de permisos,
está por encima de administración.

### Perfiles

El perfil trae un nivel por defecto al añadir a alguien, pero el nivel se
guarda aparte y se puede cambiar sin tocar el perfil.

| Perfil | Nivel por defecto |
|---|---|
| Titular | Administración |
| Sustituto | Edición |
| En prácticas | Lectura |

### Tabla de acciones

Esta es la tabla de la API (`CLASS_ACTION_LEVEL` en
[`api/src/utils/class-access.ts`](../api/src/utils/class-access.ts)). Toda
decisión de permisos sobre una clase pasa por ella. La interfaz usa una copia
(`app/app/utils/class-access.ts`) para mostrar u ocultar botones; las pruebas
comprueban que las dos coinciden. Si cambias una, cambia la otra.

| Acción | Nivel mínimo | Qué cubre |
|---|---|---|
| `class.view` | Lectura | Ver la clase y sus datos. |
| `class.duplicate` | Lectura | Duplicar la clase (la copia es de quien la duplica). |
| `class.editContent` | Edición | Cambiar el contenido de la clase (historia, guía y datos que no son ajustes). |
| `class.editSettings` | Administración | Cambiar los ajustes de la clase. |
| `class.archive` | Administración | Archivar y desarchivar la clase. |
| `class.inviteCode` | Administración | Ver el código de invitación de la clase. |
| `class.publishTemplate` | Propietario | Publicar la clase como plantilla o retirarla. |
| `class.transfer` | Propietario | Traspasar la propiedad de la clase. |
| `mission.view` | Lectura | Ver las misiones, sus enigmas y documentos. |
| `mission.edit` | Edición | Crear, editar y bloquear misiones; crear, editar y borrar enigmas y documentos; usar las insignias vinculadas a una misión. |
| `shop.view` | Lectura | Ver la tienda y su historial. |
| `shop.edit` | Edición | Cambiar los artículos de la tienda. |
| `behavior.view` | Lectura | Ver los comportamientos. |
| `behavior.edit` | Edición | Crear, editar y borrar comportamientos. |
| `behavior.apply` | Edición | Aplicar un comportamiento a un alumno. |
| `submission.view` | Lectura | Ver las entregas y descargar sus ficheros. |
| `submission.approve` | Edición | Aprobar entregas con su porcentaje de completado. |
| `student.view` | Lectura | Ver el alumnado y su ficha. |
| `student.avatar` | Edición | Generar un avatar nuevo para un alumno. |
| `student.manage` | Administración | Dar de alta cuentas sin correo, restablecer su contraseña y quitar a un alumno de la clase. |
| `student.nickname` | Administración | Cambiar el alias de un alumno en la clase (el alumno también puede cambiarlo desde su lado). |
| `teachers.view` | Lectura | Ver el profesorado de la clase. |
| `teachers.manage` | Administración | Añadir profesores, cambiar su perfil o su nivel y quitarlos. |
| `teachers.leave` | Lectura | Salir de la clase (cualquiera menos el propietario). |
| `class.history` | Lectura | Consultar el historial de la clase. |

Algunos detalles del comportamiento:

- **El acceso se lee en cada petición**, de la tabla de profesorado de la
  clase; no viaja dentro de la sesión. Quitar a alguien o bajarle el nivel
  surte efecto al momento.
- **Sin acceso a la clase**, la respuesta es la misma que si la clase (o la
  misión, la entrega, el documento…) no existiera: `404`. **Con acceso pero sin
  nivel suficiente**, `403`.
- Una fila de profesorado puede tener **fecha de fin**; pasada esa fecha, esa
  persona deja de tener acceso. De momento no hay pantalla para ponerla.
- Los avisos de entregas nuevas llegan a quien tiene edición o más. Quien solo
  tiene lectura no recibe avisos.

### Añadir, cambiar y quitar profesorado

- Quien tiene **administración** añade a otra persona escribiendo el **correo
  exacto** de su cuenta de profesorado. Entra al momento, sin tener que
  aceptar nada, y recibe un aviso dentro de la aplicación.
- Si el correo no es el de una cuenta de profesorado activa, la respuesta es
  siempre la misma, exista o no la cuenta. Los intentos están limitados (ver
  [Límites de intentos](#5-límites-de-intentos)).
- Quien tiene administración también cambia el perfil y el nivel de los demás y
  puede quitarlos, salvo al propietario. Cada cambio avisa a la persona
  afectada.
- Cualquiera del profesorado puede **salir de la clase**, menos el propietario,
  que antes tiene que traspasarla.

### Propietario y traspaso

- Quien crea una clase es su propietario, con perfil titular y nivel de
  administración. Hay exactamente un propietario por clase; la base de datos no
  admite dos.
- El propietario **traspasa** la clase a alguien del profesorado que ya tenga
  administración. El anterior propietario sigue en la clase con administración.
- La **administración de la plataforma** también puede traspasar cualquier clase
  a cualquiera de su profesorado vigente, que sube a administración. Es el
  respaldo para cuando en la clase no queda nadie que pueda hacerlo. Por ahora
  solo desde la API (`PUT /admin/classes/:classId/transfer`): el panel no
  tiene pantalla para ello.
- Al **borrar una cuenta de profesorado**, cada clase de la que es propietaria
  pasa a la persona con administración más antigua en ella (solo cuentas
  activas). Si alguna clase no tiene a quién pasar, la cuenta no se borra y se
  indica qué clases lo impiden. Sus insignias se reasignan al nuevo propietario
  cuando hace falta para que el alumnado no pierda las que ya ha ganado; las
  que solo eran suyas se borran.

### Historial de la clase

Las acciones relevantes del profesorado quedan registradas con su autor:
entregas aprobadas, comportamientos, misiones, enigmas y sus recompensas,
documentos, tienda, ajustes, alumnado y profesorado. Se consultan en la pestaña
«Historial» de la clase, con filtros por profesor y por tipo.

- El registro guarda el nombre de quien actuó copiado, así que sobrevive al
  borrado de su cuenta.
- La persona sobre la que recae una acción se guarda solo como referencia a su
  cuenta; los datos adicionales de cada entrada no guardan nombres de alumnos.
- El historial se borra con la clase.

## 2. La administración de la plataforma hace de «centro»

ITAKAI no tiene un modelo de centros educativos ni un rol de coordinación: **una
instancia es un centro**, y quien tiene el rol de administración de la
plataforma hace ese papel. Si varios centros comparten una misma instancia,
comparten también su administración.

La administración de la plataforma **no forma parte del profesorado de las
clases** por serlo: desde su panel ve los listados de clases y misiones, pero
no las gestiona ni edita su contenido. Lo que sí puede desde el panel, como
respaldo del profesorado, es:

- dar de alta cuentas de alumnado sin correo en cualquier clase, aunque el
  registro público esté cerrado;
- restablecer la contraseña de cualquier cuenta sin correo, también de las que
  se han quedado sin clase de origen;
- cambiar la clase de origen de una cuenta sin correo;
- suspender y reactivar cuentas (suspender cierra sus sesiones al momento; no se
  permite sobre otra cuenta de administración) y borrarlas, con las reglas de
  traspaso de clases del apartado anterior.

Además puede ver el profesorado de cualquier clase y traspasar su propiedad
(ver arriba), pero por ahora solo desde la API
(`GET /admin/classes/:classId/teachers` y `PUT /admin/classes/:classId/transfer`):
el panel no tiene pantalla para ello.

## 3. Cuentas de alumnado sin correo

Una cuenta puede tener **correo, usuario o los dos**, y se entra con
cualquiera de ellos. El alumnado con correo puede seguir registrándose solo y
uniéndose a sus clases con el código. Las cuentas **sin correo** son para quien
no tiene un correo con el que registrarse o recuperar la contraseña; las crea
el profesorado.

### Quién las crea

- El profesorado con **administración** en la clase, desde la ventana «Invitar»,
  pestaña «Crear cuentas»: una a una, escribiendo los nombres, o pegando una
  lista copiada de una hoja de cálculo o un CSV (hasta 50 a la vez). La lista se
  revisa antes de crear nada y después se crean todas o ninguna.
- La **administración de la plataforma**, desde su panel, en cualquier clase.
- Funciona aunque el registro público esté cerrado. En una clase archivada no se
  crean cuentas.

### Usuario

- El sistema propone un usuario a partir del nombre (nombre, inicial y un sufijo
  corto aleatorio, por ejemplo `ana.g.k7`). Quien crea la cuenta puede
  cambiarlo en ese momento.
- Es **único en toda la instancia**, va en minúsculas y tiene entre 3 y 30
  caracteres. El alumno no puede cambiarlo.
- Comprobar si un usuario está libre nunca dice si existe: la respuesta es
  siempre una propuesta que se puede usar.

### Qué se guarda y qué no

Se guarda lo mínimo: nombre visible, usuario y el hash de la contraseña. La
contraseña **nunca se guarda en claro**: la temporal se devuelve una sola vez,
en la respuesta que la genera, y si se pierde se restablece.

Una cuenta sin correo **no puede añadirse un correo**, ni cambiar su nombre o su
usuario, ni borrarse a sí misma. Todo eso lo lleva el profesorado de su clase de
origen o la administración de la plataforma.

### Clase de origen

Cada cuenta sin correo recuerda la clase donde se creó: su **clase de origen**.

- Solo gestionan la cuenta (restablecer su contraseña) quienes tienen
  **administración en su clase de origen** y la administración de la
  plataforma.
- El alumno puede unirse a otras clases con su código, como cualquiera. En esas
  clases es un alumno más: su profesorado ve su progreso, pero no gestiona la
  cuenta.
- Si se **quita al alumno de su clase de origen**, la cuenta se queda sin clase
  de origen y solo la gestiona la administración de la plataforma. Salvo que la
  cuenta **no se haya usado nunca** (no ha iniciado sesión ninguna vez y solo
  está en esa clase): entonces se borra del todo, porque sin clase sería una
  cuenta que no gestiona nadie y que nunca ha servido, normalmente creada por
  error. La ventana de confirmación lo avisa antes.
- En la lista de alumnos de la clase, la etiqueta **«Pendiente de entrar»**
  marca las cuentas sin correo que tienen la contraseña temporal sin usar
  (recién creadas o restablecidas).
- Hasta que una cuenta sin correo **entra por primera vez**, el resto de la
  clase no la ve: no sale en el ranking ni en el podio, no cuenta en las medias
  ni en el número de alumnos. El podio del profesorado es el mismo; en su lista
  de alumnos sí sale, con la etiqueta.
- La administración de la plataforma puede **cambiar la clase de origen**; al
  hacerlo, el alumno queda matriculado también en la clase nueva.

### Quitar a un alumno de una clase

Quitar a un alumno (cualquier alumno, con o sin correo) borra, en una sola
operación y solo en esa clase, su progreso, entregas y ficheros, compras,
comportamientos, avisos y conversaciones con el asistente sobre esa clase. La
acción queda en el historial. La cuenta no se borra, salvo la de una cuenta sin
correo que no se ha usado nunca y que se quita de su clase de origen (ver
arriba); el historial lo dice sin nombrarla.

## 4. Primer acceso, restablecimiento y sesiones

### Contraseña temporal y hoja de credenciales

- Al crear una cuenta sin correo, o al restablecer su contraseña, se genera una
  **contraseña temporal** de 8 caracteres, sin los que se confunden entre sí
  (`0`/`O`, `1`/`l`/`I`).
- El profesorado la ve **una sola vez**, en la hoja de credenciales: puede
  copiarlas (todas o de una en una), descargarlas en CSV o imprimirlas. La hoja
  solo existe en esa pestaña del navegador; si se recarga, las contraseñas ya
  no se pueden mostrar y hay que restablecerlas.
- **El CSV descargado lleva las contraseñas**. Queda en el ordenador de quien lo
  descarga y bajo su responsabilidad; la interfaz lo advierte.

### Primer acceso

Mientras la cuenta tenga la contraseña temporal, **no puede usar la
plataforma hasta cambiarla**. La API responde `403` con el código
`PASSWORD_CHANGE_REQUIRED` a cualquier otra petición, y la interfaz lleva al
alumno a la pantalla de cambio.

### Restablecer

- Una cuenta **sin correo** la restablece el profesorado con administración en
  su clase de origen, o la administración de la plataforma. Se genera una
  temporal nueva, se cierran todas sus sesiones, el alumno tiene que cambiarla
  al entrar y la acción queda en el historial de la clase de origen.
- Una cuenta **con correo** se recupera con «¿Olvidaste tu contraseña?». El
  profesorado no puede restablecerla.

### Contraseñas y sesiones

- Las contraseñas nuevas tienen al menos 8 caracteres; las anteriores a esta
  regla siguen valiendo. Se guardan con bcrypt (coste 12).
- **Cambiar la contraseña** (desde el perfil, con el enlace de recuperación o en
  el primer acceso) cierra las demás sesiones. Si la cuenta tiene correo, se
  avisa por correo.
- Las sesiones abiertas antes del último cambio de contraseña dejan de valer en
  su siguiente petición. Una cuenta **suspendida** o inactiva deja de funcionar
  al momento, también con sesiones ya abiertas.
- **Cambiar el correo** pide la contraseña actual.

## 5. Límites de intentos

| Qué | Límite | Por |
|---|---|---|
| Entradas fallidas | 10 cada 15 minutos | Correo o usuario escrito |
| Entradas fallidas | 100 cada 15 minutos | Dirección de origen (IP; en IPv6, su prefijo /64) |
| Añadir profesorado a una clase | 20 por hora | Profesor que lo intenta |
| Revisar una lista de alumnado antes de crearla | 30 por hora | Profesor |
| Crear cuentas de alumnado | 200 por hora | Profesor |
| Pedir una propuesta de usuario | 120 por hora | Profesor |
| Peticiones de texto a la IA (asistente y generación de clases y misiones) | 60 por hora en total (variable `AI_RATE_LIMIT_PER_HOUR`) | Usuario |

- En las entradas solo cuentan los **fallos**: a quien acierta no le gasta cupo.
  El límite por origen es más ancho porque un aula entera suele compartir la
  misma salida a internet.
- Los límites se llevan **en la memoria de cada proceso de la API**: reiniciarla
  los pone a cero y, si se ejecutan varias réplicas, cada una lleva su cuenta.
  Frenan los intentos en bucle, no un ataque repartido entre muchas máquinas.
- El límite por origen depende de que la API conozca la dirección real de
  quien entra: ver el apartado siguiente.

## 6. Dirección real de quien entra (detrás de un proxy)

La API va detrás de un proxy inverso (el nginx de los ficheros de docker
compose del repositorio), que le pasa la dirección del cliente en la cabecera
`X-Forwarded-For`. De esa dirección dependen el límite de entradas fallidas por
origen y la dirección que se guarda con cada sesión.

La variable de entorno **`TRUST_PROXY`** dice de quién se fía la API para leer
esa cabecera:

| Valor | Comportamiento | Cuándo usarlo |
|---|---|---|
| sin definir, o `private` | Se fía solo del salto inmediato, y solo si llega desde loopback o una red local o privada (10/8, 172.16/12, 192.168/16, enlace local y sus equivalentes IPv6). | Los despliegues de producción y de autohospedaje del repositorio tal cual, que no publican el puerto de la API: no hay que configurar nada. |
| un número, p. ej. `2` | Se fía de ese número de saltos más cercanos, vengan de donde vengan. | Hay otro proxy conocido delante del nginx (un terminador TLS, por ejemplo). |
| lista de direcciones o redes, p. ej. `10.0.0.0/8,::1` | Se fía solo de esas. | Los proxies de delante tienen direcciones fijas conocidas. |
| `false` o `0` | No se fía de nadie; la dirección es la de la conexión. | La API se sirve directamente, sin proxy. |

- `TRUST_PROXY=true` **no se acepta** y detiene el arranque: con él, cualquier
  cliente podría escribir la dirección que quisiera en la cabecera. Un valor que
  no se entiende también detiene el arranque.
- Con la configuración por defecto, lo que un cliente escriba en la cabecera
  antes de llegar al proxy se ignora, y quien llegue directamente a la API desde
  fuera no puede elegir su dirección, **siempre que el puerto de la API no esté
  publicado**. Si se publica (`ports:` en docker compose, como hacen los ficheros
  de desarrollo), las conexiones que entran por ese puerto llegan desde la
  pasarela de la red de docker, que es una dirección privada, y su cabecera sí
  se cree. Con el puerto publicado y accesible, pon en `TRUST_PROXY` las
  direcciones exactas del proxy, o `false` si no hay proxy.
- Síntoma de una configuración que no encaja: todas las sesiones se guardan con
  la misma dirección (la del proxy) y el límite por origen salta para todo el
  mundo a la vez. En ese caso, indica cuántos proxies hay delante o sus direcciones.

La variable está documentada, comentada, en `.env.selfhost.example`,
`api/.env.example` y `api/.env.prod.example`.

## 7. Ficheros privados y almacenamiento externo

Los ficheros subidos se guardan por carpetas. Dos de ellas son **privadas**:

| Carpeta | Contenido | Quién puede descargarlo |
|---|---|---|
| `submissions/` | Ficheros de las entregas del alumnado | Su autor y el profesorado de la clase (lectura o más). |
| `documents/` | Documentos de las misiones | El profesorado de la clase y el alumnado matriculado (el alumno no, si la clase está archivada o la misión bloqueada). |

El resto (portadas, insignias, avatares, imágenes de la ayuda e imágenes
generadas con IA) es **público a propósito**.

- Los ficheros privados se descargan por las rutas `/files` de la API, que
  exigen sesión y comprueban el acceso. Sin acceso, la respuesta es `404`, igual
  que si el fichero no existiera.
- Para lo que el navegador abre por su cuenta (un vídeo en otra pestaña, un
  fichero incrustado), la API emite un **enlace firmado de un solo fichero que
  caduca a los 5 minutos**. No sirve como sesión ni para nada más.
- Las direcciones `/uploads/submissions/…` y `/uploads/documents/…` guardadas
  en la base de datos se resuelven por esas rutas con sesión, sin migrar nada, y
  los ficheros se leen de donde se guardaron aunque después cambie el
  almacenamiento configurado.

### Almacenamiento local

Es el modo por defecto: los ficheros van al volumen de subidas de docker y la
API sirve en `/uploads` solo las carpetas públicas. No hay nada que configurar.
Recuerda incluir ese volumen en las copias de seguridad.

### Almacenamiento externo (compatible con S3)

Con un bucket externo configurado en el panel de administración, la API lee
los ficheros privados **con sus propias credenciales**, nunca por su dirección
pública. Por eso:

- **`submissions/` y `documents/` no deben tener acceso público** en el bucket:
  solo las credenciales de la instancia deben poder leerlos.
- Si el bucket es público de raíz (por ejemplo, porque se sirve con un dominio
  propio), restringe esas dos carpetas en la política del bucket o en el
  servicio que lo sirve. Las demás carpetas sí tienen que seguir siendo
  públicas, porque la aplicación las enlaza directamente.
- Comprueba el resultado: la dirección pública de un fichero de
  `submissions/` o `documents/` debe responder con un error de acceso, y el
  mismo fichero descargado desde la aplicación debe abrirse.

## 8. Qué revisar si autohospedas

- **Textos legales.** La política de privacidad, los términos y la política de
  cookies vienen redactados para la instancia de referencia, en las
  traducciones de la aplicación (`app/i18n/locales/<idioma>/legal.json`, diez
  idiomas). En una instancia propia hay que sustituirlos por los tuyos.
- **Responsable del tratamiento.** Quien opera la instancia (normalmente el
  centro o la administración educativa de la que depende) decide y responde de
  los datos del alumnado. Revisa con quien tenga criterio legal, como mínimo:
  - quién es responsable y quién encargado del tratamiento, y sus datos de
    contacto;
  - la base legal para que el profesorado cree cuentas de alumnado sin correo,
    y la edad a partir de la cual el alumnado puede registrarse solo;
  - cuánto tiempo se conservan las cuentas, las entregas y el historial de las
    clases, y qué pasa al terminar el curso;
  - qué servicios externos configuras (IA de texto e imagen, almacenamiento,
    correo) y dónde tratan los datos;
  - la hoja de credenciales y el CSV: el profesorado maneja contraseñas
    temporales y conviene darle pautas para repartirlas y destruirlas.
- **Registro público.** Se abre o se cierra desde el panel (Configuración →
  General). Las cuentas sin correo funcionan igual con el registro cerrado.
- **Proxy y dirección real.** Si pones otro proxy o un terminador TLS delante
  del nginx, ajusta `TRUST_PROXY` (apartado 6).
- **HTTPS.** Para una instancia accesible desde internet, TLS delante y
  `COOKIE_SECURE=true` (ver [SELF_HOSTING.md](../SELF_HOSTING.md)).
- **Bucket externo.** Si usas uno, comprueba que `submissions/` y `documents/`
  no son públicas (apartado 7).
- **Varias réplicas de la API.** Los límites de intentos van en memoria de cada
  proceso (apartado 5).
- **Cuentas de administración.** Son el respaldo de todo el profesorado:
  mantenlas pocas y con contraseñas fuertes. Una cuenta de administración no
  puede suspender a otra.
