#!/usr/bin/env python3
"""
Validación de internacionalización (i18n).

Modos:
  --parse   Verifica que todos los JSON de i18n parsean correctamente.
  --sync    Verifica que las claves están sincronizadas entre los idiomas
            (usando 'es' como referencia).
  --usage   Verifica que todas las claves usadas literalmente en código (.vue/.ts)
            existen en los archivos de traducciones, y reporta las que están
            definidas pero no se usan.

Sin argumentos: ejecuta los tres modos en orden.

Códigos de salida:
  0 = OK
  1 = error bloqueante (parse fallido, sync roto o claves usadas sin definir)
  El reporte de "definidas sin usar" es informativo y no afecta al exit code.

Uso:
  python3 scripts/i18n-check.py [--parse|--sync|--usage]
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCALES_DIR = ROOT / 'app' / 'i18n' / 'locales'
SOURCES_DIR = ROOT / 'app' / 'app'
BASE_LOCALE = 'es'


def collect_keys(obj, prefix='', leaf_only=False):
    """Recolecta claves de un dict anidado.

    Si leaf_only=True, devuelve solo las claves cuyo valor es string (hojas).
    Si leaf_only=False, devuelve también las intermedias.
    """
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f'{prefix}.{k}' if prefix else k
            if isinstance(v, dict):
                if not leaf_only:
                    keys.add(key)
                keys.update(collect_keys(v, key, leaf_only))
            else:
                keys.add(key)
    return keys


def cmd_parse():
    """Valida que cada JSON de locales parsea."""
    print('▶ Validando que cada JSON parsea...')
    fail = False
    for f in sorted(LOCALES_DIR.rglob('*.json')):
        try:
            json.load(open(f))
        except json.JSONDecodeError as e:
            rel = f.relative_to(ROOT)
            print(f'❌ {rel}')
            print(f'   {e}')
            fail = True
    if not fail:
        print('✅ Todos los JSON parsean correctamente')
    return 0 if not fail else 1


def cmd_sync():
    """Valida que las claves coinciden entre los idiomas."""
    print('▶ Validando sincronización de claves entre idiomas...')
    fail = False
    base_files = {}
    base_path = LOCALES_DIR / BASE_LOCALE
    for f in base_path.iterdir():
        if f.suffix == '.json':
            base_files[f.name] = collect_keys(json.load(open(f)))

    for locale_dir in sorted(LOCALES_DIR.iterdir()):
        if not locale_dir.is_dir() or locale_dir.name == BASE_LOCALE:
            continue
        for filename, base_keys in base_files.items():
            target = locale_dir / filename
            if not target.exists():
                print(f'❌ {locale_dir.name}/{filename}: archivo no existe '
                      f'(presente en {BASE_LOCALE})')
                fail = True
                continue
            target_keys = collect_keys(json.load(open(target)))
            missing = base_keys - target_keys
            extra = target_keys - base_keys
            if missing:
                print(f'❌ {locale_dir.name}/{filename}: faltan {len(missing)} '
                      f'clave(s) presentes en {BASE_LOCALE}/{filename}:')
                for k in sorted(missing)[:15]:
                    print(f'   - {k}')
                if len(missing) > 15:
                    print(f'   ... y {len(missing) - 15} más')
                fail = True
            if extra:
                print(f'❌ {locale_dir.name}/{filename}: tiene {len(extra)} '
                      f'clave(s) que no están en {BASE_LOCALE}/{filename}:')
                for k in sorted(extra)[:15]:
                    print(f'   - {k}')
                if len(extra) > 15:
                    print(f'   ... y {len(extra) - 15} más')
                fail = True

    if not fail:
        print('✅ Todas las claves están sincronizadas entre los idiomas')
    return 0 if not fail else 1


def cmd_usage():
    """Compara claves usadas en código vs definidas en JSON."""
    print('▶ Comparando claves usadas en código vs definidas...')

    # Claves hoja del idioma base (las que tienen valor string)
    defined = set()
    for f in (LOCALES_DIR / BASE_LOCALE).glob('*.json'):
        defined.update(collect_keys(json.load(open(f)), leaf_only=True))

    # Patrones de uso literal en código
    literal_patterns = [
        re.compile(r"""\bt\(\s*['"]([\w.\-]+)['"]"""),
        re.compile(r"""\$t\(\s*['"]([\w.\-]+)['"]"""),
        re.compile(r"""\bte\(\s*['"]([\w.\-]+)['"]"""),
        re.compile(r"""\btm\(\s*['"]([\w.\-]+)['"]"""),
        re.compile(r"""\bt\(\s*`([\w.\-]+)`"""),
        re.compile(r"""\$t\(\s*`([\w.\-]+)`"""),
    ]
    # Prefijos dinámicos:
    #   1. Template inline:   t(`foo.${var}`)
    #   2. Template asignado: const key = `foo.${var}`; t(key)
    prefix_patterns = [
        re.compile(r"""\bt\(\s*`([\w.\-]+\.)\$\{"""),
        re.compile(r"""\$t\(\s*`([\w.\-]+\.)\$\{"""),
        re.compile(r"""(?:const|let|var)\s+\w+\s*=\s*`([\w.\-]+\.)\$\{"""),
    ]

    used_literal = set()
    used_prefix = set()
    locations = defaultdict(list)

    for path in SOURCES_DIR.rglob('*'):
        if path.suffix not in ('.vue', '.ts'):
            continue
        if 'node_modules' in path.parts:
            continue
        text = path.read_text(errors='ignore')
        for pat in literal_patterns:
            for m in pat.finditer(text):
                used_literal.add(m.group(1))
                locations[m.group(1)].append(str(path.relative_to(ROOT)))
        for pat in prefix_patterns:
            for m in pat.finditer(text):
                used_prefix.add(m.group(1))

    # Bloqueante: claves usadas literalmente que no existen en JSON
    missing = used_literal - defined

    # Informativo: claves definidas que no se usan literalmente ni por prefijo
    unused = set()
    for k in defined - used_literal:
        if not any(k.startswith(p) for p in used_prefix):
            unused.add(k)

    rc = 0
    if missing:
        print(f'❌ {len(missing)} clave(s) usadas en código pero NO definidas '
              f'en {BASE_LOCALE}/*.json:')
        for k in sorted(missing):
            print(f'   - {k}  ({locations[k][0]})')
        rc = 1
    else:
        print(f'✅ Las {len(used_literal)} claves usadas literalmente están '
              f'todas definidas')

    if unused:
        print()
        print(f'❌ {len(unused)} clave(s) hoja definidas pero NO usadas '
              f'(código muerto):')
        for k in sorted(unused)[:30]:
            print(f'   - {k}')
        if len(unused) > 30:
            print(f'   ... y {len(unused) - 30} más')
        print()
        print('   Si son usos dinámicos legítimos, captura el prefijo en')
        print('   prefix_patterns dentro de scripts/i18n-check.py')
        rc = 1
    else:
        print('✅ No hay claves definidas sin uso')

    return rc


def main():
    args = sys.argv[1:]
    modes = {'--parse': cmd_parse, '--sync': cmd_sync, '--usage': cmd_usage}

    if not args:
        # Sin argumentos: ejecuta los tres
        rc1 = cmd_parse()
        print()
        rc2 = cmd_sync()
        print()
        rc3 = cmd_usage()
        return rc1 or rc2 or rc3

    rc = 0
    for arg in args:
        if arg not in modes:
            print(f'Modo desconocido: {arg}', file=sys.stderr)
            print(__doc__, file=sys.stderr)
            return 2
        rc = modes[arg]() or rc
        print()
    return rc


if __name__ == '__main__':
    sys.exit(main())
