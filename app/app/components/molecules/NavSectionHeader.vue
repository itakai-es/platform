<template>
  <!--
    Título de un bloque del menú lateral («Gestión», «Clases», «Cuenta»…), el
    mismo en escritorio y en móvil. Compacto: separa los bloques sin gastar la
    altura de una fila, que en un portátil el menú ya va justo. El relleno
    horizontal es el de NavItem, para que el título alinee con los iconos.
  -->
  <div class="flex items-center gap-2 px-4 pt-3 pb-1">
    <component :is="icon" v-if="icon" class="w-4 h-4 text-navy-700/70" aria-hidden="true" />
    <span class="text-sm font-semibold text-navy-700/70">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  /** Icono opcional delante del título. */
  icon?: Component
}>()
</script>
