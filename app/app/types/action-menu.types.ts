/** Las opciones del menú de acciones «⋮» (`ActionMenu`). */
import type { Component } from 'vue'

/** Una opción del menú «⋮». */
export interface ActionMenuOption {
  id: string
  label: string
  icon?: Component
  /** Acción destructiva: va en rojo. */
  danger?: boolean
  disabled?: boolean
}

/** Una línea que separa grupos de opciones. */
export interface ActionMenuDivider {
  divider: true
}

export type ActionMenuItem = ActionMenuOption | ActionMenuDivider
