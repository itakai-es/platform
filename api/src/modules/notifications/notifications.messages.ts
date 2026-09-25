import type { AppLanguage } from '../settings/settings.types.js'

/**
 * Catálogo de textos de los avisos (Fase 3, punto 3).
 *
 * La plataforma habla diez idiomas y el aviso se compone en el servidor, así
 * que el servidor tiene que saber escribirlo en el idioma de quien lo recibe
 * (`UserSettings.language`). Antes se generaban en castellano y un profesor con
 * la interfaz en gallego o en griego recibía «Nueva entrega por revisar».
 *
 * El texto se resuelve **al crear el aviso** y se guarda ya compuesto, igual que
 * en el correo: si el usuario cambia de idioma después, los avisos antiguos se
 * quedan como estaban. Es el comportamiento normal de un buzón y evita duplicar
 * el catálogo en el frontend.
 *
 * Al añadir un tipo de aviso hay que traducirlo a los diez idiomas: el objeto
 * está tipado para que falte uno sea un error de compilación.
 */

type Translations = Record<AppLanguage, string>

export interface NotificationCopy {
  title: Translations
  message: Translations
}

export const NOTIFICATION_COPY = {
  deadline_reminder: {
    title: {
      es: '«{mission}» termina pronto',
      en: '"{mission}" is due soon',
      ca: '«{mission}» s\'acaba aviat',
      val: '«{mission}» s\'acaba prompte',
      eu: '«{mission}» laster amaitzen da',
      gl: '«{mission}» remata pronto',
      ast: '«{mission}» acaba aína',
      pt: '«{mission}» termina em breve',
      el: 'Η «{mission}» λήγει σύντομα',
      ro: '«{mission}» se încheie curând',
    },
    message: {
      es: 'Te quedan unas {hours} h para completar «{mission}» en {class}.',
      en: 'You have about {hours} h left to complete "{mission}" in {class}.',
      ca: 'Et queden unes {hours} h per completar «{mission}» a {class}.',
      val: 'Et queden unes {hours} h per completar «{mission}» a {class}.',
      eu: '{hours} ordu inguru geratzen zaizkizu «{mission}» osatzeko {class} klasean.',
      gl: 'Quédanche unhas {hours} h para completar «{mission}» en {class}.',
      ast: 'Quédente unes {hours} h pa completar «{mission}» en {class}.',
      pt: 'Faltam-te cerca de {hours} h para completar «{mission}» em {class}.',
      el: 'Σου απομένουν περίπου {hours} ώρες για να ολοκληρώσεις την «{mission}» στο {class}.',
      ro: 'Îți mai rămân aproximativ {hours} h pentru a finaliza «{mission}» la {class}.',
    },
  },
  submission_received: {
    title: {
      es: 'Nueva entrega por revisar',
      en: 'New submission to review',
      ca: 'Nou lliurament per revisar',
      val: 'Nou lliurament per revisar',
      eu: 'Entrega berri bat berrikusteko',
      gl: 'Nova entrega por revisar',
      ast: 'Nueva entrega por revisar',
      pt: 'Nova entrega para rever',
      el: 'Νέα εργασία προς διόρθωση',
      ro: 'Predare nouă de verificat',
    },
    message: {
      es: '{student} ha entregado «{enigma}» en {class}.',
      en: '{student} submitted "{enigma}" in {class}.',
      ca: '{student} ha lliurat «{enigma}» a {class}.',
      val: '{student} ha lliurat «{enigma}» a {class}.',
      eu: '{student} ikasleak «{enigma}» entregatu du {class} klasean.',
      gl: '{student} entregou «{enigma}» en {class}.',
      ast: '{student} entregó «{enigma}» en {class}.',
      pt: '{student} entregou «{enigma}» em {class}.',
      el: 'Ο/Η {student} παρέδωσε «{enigma}» στο {class}.',
      ro: '{student} a predat «{enigma}» la {class}.',
    },
  },
  submission_reviewed: {
    title: {
      es: 'Entrega revisada',
      en: 'Submission reviewed',
      ca: 'Lliurament revisat',
      val: 'Lliurament revisat',
      eu: 'Entrega berrikusita',
      gl: 'Entrega revisada',
      ast: 'Entrega revisada',
      pt: 'Entrega revista',
      el: 'Η εργασία διορθώθηκε',
      ro: 'Predare verificată',
    },
    message: {
      es: 'Tu entrega de «{enigma}» se ha revisado al {percentage} %.',
      en: 'Your submission for "{enigma}" was marked at {percentage}%.',
      ca: 'El teu lliurament de «{enigma}» s\'ha revisat al {percentage} %.',
      val: 'El teu lliurament de «{enigma}» s\'ha revisat al {percentage} %.',
      eu: 'Zure «{enigma}» entrega berrikusi da: % {percentage}.',
      gl: 'A túa entrega de «{enigma}» revisouse ao {percentage} %.',
      ast: 'La to entrega de «{enigma}» revisóse al {percentage} %.',
      pt: 'A tua entrega de «{enigma}» foi avaliada em {percentage} %.',
      el: 'Η εργασία σου «{enigma}» βαθμολογήθηκε στο {percentage} %.',
      ro: 'Predarea ta pentru «{enigma}» a fost evaluată la {percentage} %.',
    },
  },
  class_teacher_added: {
    title: {
      es: 'Te han añadido a una clase',
      en: 'You were added to a class',
      ca: 'T\'han afegit a una classe',
      val: 'T\'han afegit a una classe',
      eu: 'Klase batera gehitu zaituzte',
      gl: 'Engadíronte a unha clase',
      ast: 'Amestáronte a una clase',
      pt: 'Adicionaram-te a uma turma',
      el: 'Σε πρόσθεσαν σε μια τάξη',
      ro: 'Ai fost adăugat într-o clasă',
    },
    message: {
      es: '{actor} te ha añadido al profesorado de {class} con el perfil «{profile}» y acceso de {access}.',
      en: '{actor} added you to the teachers of {class} with the "{profile}" profile and {access} access.',
      ca: '{actor} t\'ha afegit al professorat de {class} amb el perfil «{profile}» i accés de {access}.',
      val: '{actor} t\'ha afegit al professorat de {class} amb el perfil «{profile}» i accés de {access}.',
      eu: '{actor} irakasleak {class} klaseko irakasleen artean gehitu zaitu, «{profile}» profilarekin eta {access} sarbidearekin.',
      gl: '{actor} engadiute ao profesorado de {class} co perfil «{profile}» e acceso de {access}.',
      ast: '{actor} amestóte al profesoráu de {class} col perfil «{profile}» y accesu de {access}.',
      pt: '{actor} adicionou-te ao corpo docente de {class} com o perfil «{profile}» e acesso de {access}.',
      el: 'Ο/Η {actor} σε πρόσθεσε στους εκπαιδευτικούς του {class} με το προφίλ «{profile}» και πρόσβαση {access}.',
      ro: '{actor} te-a adăugat în echipa de profesori a clasei {class}, cu profilul «{profile}» și acces de {access}.',
    },
  },
  class_teacher_changed: {
    title: {
      es: 'Ha cambiado tu acceso a una clase',
      en: 'Your access to a class changed',
      ca: 'Ha canviat el teu accés a una classe',
      val: 'Ha canviat el teu accés a una classe',
      eu: 'Klase baterako zure sarbidea aldatu da',
      gl: 'Cambiou o teu acceso a unha clase',
      ast: 'Camudó\'l to accesu a una clase',
      pt: 'O teu acesso a uma turma mudou',
      el: 'Άλλαξε η πρόσβασή σου σε μια τάξη',
      ro: 'Accesul tău la o clasă s-a schimbat',
    },
    message: {
      es: '{actor} ha cambiado tu acceso a {class}: ahora tienes el perfil «{profile}» y acceso de {access}.',
      en: '{actor} changed your access to {class}: you now have the "{profile}" profile and {access} access.',
      ca: '{actor} ha canviat el teu accés a {class}: ara tens el perfil «{profile}» i accés de {access}.',
      val: '{actor} ha canviat el teu accés a {class}: ara tens el perfil «{profile}» i accés de {access}.',
      eu: '{actor} irakasleak {class} klaserako zure sarbidea aldatu du: orain «{profile}» profila eta {access} sarbidea dituzu.',
      gl: '{actor} cambiou o teu acceso a {class}: agora tes o perfil «{profile}» e acceso de {access}.',
      ast: '{actor} camudó\'l to accesu a {class}: agora tienes el perfil «{profile}» y accesu de {access}.',
      pt: '{actor} alterou o teu acesso a {class}: agora tens o perfil «{profile}» e acesso de {access}.',
      el: 'Ο/Η {actor} άλλαξε την πρόσβασή σου στο {class}: τώρα έχεις το προφίλ «{profile}» και πρόσβαση {access}.',
      ro: '{actor} ți-a schimbat accesul la {class}: acum ai profilul «{profile}» și acces de {access}.',
    },
  },
  class_teacher_removed: {
    title: {
      es: 'Ya no estás en una clase',
      en: 'You were removed from a class',
      ca: 'Ja no ets en una classe',
      val: 'Ja no estàs en una classe',
      eu: 'Jada ez zaude klase batean',
      gl: 'Xa non estás nunha clase',
      ast: 'Yá nun tas nuna clase',
      pt: 'Já não estás numa turma',
      el: 'Δεν είσαι πια σε μια τάξη',
      ro: 'Nu mai ești într-o clasă',
    },
    message: {
      es: '{actor} te ha quitado del profesorado de {class}.',
      en: '{actor} removed you from the teachers of {class}.',
      ca: '{actor} t\'ha tret del professorat de {class}.',
      val: '{actor} t\'ha llevat del professorat de {class}.',
      eu: '{actor} irakasleak {class} klaseko irakasleen artetik kendu zaitu.',
      gl: '{actor} quitoute do profesorado de {class}.',
      ast: '{actor} quitóte del profesoráu de {class}.',
      pt: '{actor} retirou-te do corpo docente de {class}.',
      el: 'Ο/Η {actor} σε αφαίρεσε από τους εκπαιδευτικούς του {class}.',
      ro: '{actor} te-a scos din echipa de profesori a clasei {class}.',
    },
  },
  class_ownership_received: {
    title: {
      es: 'Ahora una clase es tuya',
      en: 'A class is now yours',
      ca: 'Ara una classe és teva',
      val: 'Ara una classe és teua',
      eu: 'Klase bat zurea da orain',
      gl: 'Agora unha clase é túa',
      ast: 'Agora una clase ye tuya',
      pt: 'Agora uma turma é tua',
      el: 'Μια τάξη είναι πλέον δική σου',
      ro: 'O clasă este acum a ta',
    },
    message: {
      es: 'Ahora tienes la propiedad de {class}.',
      en: 'You are now the owner of {class}.',
      ca: 'Ara tens la propietat de {class}.',
      val: 'Ara tens la propietat de {class}.',
      eu: 'Orain {class} klasearen jabea zara.',
      gl: 'Agora tes a propiedade de {class}.',
      ast: 'Agora tienes la propiedá de {class}.',
      pt: 'Agora tens a propriedade de {class}.',
      el: 'Η τάξη {class} είναι πλέον δική σου.',
      ro: 'Clasa {class} este acum a ta.',
    },
  },
} as const satisfies Record<string, NotificationCopy>

export type NotificationCopyKey = keyof typeof NOTIFICATION_COPY

/**
 * Perfil y nivel del profesorado de una clase, para los avisos que los nombran.
 * Van como parámetro traducido: el aviso se compone en el idioma de quien lo recibe.
 */
export const CLASS_TEACHER_PROFILE_LABELS = {
  titular: {
    es: 'Titular',
    en: 'Main teacher',
    ca: 'Titular',
    val: 'Titular',
    eu: 'Titularra',
    gl: 'Titular',
    ast: 'Titular',
    pt: 'Titular',
    el: 'Υπεύθυνος/η',
    ro: 'Titular',
  },
  sustituto: {
    es: 'Sustituto',
    en: 'Substitute',
    ca: 'Substitut',
    val: 'Substitut',
    eu: 'Ordezkoa',
    gl: 'Substituto',
    ast: 'Sustitutu',
    pt: 'Substituto',
    el: 'Αναπληρωτής/τρια',
    ro: 'Suplinitor',
  },
  practicas: {
    es: 'Prácticas',
    en: 'Trainee',
    ca: 'Pràctiques',
    val: 'Pràctiques',
    eu: 'Praktikak',
    gl: 'Prácticas',
    ast: 'Práutiques',
    pt: 'Estágio',
    el: 'Πρακτική άσκηση',
    ro: 'Practică',
  },
} as const satisfies Record<string, Translations>

export const CLASS_ACCESS_LABELS = {
  read: {
    es: 'lectura',
    en: 'view-only',
    ca: 'lectura',
    val: 'lectura',
    eu: 'irakurketa',
    gl: 'lectura',
    ast: 'llectura',
    pt: 'leitura',
    el: 'ανάγνωσης',
    ro: 'citire',
  },
  edit: {
    es: 'edición',
    en: 'editing',
    ca: 'edició',
    val: 'edició',
    eu: 'edizio',
    gl: 'edición',
    ast: 'edición',
    pt: 'edição',
    el: 'επεξεργασίας',
    ro: 'editare',
  },
  admin: {
    es: 'administración',
    en: 'admin',
    ca: 'administració',
    val: 'administració',
    eu: 'administrazio',
    gl: 'administración',
    ast: 'alministración',
    pt: 'administração',
    el: 'διαχείρισης',
    ro: 'administrare',
  },
} as const satisfies Record<string, Translations>

/** Etiquetas del botón de los correos. */
export const EMAIL_ACTION_LABELS = {
  view_mission: {
    es: 'Ver la misión',
    en: 'View the mission',
    ca: 'Veure la missió',
    val: 'Veure la missió',
    eu: 'Ikusi misioa',
    gl: 'Ver a misión',
    ast: 'Ver la misión',
    pt: 'Ver a missão',
    el: 'Δες την αποστολή',
    ro: 'Vezi misiunea',
  },
  open: {
    es: 'Abrir en ITAKAI',
    en: 'Open in ITAKAI',
    ca: 'Obrir a ITAKAI',
    val: 'Obrir en ITAKAI',
    eu: 'Ireki ITAKAIn',
    gl: 'Abrir en ITAKAI',
    ast: 'Abrir n\'ITAKAI',
    pt: 'Abrir no ITAKAI',
    el: 'Άνοιγμα στο ITAKAI',
    ro: 'Deschide în ITAKAI',
  },
} as const satisfies Record<string, Translations>

export type EmailActionKey = keyof typeof EMAIL_ACTION_LABELS

/**
 * Pie de los correos de aviso: dónde se apagan. Nombra la pestaña del perfil del
 * alumnado (`student.profile.tabs.settings`) y la tarjeta, que se llama como el
 * menú (`common.notifications.title`); si cambian en la app, cámbialos aquí.
 */
export const EMAIL_FOOTER: Translations = {
  es: 'Puedes desactivar estos correos en tu perfil, pestaña «Configuración», apartado «Avisos».',
  en: 'You can turn these emails off in your profile, "Settings" tab, "Notifications" section.',
  ca: 'Pots desactivar aquests correus al teu perfil, pestanya «Configuració», apartat «Avisos».',
  val: 'Pots desactivar estos correus en el teu perfil, pestanya «Configuració», apartat «Avisos».',
  eu: 'Mezu hauek zure profilean desaktiba ditzakezu, «Ezarpenak» fitxako «Abisuak» atalean.',
  gl: 'Podes desactivar estes correos no teu perfil, lapela «Configuración», apartado «Avisos».',
  ast: 'Pues desactivar estos correos nel to perfil, pestaña «Configuración», apartáu «Avisos».',
  pt: 'Podes desativar estes emails no teu perfil, separador «Definições», secção «Avisos».',
  el: 'Μπορείς να απενεργοποιήσεις αυτά τα email από το προφίλ σου, καρτέλα «Ρυθμίσεις», ενότητα «Ειδοποιήσεις».',
  ro: 'Poți dezactiva aceste emailuri din profilul tău, fila „Setări”, secțiunea „Notificări”.',
}

export const DEFAULT_LANGUAGE: AppLanguage = 'es'

/**
 * Valor de un `{parametro}`: tal cual (un nombre, un número) o, si es una palabra
 * de la propia aplicación, con su traducción a cada idioma.
 */
export type NotificationParam = string | number | Translations

/** Sustituye `{parametro}` por su valor. Lo que no venga se deja tal cual. */
export function interpolate(template: string, params: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match
  )
}

/** Los parámetros en el idioma de quien recibe el aviso. */
function localizeParams(params: Record<string, NotificationParam>, language: AppLanguage) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === 'object' ? (value[language] ?? value[DEFAULT_LANGUAGE]) : value,
    ])
  )
}

/** Compone título y mensaje de un aviso en el idioma del destinatario. */
export function renderNotificationCopy(
  key: NotificationCopyKey,
  language: AppLanguage,
  params: Record<string, NotificationParam> = {}
) {
  const copy = NOTIFICATION_COPY[key]
  const values = localizeParams(params, language)
  return {
    title: interpolate(copy.title[language] ?? copy.title[DEFAULT_LANGUAGE], values),
    message: interpolate(copy.message[language] ?? copy.message[DEFAULT_LANGUAGE], values),
  }
}

export function emailActionLabel(key: EmailActionKey, language: AppLanguage) {
  const labels = EMAIL_ACTION_LABELS[key]
  return labels[language] ?? labels[DEFAULT_LANGUAGE]
}

export function emailFooter(language: AppLanguage) {
  return EMAIL_FOOTER[language] ?? EMAIL_FOOTER[DEFAULT_LANGUAGE]
}
