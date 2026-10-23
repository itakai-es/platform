import { describe, it, expect } from "vitest";
import {
  OLD_WORDS,
  apply,
  findRow,
  parseInserts,
  parseUpdates,
  prose,
  readMigration,
  seedThrough,
  type Row,
} from "../helpers/help-migration.js";

/**
 * Red para los retoques de la ayuda que cierran el bloque 5, una migración por
 * vía: las pistas en lo que se copia y en el historial (E1), el mapa que viaja
 * al importar una plantilla (E3) y el avatar, que es de cada clase (E4). Solo
 * son UPDATE con la guarda del texto de serie, así que lo editado desde el
 * panel se respeta. Sin base de datos: se leen los SQL y se aplican sobre filas
 * en memoria, con la misma semántica que el SQL.
 */

/** Las de E3 que van antes que estas, en su orden. */
const E3 = [
  "20261024309000_e3_help_mission_order",
  "20261024319000_e3_help_mission_map",
];

const MIGRATIONS = {
  "20261024329000_e1_help_hints_in_copies": [
    "misiones/importar-una-mision-de-otra-clase.body",
    "clases/duplicar-una-clase-para-el-curso-siguiente.body",
    "clases/el-historial-de-la-clase.body",
  ],
  "20261024339000_e3_help_map_in_templates": [
    "misiones/el-mapa-de-misiones.body",
    "clases/crear-una-clase-desde-cero-o-desde-una-plantilla.body",
  ],
  "20261024349000_e4_help_avatar_per_class": [
    "si-eres-alumno/como-entro-en-mi-clase.body",
  ],
};
const NAMES = Object.keys(MIGRATIONS) as (keyof typeof MIGRATIONS)[];

/** La ayuda de serie justo antes de `name`: la cadena, E3 y las de aquí que van antes. */
const seedBefore = (name: string) =>
  seedThrough([...E3, ...NAMES.slice(0, NAMES.indexOf(name as never))]);

/** La ayuda de serie después de las tres. */
const seedAfter = () => seedThrough([...E3, ...NAMES]);

const bodyAfter = (rows: Row[], category: string, slug: string) =>
  findRow(rows, category, slug).body;

describe.each(NAMES)("migración %s", (name) => {
  const migration = readMigration(name);
  const updates = parseUpdates(migration);

  it("solo son UPDATE de artículos con la forma esperada, y nada más", () => {
    expect(parseInserts(migration)).toHaveLength(0);
    expect(updates.length).toBeGreaterThan(0);
    let rest = migration;
    for (const statement of updates) rest = rest.replace(statement.sql, "");
    expect(rest.replace(/^--.*$/gm, "").trim()).toBe("");
    for (const update of updates) {
      expect(update.guards).toEqual([[update.field, expect.any(String)]]);
      expect(update.field).not.toBe("slug");
    }
  });

  it("nunca referencia ids, que cambian en cada instalación", () => {
    expect(migration).not.toMatch(/"id" = '/);
    expect(migration).not.toMatch(/"id" IN/);
    expect(migration).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it("corrige los artículos previstos, cada uno protegido por su propio valor de serie", () => {
    expect(
      updates.map(
        (update) => `${update.category}/${update.slug}.${update.field}`,
      ),
    ).toEqual(MIGRATIONS[name]);
    const rows = seedBefore(name);
    for (const update of updates) {
      const original = findRow(rows, update.category, update.slug);
      expect(original, `${update.category}/${update.slug}`).toBeDefined();
      expect(update.guards).toContainEqual([
        update.field,
        original[update.field],
      ]);
      expect(update.value).not.toBe(original[update.field]);
    }
  });

  it("sobre la ayuda de serie sin editar, cada corrección toca una fila; otra pasada, ninguna", () => {
    const rows = seedBefore(name);
    expect(apply(rows, updates)).toEqual(updates.map(() => 1));
    const after = JSON.stringify(rows);
    expect(apply(rows, updates)).toEqual(updates.map(() => 0));
    expect(JSON.stringify(rows)).toBe(after);
  });

  it("un artículo editado desde el panel se queda como está", () => {
    for (const update of updates) {
      const rows = seedBefore(name);
      const row = findRow(rows, update.category, update.slug);
      row[update.field] = `${row[update.field]} (editado)`;
      const edited = row[update.field];
      apply(rows, updates);
      expect(row[update.field], `${update.slug}.${update.field}`).toBe(edited);
    }
  });

  it("con lenguaje inclusivo: sin «el profesor» ni «el alumno» genéricos", () => {
    for (const update of updates)
      expect(prose(update.value)).not.toMatch(OLD_WORDS);
  });
});

describe("los retoques del bloque 5, ya aplicados", () => {
  it("todos los enlaces entre artículos llevan a uno que existe", () => {
    const rows = seedAfter();
    const existing = new Set(rows.map((row) => `${row.category}/${row.slug}`));
    for (const row of rows) {
      for (const [, target] of row.body.matchAll(
        /\]\(\/ayuda\/([a-z0-9-]+\/[a-z0-9-]+)\)/g,
      )) {
        expect(existing.has(target), `${row.slug} → ${target}`).toBe(true);
      }
    }
  });

  it("importar una misión y duplicar o crear desde plantilla dicen que las pistas viajan, sin sus usos", () => {
    const rows = seedAfter();
    const imported = bodyAfter(
      rows,
      "misiones",
      "importar-una-mision-de-otra-clase",
    );
    expect(imported).toMatch(/con sus enigmas, sus pistas, sus documentos/);
    expect(imported).toMatch(/cuántos enigmas, pistas y documentos lleva/);
    expect(imported).toMatch(
      /- Sus \*\*pistas\*\*, en su orden y con su coste/,
    );
    expect(imported).toMatch(/ni las pistas que haya usado/);
    const duplicated = bodyAfter(
      rows,
      "clases",
      "duplicar-una-clase-para-el-curso-siguiente",
    );
    expect(duplicated).toMatch(
      /enigmas, sus \[pistas\]\(\/ayuda\/misiones\/pistas-en-las-misiones\)/,
    );
    expect(duplicated).toMatch(/ni las pistas usadas/);
    expect(
      bodyAfter(
        rows,
        "clases",
        "crear-una-clase-desde-cero-o-desde-una-plantilla",
      ),
    ).toMatch(/enigmas enteros, con sus \[pistas\]/);
  });

  it("el historial cuenta las pistas y los cambios de orden", () => {
    const history = bodyAfter(
      seedAfter(),
      "clases",
      "el-historial-de-la-clase",
    );
    expect(history).toMatch(/\*\*Pistas\*\*/);
    expect(history).toMatch(
      /cambios de \[orden\]\(\/ayuda\/misiones\/el-orden-de-las-misiones\)/,
    );
    expect(history).toMatch(/entregar, usar una pista, comprar en la tienda/);
  });

  it("el mapa llega como estaba al importar una plantilla, y la ficha no lo enseña", () => {
    const rows = seedAfter();
    const map = bodyAfter(rows, "misiones", "el-mapa-de-misiones");
    expect(map).not.toMatch(/lo recibe apagado/);
    expect(map).toMatch(
      /o al importarla como plantilla, el interruptor llega como estaba/,
    );
    expect(map).toMatch(/La ficha pública de una plantilla no lo enseña/);
    expect(
      bodyAfter(
        rows,
        "clases",
        "crear-una-clase-desde-cero-o-desde-una-plantilla",
      ),
    ).toMatch(
      /También el \[mapa de misiones\]\(\/ayuda\/misiones\/el-mapa-de-misiones\), si lo tenía encendido/,
    );
  });

  it("para el alumnado, el avatar ya no viaja con la cuenta: es de cada clase", () => {
    const join = bodyAfter(
      seedAfter(),
      "si-eres-alumno",
      "como-entro-en-mi-clase",
    );
    expect(join).not.toMatch(/avatar viaja/);
    expect(join).toMatch(/Tu avatar y tu alias, en cambio, son de cada clase/);
  });
});
