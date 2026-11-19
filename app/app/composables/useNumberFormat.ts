import { formatPercent, formatSignedPercent } from '~/utils/chart-format'
import { formatCompactNumber, formatNumber, formatSignedNumber } from '~/utils/number-format'

/** Números en el idioma activo de la app (ver utils/number-format.ts). */
export function useNumberFormat() {
  const { locale } = useI18n()
  return {
    formatNumber: (value: number) => formatNumber(value, locale.value),
    formatSignedNumber: (value: number) => formatSignedNumber(value, locale.value),
    formatCompactNumber: (value: number) => formatCompactNumber(value, locale.value),
    formatPercent: (value: number, maximumFractionDigits = 0) =>
      formatPercent(value, locale.value, maximumFractionDigits),
    formatSignedPercent: (value: number) => formatSignedPercent(value, locale.value),
  }
}
