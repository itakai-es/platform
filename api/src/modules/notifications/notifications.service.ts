import { prisma } from '../../config/database.js'
import type { NotificationPriority, NotificationType, Prisma } from '../../generated/prisma/client.js'
import type { AppLanguage } from '../settings/settings.types.js'
import { sendNotificationEmail } from '../../utils/email.js'
import { toAbsoluteAppUrl } from '../../utils/app-url.js'
import {
  DEFAULT_LANGUAGE,
  emailActionLabel,
  renderNotificationCopy,
  type EmailActionKey,
  type NotificationCopyKey,
} from './notifications.messages.js'

/**
 * Servicio central de notificaciones (Fase 3, punto 3).
 *
 * Antes cada sitio que quería avisar a alguien hacía su propio
 * `prisma.notification.create`, así que no había forma de decidir en un único
 * lugar qué se manda también por correo, en qué idioma, ni de evitar duplicados.
 * Todo aviso nuevo pasa por aquí.
 *
 * Dos reglas:
 *  - **La notificación interna se crea siempre** (es la que ve el usuario en el
 *    panel) y el correo es un extra que solo sale si el destinatario tiene un
 *    email de verdad y no ha desactivado los avisos por correo en su perfil.
 *  - **El texto se compone en el idioma del destinatario**, no en el de quien
 *    dispara el aviso: ver `notifications.messages.ts`.
 */

/** Datos del destinatario que hacen falta para componer y repartir un aviso. */
export interface NotificationRecipient {
  id: string
  email: string | null
  language: AppLanguage
  emailNotifications: boolean
}

export interface NotifyInput {
  userId: string
  type: NotificationType
  /** Clave del catálogo de textos; se traduce al idioma del destinatario. */
  copy: NotificationCopyKey
  /** Valores de los `{parametros}` del texto. */
  params?: Record<string, string | number>
  /**
   * Texto libre que sustituye al del catálogo. Solo para lo que escribe una
   * persona (el motivo con el que un profesor rechaza una solicitud): no se
   * puede traducir, así que se muestra tal cual.
   */
  messageOverride?: string
  priority?: NotificationPriority
  /** Ruta interna de la aplicación, p. ej. `/alumno/misiones/abc`. */
  actionUrl?: string
  metadata?: Record<string, unknown>
  expiresAt?: Date
  /**
   * Clave de deduplicación. Si ya existe una notificación del mismo usuario con
   * la misma clave, no se crea otra. Es lo que permite que una tarea periódica
   * se ejecute cada quince minutos sin acribillar a nadie.
   */
  dedupeKey?: string
  /** Manda también el aviso por correo (si el destinatario puede recibirlo). */
  alsoByEmail?: boolean
  /** Etiqueta del botón del correo. Por defecto, «Abrir en ITAKAI». */
  emailAction?: EmailActionKey
  /**
   * Destinatario ya resuelto. `notifyMany` los carga todos de una consulta;
   * cuando no viene, se busca aquí.
   */
  recipient?: NotificationRecipient
}

const RECIPIENT_SELECT = {
  id: true,
  email: true,
  settings: { select: { language: true, emailNotifications: true } },
} as const

type RecipientRow = {
  id: string
  email: string | null
  settings: { language: string; emailNotifications: boolean } | null
}

/**
 * Sin fila de ajustes el usuario nunca ha tocado sus preferencias: se aplican
 * los valores por defecto del modelo (idioma castellano, avisos por correo sí).
 */
function toRecipient(row: RecipientRow): NotificationRecipient {
  return {
    id: row.id,
    email: row.email,
    language: (row.settings?.language as AppLanguage) ?? DEFAULT_LANGUAGE,
    emailNotifications: row.settings?.emailNotifications ?? true,
  }
}

export async function loadRecipients(userIds: string[]): Promise<Map<string, NotificationRecipient>> {
  const rows = await prisma.user.findMany({
    where: { id: { in: [...new Set(userIds)] } },
    select: RECIPIENT_SELECT,
  })
  return new Map(rows.map(row => [row.id, toRecipient(row)]))
}

async function loadRecipient(userId: string): Promise<NotificationRecipient | null> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: RECIPIENT_SELECT })
  return row ? toRecipient(row) : null
}

/**
 * ¿Se le puede escribir a este usuario?
 *
 * Hoy `User.email` es obligatorio y único, así que siempre es que sí. Cuando
 * existan las cuentas de menores sin correo (punto 9), esas cuentas llevarán una
 * dirección interna no entregable y este es el único sitio que hay que enseñar a
 * reconocerla: el resto del sistema ya solo crea avisos internos.
 */
function isDeliverableEmail(email: string | null | undefined): email is string {
  if (!email) return false
  return email.includes('@') && !email.endsWith('.invalid')
}

async function deliverEmail(
  recipient: NotificationRecipient,
  input: NotifyInput,
  text: { title: string; message: string }
) {
  if (!isDeliverableEmail(recipient.email)) return false
  if (!recipient.emailNotifications) return false

  const actionUrl = input.actionUrl ? await toAbsoluteAppUrl(input.actionUrl) : undefined

  await sendNotificationEmail(recipient.email, recipient.language, {
    title: text.title,
    message: text.message,
    actionUrl,
    actionLabel: emailActionLabel(input.emailAction ?? 'open', recipient.language),
  })

  return true
}

/**
 * Crea un aviso. Devuelve `null` si se descartó por duplicado o si el
 * destinatario ya no existe.
 *
 * Nunca lanza por culpa del correo: que Resend esté caído no puede tumbar la
 * entrega que el alumno acaba de hacer.
 */
export async function notify(input: NotifyInput) {
  if (input.dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        metadata: { path: ['dedupeKey'], equals: input.dedupeKey },
      },
      select: { id: true },
    })
    if (existing) return null
  }

  const recipient = input.recipient ?? (await loadRecipient(input.userId))
  if (!recipient) return null

  const copy = renderNotificationCopy(input.copy, recipient.language, input.params)
  const text = { title: copy.title, message: input.messageOverride || copy.message }

  const metadata: Prisma.InputJsonValue = {
    ...(input.metadata ?? {}),
    ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
  }

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: text.title,
      message: text.message,
      priority: input.priority ?? 'medium',
      actionUrl: input.actionUrl,
      metadata,
      expiresAt: input.expiresAt,
    },
  })

  if (input.alsoByEmail) {
    try {
      await deliverEmail(recipient, input, text)
    } catch (error) {
      console.error('[notifications] no se pudo enviar el correo del aviso:', error)
    }
  }

  return notification
}

/**
 * Varios avisos de una tirada. Carga todos los destinatarios en una sola
 * consulta —son decenas de alumnos por misión— y devuelve cuántos avisos se
 * crearon de verdad, descontando los duplicados.
 */
export async function notifyMany(inputs: NotifyInput[]) {
  if (inputs.length === 0) return 0

  const recipients = await loadRecipients(inputs.map(input => input.userId))

  let created = 0
  for (const input of inputs) {
    const result = await notify({ ...input, recipient: recipients.get(input.userId) })
    if (result) created += 1
  }
  return created
}
