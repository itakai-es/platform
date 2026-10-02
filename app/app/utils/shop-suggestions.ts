import type { ShopItemKind, ShopItemUsage } from '~/stores/shop'

/**
 * Biblioteca de artículos sugeridos para la tienda. El profesor los añade de un
 * toque (se crean como artículos reales de su clase, editables después) en lugar
 * de partir de un formulario en blanco. Es contenido, no UI: va en español como
 * el catálogo sembrado por defecto.
 */
export interface ShopSuggestion {
  name: string
  description: string
  price: number
  kind: ShopItemKind
  manaCost: number
  usage: ShopItemUsage
  lifeRestore?: number
}

export const SHOP_SUGGESTIONS: ShopSuggestion[] = [
  // ── Recompensas de un uso ──
  {
    name: 'Pista de examen',
    description: 'Canjea una pista para una pregunta del próximo examen.',
    price: 150,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
  },
  {
    name: 'Saltar una tarea',
    description: 'Salta una tarea sin penalización (no aplica a exámenes).',
    price: 500,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
  },
  {
    name: 'Prórroga de 1 día',
    description: 'Amplía 24 h el plazo de una entrega.',
    price: 400,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
  },
  {
    name: 'Elegir la música',
    description: 'Pon tu lista de reproducción durante una sesión de trabajo.',
    price: 200,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
  },
  {
    name: 'Sin deberes un día',
    description: 'Un día libre de tarea para casa.',
    price: 350,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
  },
  {
    name: '+0,5 en un examen',
    description: 'Suma medio punto a la nota de un examen a tu elección.',
    price: 1000,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
  },
  {
    name: 'Poción menor de vida',
    description: 'Recupera 25 puntos de vida al canjearla.',
    price: 150,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
    lifeRestore: 25,
  },
  {
    name: 'Poción de vida',
    description: 'Recupera 50 puntos de vida al canjearla.',
    price: 300,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
    lifeRestore: 50,
  },
  {
    name: 'Poción mayor de vida',
    description: 'Recupera 100 puntos de vida al canjearla.',
    price: 600,
    kind: 'reward',
    manaCost: 0,
    usage: 'single',
    lifeRestore: 100,
  },
  // ── Recompensas ilimitadas (privilegios permanentes) ──
  {
    name: 'Asiento libre',
    description: 'Siéntate donde quieras durante el resto del curso.',
    price: 800,
    kind: 'reward',
    manaCost: 0,
    usage: 'unlimited',
  },
  {
    name: 'Avatar personalizado',
    description: 'Desbloquea un avatar especial para tu perfil de la clase.',
    price: 600,
    kind: 'reward',
    manaCost: 0,
    usage: 'unlimited',
  },
  // ── Poderes (se compran con monedas y se usan gastando maná) ──
  {
    name: 'Pista mágica',
    description: 'Pide a tu docente una pista extra cuando la necesites.',
    price: 300,
    kind: 'power',
    manaCost: 20,
    usage: 'single',
  },
  {
    name: 'Repetir entrega',
    description: 'Vuelve a entregar un enigma ya corregido.',
    price: 500,
    kind: 'power',
    manaCost: 40,
    usage: 'single',
  },
  {
    name: 'Prórroga exprés',
    description: 'Amplía el plazo de una entrega al instante.',
    price: 400,
    kind: 'power',
    manaCost: 30,
    usage: 'single',
  },
  {
    name: 'Comodín de respuesta',
    description: 'Descarta una opción incorrecta en una pregunta.',
    price: 700,
    kind: 'power',
    manaCost: 50,
    usage: 'single',
  },
]
