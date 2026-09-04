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
  join_accepted: {
    title: {
      es: 'Solicitud aceptada',
      en: 'Request accepted',
      ca: 'Sol·licitud acceptada',
      val: 'Sol·licitud acceptada',
      eu: 'Eskaera onartuta',
      gl: 'Solicitude aceptada',
      ast: 'Solicitú aceptada',
      pt: 'Pedido aceite',
      el: 'Το αίτημα εγκρίθηκε',
      ro: 'Cerere acceptată',
    },
    message: {
      es: 'Tu solicitud para unirte a {class} ha sido aceptada.',
      en: 'Your request to join {class} was accepted.',
      ca: 'La teva sol·licitud per unir-te a {class} s\'ha acceptat.',
      val: 'La teua sol·licitud per unir-te a {class} s\'ha acceptat.',
      eu: '{class} klasean sartzeko zure eskaera onartu dute.',
      gl: 'A túa solicitude para unirte a {class} foi aceptada.',
      ast: 'La to solicitú pa xunite a {class} aceptóse.',
      pt: 'O teu pedido para entrar em {class} foi aceite.',
      el: 'Το αίτημά σου να μπεις στο {class} εγκρίθηκε.',
      ro: 'Cererea ta de a te alătura la {class} a fost acceptată.',
    },
  },
  join_rejected: {
    title: {
      es: 'Solicitud rechazada',
      en: 'Request declined',
      ca: 'Sol·licitud rebutjada',
      val: 'Sol·licitud rebutjada',
      eu: 'Eskaera ukatuta',
      gl: 'Solicitude rexeitada',
      ast: 'Solicitú refugada',
      pt: 'Pedido recusado',
      el: 'Το αίτημα απορρίφθηκε',
      ro: 'Cerere respinsă',
    },
    message: {
      es: 'Tu solicitud para unirte a {class} ha sido rechazada.',
      en: 'Your request to join {class} was declined.',
      ca: 'La teva sol·licitud per unir-te a {class} s\'ha rebutjat.',
      val: 'La teua sol·licitud per unir-te a {class} s\'ha rebutjat.',
      eu: '{class} klasean sartzeko zure eskaera ukatu dute.',
      gl: 'A túa solicitude para unirte a {class} foi rexeitada.',
      ast: 'La to solicitú pa xunite a {class} refugóse.',
      pt: 'O teu pedido para entrar em {class} foi recusado.',
      el: 'Το αίτημά σου να μπεις στο {class} απορρίφθηκε.',
      ro: 'Cererea ta de a te alătura la {class} a fost respinsă.',
    },
  },
  class_invitation: {
    title: {
      es: 'Nueva invitación',
      en: 'New invitation',
      ca: 'Nova invitació',
      val: 'Nova invitació',
      eu: 'Gonbidapen berria',
      gl: 'Nova invitación',
      ast: 'Nueva invitación',
      pt: 'Novo convite',
      el: 'Νέα πρόσκληση',
      ro: 'Invitație nouă',
    },
    message: {
      es: 'Has sido invitado a unirte a {class}.',
      en: 'You have been invited to join {class}.',
      ca: 'T\'han convidat a unir-te a {class}.',
      val: 'T\'han convidat a unir-te a {class}.',
      eu: '{class} klasean sartzeko gonbidapena jaso duzu.',
      gl: 'Convidáronte a unirte a {class}.',
      ast: 'Convidáronte a xunite a {class}.',
      pt: 'Foste convidado a entrar em {class}.',
      el: 'Έλαβες πρόσκληση να μπεις στο {class}.',
      ro: 'Ai fost invitat să te alături la {class}.',
    },
  },
} as const satisfies Record<string, NotificationCopy>

export type NotificationCopyKey = keyof typeof NOTIFICATION_COPY

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
  go_to_class: {
    es: 'Ir a la clase',
    en: 'Go to the class',
    ca: 'Anar a la classe',
    val: 'Anar a la classe',
    eu: 'Joan klasera',
    gl: 'Ir á clase',
    ast: 'Dir a la clase',
    pt: 'Ir para a turma',
    el: 'Πήγαινε στην τάξη',
    ro: 'Mergi la clasă',
  },
  my_classes: {
    es: 'Ver mis clases',
    en: 'View my classes',
    ca: 'Veure les meves classes',
    val: 'Veure les meues classes',
    eu: 'Ikusi nire klaseak',
    gl: 'Ver as miñas clases',
    ast: 'Ver les mios clases',
    pt: 'Ver as minhas turmas',
    el: 'Δες τις τάξεις μου',
    ro: 'Vezi clasele mele',
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

/** Pie de los correos de aviso: dónde se apagan. */
export const EMAIL_FOOTER: Translations = {
  es: 'Puedes desactivar estos avisos desde tu perfil, en Configuración.',
  en: 'You can turn these alerts off in your profile, under Settings.',
  ca: 'Pots desactivar aquests avisos al teu perfil, a Configuració.',
  val: 'Pots desactivar estos avisos al teu perfil, en Configuració.',
  eu: 'Abisu hauek zure profilean desaktiba ditzakezu, Konfigurazioan.',
  gl: 'Podes desactivar estes avisos no teu perfil, en Configuración.',
  ast: 'Pues desactivar estos avisos nel to perfil, en Configuración.',
  pt: 'Podes desativar estes avisos no teu perfil, em Configuração.',
  el: 'Μπορείς να απενεργοποιήσεις αυτές τις ειδοποιήσεις από το προφίλ σου, στις Ρυθμίσεις.',
  ro: 'Poți dezactiva aceste anunțuri din profilul tău, la Configurare.',
}

export const DEFAULT_LANGUAGE: AppLanguage = 'es'

/** Sustituye `{parametro}` por su valor. Lo que no venga se deja tal cual. */
export function interpolate(template: string, params: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match
  )
}

/** Compone título y mensaje de un aviso en el idioma del destinatario. */
export function renderNotificationCopy(
  key: NotificationCopyKey,
  language: AppLanguage,
  params: Record<string, string | number> = {}
) {
  const copy = NOTIFICATION_COPY[key]
  return {
    title: interpolate(copy.title[language] ?? copy.title[DEFAULT_LANGUAGE], params),
    message: interpolate(copy.message[language] ?? copy.message[DEFAULT_LANGUAGE], params),
  }
}

export function emailActionLabel(key: EmailActionKey, language: AppLanguage) {
  const labels = EMAIL_ACTION_LABELS[key]
  return labels[language] ?? labels[DEFAULT_LANGUAGE]
}

export function emailFooter(language: AppLanguage) {
  return EMAIL_FOOTER[language] ?? EMAIL_FOOTER[DEFAULT_LANGUAGE]
}
