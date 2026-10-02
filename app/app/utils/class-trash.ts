import { resolveDateLocale } from './notifications'

/**
 * Papelera de clases en la interfaz. Una clase enviada a la papelera se puede
 * restaurar durante `CLASS_TRASH_DAYS` días; después la purga la borra para
 * siempre. El número es el mismo que `CLASS_TRASH_DAYS` de la API
 * (class-trash.service.ts): la papelera lo trae en `purgeDays`, pero el detalle
 * de una clase solo trae `deletedAt` y la fecha se calcula aquí.
 */
export const CLASS_TRASH_DAYS = 30

/** A partir de cuántos días restantes la cuenta atrás se destaca y da la hora exacta. */
export const CLASS_TRASH_FEW_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

/** Cuándo se borra para siempre una clase enviada a la papelera en `deletedAt`. */
export function classPurgeAt(deletedAt: string | Date): Date {
  return new Date(new Date(deletedAt).getTime() + CLASS_TRASH_DAYS * DAY_MS)
}

/** Fecha en el idioma de la interfaz; con `withTime`, también la hora. */
export function formatTrashDate(date: string | Date, code: string, withTime = false): string {
  return new Intl.DateTimeFormat(resolveDateLocale(code), {
    dateStyle: 'long',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(new Date(date))
}
