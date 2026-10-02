/**
 * Catálogo sembrado de comportamientos (positivos y negativos) que el profesor
 * puede aplicar sobre los alumnos. De momento es contenido visual: las cantidades
 * NO se aplican aún a los saldos (XP/monedas/vidas viven en backends distintos y
 * algunos no existen todavía). Cuando haya backend de comportamientos, se
 * persistirán como plantillas por clase y se registrará cada aplicación.
 */
export type BehaviorKind = 'positive' | 'negative'

export interface BehaviorSuggestion {
  name: string
  description: string
  kind: BehaviorKind
  /** Cantidad absoluta; el signo lo da el tipo (positive → +, negative → −). */
  xp?: number
  coins?: number
  lives?: number
}

export const BEHAVIOR_SUGGESTIONS: BehaviorSuggestion[] = [
  // ── Positivos ──
  {
    name: 'Buena participación',
    description: 'Intervención valiosa en clase o pregunta acertada.',
    kind: 'positive',
    xp: 10,
    coins: 5,
  },
  {
    name: 'Ayuda a quien lo necesita',
    description: 'Apoya con paciencia a alguien de la clase o le explica algo.',
    kind: 'positive',
    xp: 15,
    coins: 5,
    lives: 5,
  },
  {
    name: 'Excelente trabajo en grupo',
    description: 'Buena dinámica y colaboración con su equipo.',
    kind: 'positive',
    xp: 20,
    coins: 10,
  },
  {
    name: 'Idea creativa',
    description: 'Aporta una solución original o un enfoque distinto.',
    kind: 'positive',
    xp: 15,
    coins: 10,
  },
  {
    name: 'Aprende y mejora',
    description: 'Progresa visiblemente respecto a la última sesión.',
    kind: 'positive',
    xp: 25,
    coins: 10,
    lives: 10,
  },
  // ── Negativos ──
  {
    name: 'Llegar tarde',
    description: 'Entrar al aula después del inicio sin justificación.',
    kind: 'negative',
    lives: 5,
  },
  {
    name: 'Olvidar el material',
    description: 'No traer lo necesario para trabajar en clase.',
    kind: 'negative',
    coins: 5,
    lives: 3,
  },
  {
    name: 'Interrumpir la clase',
    description: 'Hablar fuera de turno o distraer al resto.',
    kind: 'negative',
    xp: 5,
    lives: 10,
  },
  {
    name: 'No entregar la tarea',
    description: 'No entregar el trabajo encomendado a tiempo.',
    kind: 'negative',
    xp: 10,
    lives: 10,
  },
  {
    name: 'Falta de respeto',
    description: 'Comportamiento irrespetuoso con la clase o con su docente.',
    kind: 'negative',
    coins: 10,
    lives: 20,
  },
]
