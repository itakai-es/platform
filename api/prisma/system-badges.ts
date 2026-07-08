/**
 * Insignias del sistema (auto-otorgadas, `teacherId = null`).
 * Compartidas por el seed de desarrollo (`seed.ts`) y el bootstrap de
 * auto-hospedaje (`bootstrap.ts`) para no duplicar la lista.
 */
export const SYSTEM_BADGES = [
  // Missions completed
  { name: 'Templo del Héroe', description: 'Completa tu primera misión', imageUrl: '/badges/templo-heroe.svg', category: 'missions', rarity: 'common', triggerType: 'missions_completed', triggerValue: 1 },
  { name: 'Guerrero de Bronce', description: 'Completa 10 misiones', imageUrl: '/badges/guerrero-bronce.svg', category: 'missions', rarity: 'common', triggerType: 'missions_completed', triggerValue: 10 },
  { name: 'Guerrero de Plata', description: 'Completa 25 misiones', imageUrl: '/badges/guerrero-plata.svg', category: 'missions', rarity: 'rare', triggerType: 'missions_completed', triggerValue: 25 },
  { name: 'Guerrero de Oro', description: 'Completa 50 misiones', imageUrl: '/badges/guerrero-oro.svg', category: 'missions', rarity: 'epic', triggerType: 'missions_completed', triggerValue: 50 },
  { name: 'Campeón Olímpico', description: 'Completa 100 misiones', imageUrl: '/badges/campeon-olimpico.svg', category: 'missions', rarity: 'legendary', triggerType: 'missions_completed', triggerValue: 100 },
  // XP total
  { name: 'Ambrosía del Novato', description: 'Alcanza 500 XP en una clase', imageUrl: '/badges/ambrosia-novato.svg', category: 'xp', rarity: 'common', triggerType: 'xp_total', triggerValue: 500 },
  { name: 'Néctar de Progreso', description: 'Alcanza 2.500 XP en una clase', imageUrl: '/badges/nectar-progreso.svg', category: 'xp', rarity: 'rare', triggerType: 'xp_total', triggerValue: 2500 },
  { name: 'Tridente de Poseidón', description: 'Alcanza 10.000 XP en una clase', imageUrl: '/badges/tridente-poseidon.svg', category: 'xp', rarity: 'epic', triggerType: 'xp_total', triggerValue: 10000 },
  { name: 'Rayo de Zeus', description: 'Alcanza 50.000 XP en una clase', imageUrl: '/badges/rayo-zeus.svg', category: 'xp', rarity: 'legendary', triggerType: 'xp_total', triggerValue: 50000 },
  // Level reached
  { name: 'Iniciado', description: 'Alcanza el nivel 5 en una clase', imageUrl: '/badges/iniciado.svg', category: 'level', rarity: 'common', triggerType: 'level_reached', triggerValue: 5 },
  { name: 'Corona de Laurel', description: 'Alcanza el nivel 15 en una clase', imageUrl: '/badges/corona-laurel.svg', category: 'level', rarity: 'rare', triggerType: 'level_reached', triggerValue: 15 },
  { name: 'Manto de Hera', description: 'Alcanza el nivel 30 en una clase', imageUrl: '/badges/manto-hera.svg', category: 'level', rarity: 'epic', triggerType: 'level_reached', triggerValue: 30 },
  { name: 'Trono del Olimpo', description: 'Alcanza el nivel 50 en una clase', imageUrl: '/badges/trono-olimpo.svg', category: 'level', rarity: 'legendary', triggerType: 'level_reached', triggerValue: 50 },
]
