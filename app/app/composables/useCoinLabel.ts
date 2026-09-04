/**
 * useCoinLabel — nombre de la moneda de la plataforma.
 *
 * Fuente única de verdad: la clave i18n `common.resources.coins`. Antes la
 * palabra estaba escrita a mano en once claves distintas por idioma, así que
 * renombrarla («Itacoin», Fase 3 punto 5) obligaba a tocar ~110 sitios; ahora
 * son diez, uno por idioma, y ningún componente vuelve a escribirla.
 *
 * Las frases que la contienen la reciben interpolada como `{coins}` y siempre
 * en su forma de presentación: el nombre de la moneda es un nombre propio, así
 * que no se declina ni cambia de mayúscula según la posición.
 *
 * Cuando el nombre pase a ser configurable por instancia o por clase, el
 * override entra aquí dentro y el resto de la aplicación no se entera.
 */
export function useCoinLabel() {
  const { t } = useI18n()

  const coinLabel = computed(() => t('common.resources.coins'))

  return { coinLabel }
}
