#!/usr/bin/env python3
"""
Comprueba que la tabla de acciones por nivel del profesorado es la misma en la
API y en las pantallas.

La API decide con `CLASS_ACTION_LEVEL` (api/src/utils/class-access.ts) y las
pantallas usan una copia (app/app/utils/class-access.ts) para no ofrecer lo que
la API rechazaría. Si una cambia y la otra no, la pantalla ofrece o esconde
acciones que la API decide de otra forma: este script lo detecta. Compara
también el nivel por defecto de cada perfil (`PROFILE_DEFAULT_ACCESS`).

Códigos de salida:
  0 = las dos copias coinciden
  1 = difieren, o alguna tabla no se ha podido leer

Uso:
  python3 scripts/class-access-check.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_FILE = ROOT / 'api' / 'src' / 'utils' / 'class-access.ts'
APP_FILE = ROOT / 'app' / 'app' / 'utils' / 'class-access.ts'

TABLES = ('CLASS_ACTION_LEVEL', 'PROFILE_DEFAULT_ACCESS')

# Una entrada `'clave': 'valor'` o `clave: 'valor'`, en su propia línea o no.
ENTRY = re.compile(r"""['"]?([\w.]+)['"]?\s*:\s*['"](\w+)['"]""")


def read_table(path: Path, name: str) -> dict[str, str] | None:
    """Las entradas del objeto literal `name` del fichero, sin comentarios."""
    text = path.read_text()
    start = re.search(rf'export const {name}\b[^=]*=\s*{{', text)
    if not start:
        return None
    end = text.find('}', start.end())
    if end == -1:
        return None
    body = re.sub(r'//[^\n]*', '', text[start.end():end])
    return dict(ENTRY.findall(body))


def main() -> int:
    rc = 0
    for name in TABLES:
        api = read_table(API_FILE, name)
        app = read_table(APP_FILE, name)
        if not api or not app:
            missing = API_FILE if not api else APP_FILE
            print(f'❌ No se encuentra {name} en {missing.relative_to(ROOT)}')
            rc = 1
            continue
        if api == app:
            print(f'✅ {name}: {len(api)} entradas, iguales en la API y en las pantallas')
            continue
        rc = 1
        print(f'❌ {name} no coincide entre la API y las pantallas:')
        for key in sorted(set(api) | set(app)):
            if api.get(key) != app.get(key):
                print(f'   - {key}: API {api.get(key, "—")} · pantallas {app.get(key, "—")}')
    return rc


if __name__ == '__main__':
    sys.exit(main())
