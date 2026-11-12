/**
 * Números en el idioma de la app, nunca en uno fijo: «1.234» en castellano,
 * «1,234» en inglés. Sin Vue, para probarlo en Node (ver `useNumberFormat`).
 *
 * El idioma pasa por `resolveDateLocale`: el valenciano cae al catalán y el
 * asturiano, el gallego y el euskera, al castellano si el navegador no los
 * conoce, en vez de caer en el idioma del navegador.
 */
import { resolveDateLocale } from './notifications'

const formatters = new Map<string, Intl.NumberFormat>()

function formatterFor(language: string, options: Intl.NumberFormatOptions = {}) {
  const key = `${language}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(resolveDateLocale(language), options)
    formatters.set(key, formatter)
  }
  return formatter
}

/** Un número con los separadores del idioma. */
export function formatNumber(value: number, language: string): string {
  return formatterFor(language).format(value)
}

/** Un número con su signo siempre, salvo el 0: «+925», «−3,5». */
export function formatSignedNumber(value: number, language: string): string {
  return formatterFor(language, { signDisplay: 'exceptZero' }).format(value)
}

/** Un número abreviado (12,3 mil; 12.3K) para las cifras grandes de las tarjetas. */
export function formatCompactNumber(value: number, language: string): string {
  return formatterFor(language, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
