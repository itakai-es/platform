/**
 * Lo que le falta a alguien para subir de nivel, escrito: «Faltan 301 XP para el
 * nivel 5» o, en el último, «Nivel máximo». La XP nunca va «sobre un máximo»
 * («2/303 XP» se leía como si fuera la XP total). La barra o el anillo del nivel
 * siguen dibujando cuánto lleva del tramo.
 *
 * `requiredXp` es lo que pide el tramo en el que está (0 en el último nivel) y
 * `currentXp`, lo que lleva de él.
 */
export function useLevelXpText() {
  const { t } = useI18n()
  const { formatNumber } = useNumberFormat()

  return (level: { level: number; currentXp: number; requiredXp: number }) => {
    if (level.requiredXp <= 0) return t('student.components.class_xp_bar.max_level')
    const remaining = Math.max(0, level.requiredXp - level.currentXp)
    return t(
      'student.components.class_xp_bar.xp_to_next',
      { count: formatNumber(remaining), level: level.level + 1 },
      remaining
    )
  }
}
