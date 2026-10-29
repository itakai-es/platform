/**
 * Compact platform context for AI agent system prompts.
 * Optimized for minimal token usage in production (NFR18).
 * Single source of truth — update here when platform features change.
 */

/** Map assistant IDs to display names for mythological skins */
const SKIN_NAMES: Record<string, string> = {
  atenea: 'Atenea',
  odiseo: 'Odiseo',
  penelope: 'Penélope',
  polifemo: 'Polifemo',
  poseidon: 'Poseidón',
}

/** Get the display name for a mythological skin */
export function getSkinName(assistantId: string): string {
  return SKIN_NAMES[assistantId] || assistantId
}

// Una línea por tema, con las etiquetas tal como salen en la interfaz para que el
// asistente pueda citarlas. Se paga en cada mensaje: breve.

const CONTEXT = {
  es: {
    shared: [
      'ITAKAI: plataforma de gamificación educativa, temática de mitología griega.',
      'Entrar: correo o usuario + contraseña. El profesorado puede crear cuentas de estudiante con usuario y sin correo; quien usa una de esas cuentas no puede añadirle correo y, si pierde la contraseña, se la restablece su docente. La primera vez entran con el usuario y la contraseña temporal de su hoja de credenciales, y la aplicación les pide cambiarla por una suya (Cambia tu contraseña) antes de seguir.',
      'Clase: la crea una persona del profesorado y en ella puede haber más docentes; código de invitación de 6 caracteres; cada estudiante lo escribe en Unirse a clase y entra al momento, sin que nadie acepte nada (no hay solicitudes ni invitaciones personales).',
      'Misión: dentro de una clase, con título/descripción/rareza (común|rara|épica|legendaria)/fecha límite/XP.',
      'Enigma: tarea dentro de una misión, con objetivos y XP propio.',
      'Entrega: cada estudiante envía un archivo por enigma. Su docente la valora con % completado (25/50/75/100 o libre) y la aprueba; ese % escala XP/monedas/maná. No existe rechazar.',
      'Todos los enigmas obligatorios aprobados = misión completa + insignias (los opcionales no hacen falta para completarla).',
      'Mapa de misiones (en pruebas, se enciende por clase en Ajustes>Funcionalidades): una vista más en Misiones con el camino de la clase. Con el mapa encendido, una misión puede pedir completar antes otras de su clase (hasta 3); hasta entonces sale con candado y «Se abre al completar «…»». Lo que ya se ha empezado (una entrega, un enigma aprobado o una pista usada) no se cierra. Una misión pedida que ya ha caducado o no tiene enigmas no cierra nada. Solo se le cierra al alumnado: el profesorado, también en la vista previa, lo ve todo abierto. Apagar el mapa lo abre todo.',
      'Niveles 1-50: Mortal>Héroe Novato>Bronce>Plata>Oro>Semidiós>Titán>Olímpico Menor>Mayor>Avatar Divino>Dios del Olimpo.',
    ].join(' '),
    teacher: [
      'Menú docente: Inicio|Avisos|Mis clases|Misiones|Insignias|Alumnado|Centro de ayuda|Acerca de. No hay entrada Asistente IA: este asistente se abre con Chatea con… (pie del menú) o con su tarjeta en Inicio.',
      'Pestañas de una clase: Resumen|Historia|Guía|Misiones|Alumnado|Tienda y Comportamientos (si están activados)|Historial|Ajustes (Datos generales|Funcionalidades|Niveles|Gestión|Profesorado).',
      'Crear clase: Mis clases>Nueva clase. Crear misión: dentro de la clase>Misiones>Nueva misión. Esos formularios proponen textos con IA (sugiere, no crea nada solo).',
      'Clase compartida: Ajustes>Profesorado>Añadir docente (el correo de su cuenta de docente; entra al momento y recibe un aviso). Perfil: Titular|Sustitución|Prácticas (propone el nivel: Administración, Edición y Lectura; el nivel se puede cambiar). Nivel de acceso: Lectura (ve clase, misiones, alumnado y entregas sin cambiar nada) < Edición (además contenido, tienda, comportamientos y aprobar entregas) < Administración (además ajustes, alumnado, profesorado, Invitar y archivar). Quien tiene la Propiedad (una persona por clase) llega a todo, es la única que la publica como plantilla y hace Pasar la propiedad (solo a alguien con Administración); no se le puede cambiar ni quitar. Menú ⋮ de cada docente: Cambiar perfil o nivel|Pasar la propiedad|Quitar de la clase. Salir de la clase: cualquiera menos quien tiene la propiedad, que antes la pasa.',
      'Historial (pestaña de la clase, la ve todo su profesorado): qué ha hecho cada docente en ella (misiones, entregas, alumnado, ajustes, profesorado…), con filtro por docente y por tipo. Es donde se ve QUIÉN aprobó cada entrega y quién aplicó cada comportamiento, con la fecha; en Misiones>Ver entregas se ve la entrega y su porcentaje, pero no siempre quién la aprobó. El alumnado no ve el Historial, pero sí quién le aprobó cada entrega, en su actividad.',
      'Alumnado (todo pide Administración). Cuentas sin correo: clase>Invitar>Crear cuentas, Escribir los nombres o Pegar o subir una lista (hoja de cálculo o CSV), hasta 50 de una vez; la lista se revisa antes de crear. Al terminar sale la Hoja de credenciales (usuario, contraseña temporal, dirección de entrada y código de clase) para copiar, descargar o imprimir; las contraseñas solo se ven entonces. En clase>Alumnado, quien aún no ha entrado con su contraseña temporal sale como Pendiente de entrar, y hasta su primera entrada no aparece en lo que ve el alumnado (ranking, número de estudiantes). Menú ⋮ de cada estudiante: Restablecer contraseña (solo cuentas sin correo, desde la clase donde se crearon; genera otra temporal y abre su hoja; las de correo usan ¿Olvidaste tu contraseña?), Cambiar alias y Quitar de la clase (borra lo que tenía en esa clase; si es una cuenta sin correo que nunca entró y se quita de su clase de origen, se borra entera).',
      'Camino del mapa: abrir misión>Ajustes>Camino>Para abrirla, completar antes (casillas, hasta 3; las que cerrarían un círculo salen sin poder marcarse); se puede preparar con el mapa apagado, pero solo cierra misiones con el Mapa de misiones encendido. Atajo: clase>Misiones>Ordenar>Encadenar en orden (cada misión abierta pide la abierta anterior; las bloqueadas se quedan fuera) o Quitar los requisitos. Con el mapa encendido, el orden no puede poner una misión delante de lo que pide; apagado, se ordena libre y al encenderlo se recoloca lo justo. Alargar la fecha de una pedida caducada vuelve a cerrar lo que la pide a quien aún no lo ha empezado.',
      'Revisar entregas: clase>Misiones>abrir misión>Ver entregas (N) del enigma (móvil: menú ⋮); en la ventana: Descargar>Valorar>% completado (25/50/75/100 o libre)>Aprobar N%. No hay sección Entregas ni rechazo. El aviso de entrega nueva abre directamente esa ventana. El Resumen de la clase solo cuenta las pendientes.',
    ].join(' '),
    student: [
      'Menú de estudiante: Inicio|Avisos|Mis clases|Misiones|Insignias|Centro de ayuda. Este asistente se abre con Chatea con… (pie del menú) o con su tarjeta en Inicio. El ranking está dentro de cada clase (pestaña Ranking); no hay clasificación global.',
      'Unirse: Mis clases>Unirse a clase>código que da su docente; se entra al momento.',
      'Completar misión: Misiones>elegir misión>ver enigmas>enviar la entrega (archivo).',
      'Su docente revisa: aprueba con % completado (recompensas proporcionales). Todos los enigmas obligatorios aprobados = misión completa.',
      'Misión con candado: o la ha cerrado su docente, o se abre al completar otra (lo dice su tarjeta y el mapa: Se abre al completar «…»). Solo su docente puede quitar ese requisito; si la que la abre caduca, se abre sola. Si la que la abre también tiene candado, hay que esperar a que su docente la abra.',
    ].join(' '),
  },
  en: {
    shared: [
      'ITAKAI: gamified educational platform, Greek mythology theme.',
      'Sign in: email or username + password. A teacher can create student accounts that have a username and no email; those students cannot add an email, and the teacher resets the password if it is lost. The first time they sign in with the username and temporary password from their credentials sheet, and the app asks them to swap it for their own (Change your password) before going on.',
      'Class: created by a teacher, can have several teachers; 6-char invite code; the student types it in Join class and is in straight away, nobody has to accept anything (no join requests or personal invitations).',
      'Mission: inside class, has title/description/rarity(common|rare|epic|legendary)/deadline/XP.',
      'Enigma: task inside mission, objectives + own XP.',
      'Submission: student sends a file per enigma. Teacher grades it with a completion % (25/50/75/100 or custom) and approves; that % scales XP/coins/mana. There is no reject.',
      'All required enigmas approved = mission complete + badges (optional ones are not needed to complete it).',
      'Mission map (in testing, turned on per class in Settings>Features): one more view in Missions with the class path. With the map on, a mission can require completing up to 3 other missions of its class first; until then it shows a padlock and «Opens after completing «…»». Anything already started (a submission, an approved enigma or a used hint) stays open. A required mission that is past its deadline or has no enigmas locks nothing. Only students are locked out: teachers, also in the preview, see everything open. Turning the map off opens everything.',
      'Levels 1-50: Mortal>Hero Novice>Bronze>Silver>Gold>Demigod>Titan>Minor Olympian>Major>Divine Avatar>God of Olympus.',
    ].join(' '),
    teacher: [
      'Teacher menu: Dashboard|Notifications|My classes|Missions|Badges|Students|Help centre|About. There is no AI Assistant entry: this assistant opens from Chat with… (bottom of the menu) or from its card on the Dashboard.',
      'Class tabs: Summary|Story|Guide|Missions|Students|Shop and Behaviors (if turned on)|History|Settings (General details|Features|Levels|Management|Teachers).',
      'Create class: My classes>New class. Create mission: inside class>Missions>New mission. Those forms suggest texts with AI (it suggests, never creates anything by itself).',
      'Shared class: Settings>Teachers>Add teacher (the email of their teacher account; they are in straight away and get a notification). Profile: Main teacher|Substitute|Trainee (it suggests the level: Admin, Editing and View only; the level can be changed). Access level: View only (sees class, missions, students and submissions without changing anything) < Editing (also content, shop, behaviours and approving submissions) < Admin (also settings, students, teachers, Invite and archiving). The Owner (one per class) can do everything, is the only one who publishes it as a template and uses Hand over ownership (only to someone with Admin); the owner cannot be changed or removed. Each teacher ⋮ menu: Change profile or level|Hand over ownership|Remove from class. Leave the class: anyone except the owner, who hands over ownership first.',
      'History (class tab, every teacher of the class sees it): what each teacher has done in it (missions, submissions, students, settings, teachers…), filterable by teacher and by type. It is where you see WHO approved each submission and who applied each behaviour, with the date; Missions>See submissions shows the submission and its percentage, but not always who approved it. Students do not see the History, but they do see who approved each of their submissions, in their activity.',
      'Students (all of this needs Admin). No-email accounts: class>Invite>Create accounts, Type the names or Paste or upload a list (spreadsheet or CSV), up to 50 at once; the list is reviewed before creating. At the end the Credentials sheet opens (username, temporary password, sign-in address and class code) to copy, download or print; passwords are only shown then. In class>Students, anyone who has not signed in with their temporary password yet shows Not signed in yet, and until their first sign-in they do not appear in what students see (ranking, student count). Each student ⋮ menu: Reset password (only no-email accounts, from the class where they were created; makes a new temporary one and opens their sheet; email accounts use Forgot your password?), Change nickname and Remove from class (deletes what they had in that class; a no-email account that never signed in, removed from its home class, is deleted entirely).',
      'Map path: open mission>Settings>Path>To open it, complete first (checkboxes, up to 3; those that would close a loop cannot be ticked); it can be prepared with the map off, but it only locks missions with the Mission map on. Shortcut: class>Missions>Reorder>Chain in order (each open mission requires the previous open one; locked ones are left out) or Remove requirements. With the map on, the order cannot put a mission before what it requires; with it off, reorder freely and turning it on moves only what it must. Extending the deadline of an expired required mission locks again what requires it for anyone who has not started it yet.',
      'Review submissions: class>Missions>open mission>View submissions (N) on the enigma (mobile: ⋮ menu); in the window: Download>Grade>completion % (25/50/75/100 or custom)>Approve N%. There is no Submissions section and no reject. The new-submission notification opens that window directly. The class Summary only counts pending ones.',
    ].join(' '),
    student: [
      'Student menu: Dashboard|Notifications|My classes|Missions|Badges|Help centre. This assistant opens from Chat with… (bottom of the menu) or from its card on the Dashboard. The ranking lives inside each class (Ranking tab); there is no global leaderboard.',
      'Join: My classes>Join class>code from the teacher; you are in straight away.',
      'Complete mission: Missions>choose mission>view enigmas>send the submission (file).',
      'Teacher reviews: approves with a completion % (proportional rewards). All required enigmas approved = mission complete.',
      'Mission with a padlock: either the teacher closed it, or it opens when another one is completed (its card and the map say so: Opens after completing «…»). Only the teacher can remove that requirement; if the one that opens it expires, it opens by itself. If that one has a padlock too, they have to wait for the teacher to open it.',
    ].join(' '),
  },
} as const

/**
 * Get compact platform context for an agent system prompt.
 */
export function getPlatformContext(role: 'teacher' | 'student', locale: string): string {
  const lang = locale.startsWith('en') ? CONTEXT.en : CONTEXT.es
  return `${lang.shared}\n${role === 'teacher' ? lang.teacher : lang.student}`
}
