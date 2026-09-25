#!/usr/bin/env python3
"""
Comprobaciones antes de publicar una versión.

Hoy mira una cosa: que ningún texto legal (app/i18n/locales/*/legal.json) lleve
un marcador «[PENDIENTE: …]». Los borradores de privacidad, términos y aviso
legal usan ese marcador para lo que falta por decidir, y las páginas lo
mostrarían tal cual a cualquier visitante.

No forma parte de i18n-check.py a propósito: mientras se trabaja, los
marcadores son válidos; lo que no puede es salir una versión con ellos.

Códigos de salida:
  0 = se puede publicar
  1 = hay algo que lo impide

Uso:
  python3 scripts/release-check.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCALES_DIR = ROOT / 'app' / 'i18n' / 'locales'
MARKER = '[PENDIENTE'


def pending_markers():
    """(fichero, número de línea, línea) de cada marcador en los textos legales."""
    found = []
    for path in sorted(LOCALES_DIR.glob('*/legal.json')):
        for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
            if MARKER in line:
                found.append((path.relative_to(ROOT), number, line.strip()))
    return found


def main():
    found = pending_markers()
    if not found:
        print('✅ Textos legales sin marcadores pendientes.')
        return 0

    files = sorted({str(path) for path, _, _ in found})
    print(f'❌ {len(found)} marcadores {MARKER}…] en {len(files)} ficheros de textos legales.')
    print('   Resuélvelos (o deja fuera esos cambios) antes de publicar:')
    for path in files:
        count = sum(1 for p, _, _ in found if str(p) == path)
        print(f'   - {path}: {count}')
    return 1


if __name__ == '__main__':
    sys.exit(main())
