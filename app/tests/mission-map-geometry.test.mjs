/**
 * Pruebas de utils/mission-map-geometry.ts (dónde va cada cosa en el mapa de
 * misiones: medallones, salida, meta, carretera y fondo). Dentro de
 * itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-map-geometry.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { layoutMissionMap } = await import('http://localhost:4000/_nuxt/utils/mission-map-layout.ts')
const {
  MAP_SIZES,
  BOARD_MIN_WIDTH,
  mapShape,
  boardColumns,
  roadDown,
  roadVia,
  roadAcross,
  roadTurn,
  mapGeometry,
  mapIslands,
  mapSparkles,
} = await import('http://localhost:4000/_nuxt/utils/mission-map-geometry.ts')

const m = (id, prerequisiteIds = [], extra = {}) => ({
  id,
  title: id.toUpperCase(),
  status: 'activa',
  prerequisiteIds,
  ...extra,
})
const B = MAP_SIZES.board
const C = MAP_SIZES.column
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 0.11, `${message}: ${a} ≠ ${b}`)
/** Los números de un trazo SVG, por parejas (x, y). */
const points = d => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(p => [Number(p[1]), Number(p[2])])

/** Puntos de un trazo (M, L y C), muy juntos: por donde pasa de verdad la carretera. */
function trace(d) {
  const tokens = d.trim().split(/\s+/)
  const out = []
  let at
  for (let i = 0; i < tokens.length; ) {
    const command = tokens[i++]
    const next = () => [Number(tokens[i++]), Number(tokens[i++])]
    if (command === 'M') {
      at = next()
      out.push(at)
    } else if (command === 'L') {
      const to = next()
      for (let s = 1; s <= 40; s += 1) {
        out.push([at[0] + ((to[0] - at[0]) * s) / 40, at[1] + ((to[1] - at[1]) * s) / 40])
      }
      at = to
    } else {
      const [p1, p2, p3] = [next(), next(), next()]
      for (let s = 1; s <= 80; s += 1) {
        const t = s / 80
        const u = 1 - t
        out.push(
          [0, 1].map(
            k => u ** 3 * at[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k]
          )
        )
      }
      at = p3
    }
  }
  return out
}

/**
 * Lo más cerca que pasa una carretera del centro de un medallón que no es el
 * suyo (ni de donde sale ni adonde llega), y cuál.
 */
function closest(geo) {
  let min = Infinity
  let where = ''
  for (const road of geo.roads) {
    const path = trace(road.d)
    for (const [id, place] of geo.places) {
      if (id === road.from || id === road.to) continue
      for (const [x, y] of path) {
        const distance = Math.hypot(x - place.x, y - place.y)
        if (distance < min) [min, where] = [distance, `${road.key} junto a ${id}`]
      }
    }
  }
  return { min, where }
}

/** 40 misiones con ramas: capas de anchos distintos, cruces y aristas que saltan capas. */
function branched40() {
  const layers = [
    [0],
    [1, 2, 3],
    [4, 5, 6, 7, 8],
    [9, 10],
    [11, 12, 13, 14, 15, 16],
    [17],
    [18, 19, 20, 21],
    [22, 23, 24, 25, 26, 27, 28],
    [29, 30, 31],
    [32, 33, 34, 35],
    [36, 37, 38],
    [39],
  ]
  const needs = []
  let seed = 3
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  layers.forEach((layer, index) => {
    for (const i of layer) {
      const list = new Set()
      if (index > 0) {
        const previous = layers[index - 1]
        list.add(previous[Math.floor(random() * previous.length)])
        if (random() < 0.4)
          list.add(previous[previous.length - 1 - Math.floor(random() * previous.length)])
        if (index > 1 && random() < 0.25) {
          const before = layers[index - 2]
          list.add(before[Math.floor(random() * before.length)])
        }
      }
      needs[i] = [...list]
    }
  })
  needs[5] = [1, 2, 3]
  needs[4] = [3]
  needs[8] = [1]
  return needs.map((list, i) =>
    m(
      `m${i}`,
      list.map(r => `m${r}`)
    )
  )
}

/** Unas misiones al azar (siempre las mismas para la misma semilla), con muchas sin requisitos. */
function randomMissions(count, seed, chance) {
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  return Array.from({ length: count }, (_, i) => {
    const list = new Set()
    if (i > 0 && random() < chance) {
      for (let k = 1 + Math.floor(random() * 3); k > 0; k -= 1)
        list.add(`m${Math.floor(random() * i)}`)
    }
    return m(`m${i}`, [...list])
  })
}

test('la forma según el ancho: tablero desde BOARD_MIN_WIDTH; columna por debajo', () => {
  assert.equal(mapShape(320), 'column')
  assert.equal(mapShape(BOARD_MIN_WIDTH - 1), 'column')
  assert.equal(mapShape(BOARD_MIN_WIDTH), 'board')
  // Entre 2 y 4 por fila.
  assert.equal(boardColumns(BOARD_MIN_WIDTH), 2)
  assert.equal(boardColumns(700), 3)
  assert.equal(boardColumns(2000), 4)
})

test('los trazos: S vertical (recta en la misma columna), S de lado y media vuelta hacia fuera', () => {
  assert.equal(roadDown({ x: 40, y: 10 }, { x: 40, y: 110 }), 'M 40 10 L 40 110')
  assert.equal(
    roadDown({ x: 100, y: 40 }, { x: 300, y: 160 }),
    'M 100 40 C 100 100 300 100 300 160'
  )
  // La S vertical no se sale de entre las x de los dos puntos.
  for (const [x] of points(roadDown({ x: 320.25, y: 50 }, { x: 180.5, y: 170 }))) {
    assert.ok(x >= 180.5 && x <= 320.3, `${x} fuera`)
  }
  // Por varios puntos: una S de cada uno al siguiente (recta si no cambia la x).
  assert.equal(
    roadVia([
      { x: 100, y: 0 },
      { x: 200, y: 100 },
      { x: 200, y: 150 },
      { x: 100, y: 250 },
    ]),
    'M 100 0 C 100 50 200 50 200 100 L 200 150 C 200 200 100 200 100 250'
  )
  assert.equal(roadAcross({ x: 100, y: 50 }, { x: 300, y: 70 }), 'M 100 50 C 200 50 200 70 300 70')
  // A la derecha con `bulge` positivo, a la izquierda con negativo.
  assert.equal(
    roadTurn({ x: 500, y: 50 }, { x: 500, y: 250 }, 120),
    'M 500 50 C 620 50 620 250 500 250'
  )
  assert.equal(roadTurn({ x: 80, y: 50 }, { x: 80, y: 250 }, -60), 'M 80 50 C 20 50 20 250 80 250')
})

test('tablero con ramas: una fila por capa, las parejas repartidas y la que va sola bajo lo que pide', () => {
  // 1 → 2 → (3 y 4); 5 pide 3 y 4.
  const layout = layoutMissionMap(
    [
      // Al profesorado, completada es que la ha completado todo el alumnado.
      m('m1', [], { completedCount: 3, totalStudents: 3 }),
      m('m2', ['m1']),
      m('m3', ['m2']),
      m('m4', ['m2']),
      m('m5', ['m3', 'm4']),
    ],
    'teacher'
  )
  const width = 700
  const geo = mapGeometry(layout, width)
  const colWidth = (width - 2 * B.padX) / boardColumns(width)
  const at = id => geo.places.get(id)
  assert.equal(geo.shape, 'board')
  assert.equal(geo.node, B.node)

  // Cada capa, una fila más abajo.
  assert.deepEqual(
    ['m1', 'm2', 'm3', 'm4', 'm5'].map(id => at(id).y),
    [B.top, B.top + B.row, B.top + 2 * B.row, B.top + 2 * B.row, B.top + 3 * B.row]
  )
  // La pareja, centrada y con sitio de sobra para las dos etiquetas.
  near(at('m3').x + at('m4').x, width, 'centrada')
  assert.ok(at('m4').x - at('m3').x >= B.label, 'las etiquetas no se pisan')
  // La que va sola, bajo lo que pide y apartada un poco (a un lado y a otro).
  near(at('m1').x, width / 2 - colWidth * B.meander, 'm1 a la izquierda del centro')
  near(at('m2').x, at('m1').x + colWidth * B.meander, 'm2 bajo m1, a la derecha')
  near(at('m5').x, (at('m3').x + at('m4').x) / 2 + colWidth * B.meander, 'm5 bajo m3 y m4')

  // Salida encima de la primera fila; meta debajo de la última capa; todo dentro del alto.
  assert.deepEqual(geo.start, { x: at('m1').x, y: B.top - B.startGap })
  assert.deepEqual(geo.goal, { x: at('m5').x, y: B.top + 3 * B.row + B.goalGap })
  assert.equal(geo.height, geo.goal.y + B.bottom)
  for (const place of geo.places.values()) {
    assert.ok(place.x - B.label / 2 >= 0 && place.x + B.label / 2 <= width, 'dentro del ancho')
  }

  // Una carretera por arista, más la salida y la meta; hecha si sale de una completada.
  assert.deepEqual(
    geo.roads.map(r => [r.key, r.done]),
    [
      ['start>m1', true],
      ['m1>m2', true],
      ['m2>m3', false],
      ['m2>m4', false],
      ['m3>m5', false],
      ['m4>m5', false],
      ['m5>goal', false],
    ]
  )
  // Cada tramo empieza y acaba en el centro de sus medallones.
  const m2m4 = points(geo.roads.find(r => r.key === 'm2>m4').d)
  assert.deepEqual(m2m4[0], [Math.round(at('m2').x * 10) / 10, at('m2').y])
  assert.deepEqual(m2m4.at(-1), [Math.round(at('m4').x * 10) / 10, at('m4').y])
})

test('tablero sin ramas: el camino serpentea por filas (ida y vuelta) y la meta es la parada siguiente', () => {
  const missions = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) =>
    m(id, [], { status: i < 2 ? 'completada' : 'activa' })
  )
  const layout = layoutMissionMap(missions, 'student')
  const width = 700 // 3 por fila
  const geo = mapGeometry(layout, width)
  const colWidth = (width - 2 * B.padX) / 3
  const slotX = slot => B.padX + colWidth * (slot + 0.5)
  const at = id => geo.places.get(id)

  // Ida (a, b, c), vuelta (d, e, f) e ida otra vez (g); las de en medio, un poco más abajo.
  near(at('a').x, slotX(0), 'a')
  near(at('c').x, slotX(2), 'c')
  near(at('d').x, slotX(2), 'd, bajo c')
  near(at('f').x, slotX(0), 'f')
  near(at('g').x, slotX(0), 'g, bajo f')
  assert.equal(at('a').y, B.top)
  assert.equal(at('b').y, B.top + B.wave)
  assert.equal(at('d').y, B.top + B.row)
  assert.equal(at('g').y, B.top + 2 * B.row)
  // Dos paradas seguidas de la misma fila, con sitio para sus etiquetas.
  assert.ok(at('b').x - at('a').x >= B.label)

  // La meta, en la parada que tocaría a la octava (al lado de g); la salida, encima de a.
  near(geo.goal.x, slotX(1), 'meta al lado de g')
  assert.equal(geo.goal.y, B.top + 2 * B.row + B.wave)
  assert.deepEqual(geo.start, { x: at('a').x, y: B.top - B.startGap })

  assert.deepEqual(
    geo.roads.map(r => [r.key, r.done]),
    [
      ['start>a', true],
      ['a>b', true],
      ['b>c', true],
      ['c>d', false],
      ['d>e', false],
      ['e>f', false],
      ['f>g', false],
      ['g>goal', false],
    ]
  )
  // En la fila, de lado; al final de la fila, media vuelta por fuera (derecha y luego izquierda).
  const road = key => points(geo.roads.find(r => r.key === key).d)
  assert.equal(road('a>b')[1][1], at('a').y, 'sale en horizontal')
  assert.ok(road('c>d')[1][0] > at('c').x + colWidth / 2, 'media vuelta por la derecha')
  assert.ok(road('f>g')[1][0] < at('f').x - colWidth / 2, 'media vuelta por la izquierda')
  // La media vuelta no se sale del tablero (cuenta el grosor del borde).
  const xs = road('c>d').map(([x]) => x)
  assert.ok(0.75 * (Math.max(...xs) - at('c').x) + at('c').x <= width - 17)
})

test('columna (móvil): la carretera a la izquierda, de cada misión a la siguiente, y las etiquetas a la derecha', () => {
  // Con ramas, en la columna van en el orden del recorrido.
  const layout = layoutMissionMap(
    [
      m('m1', [], { status: 'completada', progress: 100 }),
      m('m2', ['m1']),
      m('m3', ['m1']),
      m('m4', ['m2', 'm3']),
    ],
    'student'
  )
  const geo = mapGeometry(layout, 320)
  assert.equal(geo.shape, 'column')
  assert.equal(geo.node, C.node)
  assert.deepEqual(
    ['m1', 'm2', 'm3', 'm4'].map(id => geo.places.get(id)),
    [
      { x: C.x, y: C.top },
      { x: C.x + C.wiggle, y: C.top + C.row },
      { x: C.x, y: C.top + 2 * C.row },
      { x: C.x + C.wiggle, y: C.top + 3 * C.row },
    ]
  )
  assert.deepEqual(geo.start, { x: C.x, y: C.top - C.startGap })
  assert.deepEqual(geo.goal, { x: C.x, y: C.top + 4 * C.row })
  assert.equal(geo.height, geo.goal.y + C.bottom)
  // Las etiquetas, a la derecha del medallón más apartado.
  assert.ok(geo.label >= C.x + C.wiggle + C.node / 2)
  // Hay sitio a la izquierda para el anillo del profesorado (radio + 12 y su grosor).
  assert.ok(C.x - C.node / 2 - 12 - 3 >= 0)
  assert.deepEqual(
    geo.roads.map(r => [r.key, r.done]),
    [
      ['start>m1', true],
      ['m1>m2', true],
      ['m2>m3', false],
      ['m3>m4', false],
      ['m4>goal', false],
    ]
  )
})

test('capa que no cabe: filas al tresbolillo, una llena y otra con una menos en los huecos', () => {
  // m0 abre cinco; a 700 px caben tres por fila: 3 y 2, la segunda media columna a un lado.
  const missions = [m('m0'), ...[1, 2, 3, 4, 5].map(i => m(`m${i}`, ['m0'])), m('m6', ['m5'])]
  const width = 700
  const geo = mapGeometry(layoutMissionMap(missions, 'teacher'), width)
  const colWidth = (width - 2 * B.padX) / 3
  const at = id => geo.places.get(id)
  const slotX = slot => B.padX + colWidth * (slot + 0.5)
  for (const [id, slot] of [
    ['m1', 0],
    ['m2', 1],
    ['m3', 2],
    ['m4', 0.5],
    ['m5', 1.5],
  ]) {
    near(at(id).x, slotX(slot), id)
  }
  assert.equal(at('m4').y, at('m1').y + B.row, 'la segunda fila, debajo')
  // m0 → m4 cruza la fila de m1, m2 y m3: por el hueco (en recto) y no por encima.
  const road = geo.roads.find(r => r.key === 'm0>m4')
  const crossing = points(road.d).filter(([, y]) => Math.abs(y - at('m1').y) <= B.through)
  assert.equal(crossing.length, 2, 'entra y sale de la fila en dos puntos')
  assert.equal(crossing[0][0], crossing[1][0], 'en recto')
  for (const id of ['m1', 'm2', 'm3']) {
    assert.ok(Math.abs(crossing[0][0] - at(id).x) >= colWidth / 2 - 0.5, `lejos de ${id}`)
  }
})

test('ninguna rama termina en el aire: lo que no abre nada sigue hasta la meta', () => {
  // a → b → c; a → d (d no abre nada y es de una capa anterior a la última).
  const layout = layoutMissionMap(
    [
      m('a', [], { status: 'completada', progress: 100 }),
      m('b', ['a']),
      m('c', ['b']),
      m('d', ['a']),
    ],
    'student'
  )
  const geo = mapGeometry(layout, 700)
  assert.deepEqual(
    geo.roads.map(r => [r.key, r.done]),
    [
      ['start>a', true],
      ['a>b', true],
      ['b>c', false],
      ['a>d', true],
      ['d>goal', false],
      ['c>goal', false],
    ]
  )
  // La de d baja hasta la meta pasando por un hueco de la fila de c.
  const road = points(geo.roads.find(r => r.key === 'd>goal').d)
  assert.deepEqual(road.at(-1), [
    Math.round(geo.goal.x * 10) / 10,
    Math.round(geo.goal.y * 10) / 10,
  ])
  assert.ok(
    road.some(([x, y]) => y === geo.places.get('c').y - B.through && x !== geo.places.get('c').x)
  )
})

test('ninguna carretera pasa a menos de un radio de un medallón que no sea el suyo', () => {
  const maps = {
    'lineales (sin requisitos)': Array.from({ length: 40 }, (_, i) => m(`m${i}`)),
    'en cadena': Array.from({ length: 40 }, (_, i) => m(`m${i}`, i > 0 ? [`m${i - 1}`] : [])),
    'con ramas': branched40(),
    'muchas sin requisitos': randomMissions(40, 977, 0.3),
    'al azar': randomMissions(40, 4111, 0.9),
  }
  for (const [name, missions] of Object.entries(maps)) {
    const layout = layoutMissionMap(missions, 'teacher')
    for (const width of [320, 520, 640, 700, 808, 860, 1000, 1280]) {
      const geo = mapGeometry(layout, width)
      // Del centro de la carretera al centro del medallón, al menos un diámetro:
      // un radio libre entre la carretera y su borde.
      const { min, where } = closest(geo)
      assert.ok(min >= geo.node, `${name} a ${width} px: ${where} a ${min.toFixed(1)} px`)
      // Y la carretera entera (con su borde) dentro del tablero.
      for (const road of geo.roads) {
        for (const [x, y] of trace(road.d)) {
          assert.ok(
            x >= 17 && x <= width - 17 && y >= 0 && y <= geo.height,
            `${name} ${road.key} fuera`
          )
        }
      }
    }
  }
})

test('la salida, sobre el centro de la primera fila y con sitio para que su tramo no roce nada', () => {
  // Cuatro por fila (1000 px): la salida, en el hueco del centro; baja más
  // cuanto más se aparta de lado su tramo más largo.
  const layout = layoutMissionMap(
    ['a', 'b', 'c', 'd'].map(id => m(id)).concat(m('e', ['a', 'b', 'c', 'd'])),
    'student'
  )
  const width = 1000
  const geo = mapGeometry(layout, width)
  const colWidth = (width - 2 * B.padX) / 4
  near(geo.start.x, width / 2, 'centrada')
  const first = geo.places.get('a')
  near(first.y - geo.start.y, B.slope * 1.5 * colWidth, 'baja lo que pide el tramo más torcido')
  // A 700 (tres por fila) la del centro queda justo debajo y basta con lo de siempre.
  const narrow = mapGeometry(
    layoutMissionMap(['a', 'b', 'c'].map(id => m(id)).concat(m('d', ['b'])), 'student'),
    700
  )
  assert.equal(narrow.places.get('b').y - narrow.start.y, B.startGap)
  near(narrow.start.x, narrow.places.get('b').x, 'sobre la del centro')
})

test('con 40 misiones salen 40 sitios distintos y un alto que crece con ellas', () => {
  const many = Array.from({ length: 40 }, (_, i) => m(`m${i}`))
  for (const width of [320, 700, 1000]) {
    const geo = mapGeometry(layoutMissionMap(many, 'student'), width)
    const keys = new Set([...geo.places.values()].map(p => `${p.x}:${p.y}`))
    assert.equal(keys.size, 40, `${width}: sitios repetidos`)
    assert.equal(geo.roads.length, 41)
    for (const p of geo.places.values()) assert.ok(p.y < geo.height)
  }
})

test('el fondo: las islas y las estrellitas salen siempre igual y dentro del mapa', () => {
  const islands = mapIslands(600, 1200)
  assert.deepEqual(islands, mapIslands(600, 1200))
  assert.ok(islands.length >= 4)
  assert.deepEqual(
    islands.slice(0, 3).map(i => i.tone),
    ['purple', 'navy', 'mint']
  )
  const sparkles = mapSparkles(600, 1200)
  assert.deepEqual(sparkles, mapSparkles(600, 1200))
  assert.equal(sparkles.length, 30)
  for (const s of sparkles) assert.ok(s.x > 0 && s.x < 600 && s.y > 0 && s.y < 1200)
})
