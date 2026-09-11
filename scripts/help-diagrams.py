"""
Diagramas explicativos del centro de ayuda de ITAKAI.

Van dentro del cuerpo de los artículos, donde una captura de pantalla explica
mal lo que pasa: circuitos, secuencias y escalas. A diferencia de las portadas
(`help-illustrations.py`), estos **sí llevan texto**, porque sin etiquetas un
circuito no dice nada. El texto va en castellano igual que el artículo que los
usa: la imagen se referencia desde el cuerpo, que es por idioma, así que una
traducción futura apuntará a su propia versión.

Se ejecuta desde la raíz del repositorio:

    python3 scripts/help-diagrams.py

y reescribe los SVG de `app/public/app/ayuda/diagramas`.
"""
import pathlib
import re

OUT = pathlib.Path(__file__).resolve().parent.parent / 'app' / 'public' / 'app' / 'ayuda' / 'diagramas'
OUT.mkdir(parents=True, exist_ok=True)

NAVY = '#23245D'
WHITE = '#FFFFFF'
YELLOW = '#FFC338'
PURPLE = '#AC74FD'
PINK = '#FF9CA7'
MINT = '#6CF3AF'
SKY = '#00AAFC'
CORAL = '#FF6B6B'
GREY = '#E9EAF0'

FONT = ("-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', "
        "Arial, sans-serif")

W = 1200


def tint(hex_color, ratio):
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    mix = lambda c: round(c * ratio + 255 * (1 - ratio))
    return '#%02X%02X%02X' % (mix(r), mix(g), mix(b))


def rect(x, y, w, h, fill, r=16, stroke=None, sw=3):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{st}/>'


def circle(cx, cy, r, fill, stroke=None, sw=3):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{st}/>'


def text(x, y, content, size=20, weight=600, fill=NAVY, anchor='middle'):
    safe = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" '
            f'dominant-baseline="middle">{safe}</text>')


def arrow(x1, y, x2, color=NAVY, width=5):
    head = 13
    return (f'<path d="M{x1} {y} H{x2 - head}" stroke="{color}" stroke-width="{width}" '
            f'stroke-linecap="round"/>'
            f'<path d="M{x2 - head - 2} {y - 9} L{x2} {y} L{x2 - head - 2} {y + 9}" '
            f'stroke="{color}" stroke-width="{width}" stroke-linecap="round" '
            f'stroke-linejoin="round" fill="none"/>')


def svg(name, height, body, bg='#F7F8FC'):
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height}" '
           f'width="{W}" height="{height}" role="img">'
           f'{rect(0, 0, W, height, bg, 0)}{body}</svg>')
    doc = re.sub(r'\d+\.\d{3,}', lambda m: f'{float(m.group()):.2f}'.rstrip('0').rstrip('.'), doc)
    (OUT / f'{name}.svg').write_text(doc, encoding='utf-8')
    return name


def step(x, y, w, h, color, title, lines, number=None):
    """Una caja de paso: color de marca arriba, título y dos líneas de detalle."""
    out = rect(x, y, w, h, WHITE, 20, tint(color, 0.55))
    out += rect(x, y, w, 8, color, 4)
    cx = x + w / 2
    if number is not None:
        out += circle(cx, y + 46, 20, tint(color, 0.35))
        out += text(cx, y + 46, str(number), 20, 700)
        top = y + 90
    else:
        top = y + 56
    out += text(cx, top, title, 22, 700)
    for i, line in enumerate(lines):
        out += text(cx, top + 34 + i * 26, line, 17, 500, tint(NAVY, 0.6))
    return out


# ----------------------------------------------------------------- diagramas

def flujo_mision():
    """El recorrido completo de una misión, de crearla a repartir recompensas."""
    H = 300
    body = ''
    pasos = [
        (PURPLE, 'Creas la misión', ['Título, rareza,', 'fecha y enigmas']),
        (MINT, 'El alumno la ve', ['Aparece en su', 'lista de misiones']),
        (SKY, 'Entrega', ['Texto, archivo', 'o enlace']),
        (YELLOW, 'Revisas', ['Pones el porcentaje', 'de la entrega']),
        (PINK, 'Cobra', ['XP, monedas y maná', 'según ese porcentaje']),
    ]
    w, gap = 200, 30
    for i, (color, title, lines) in enumerate(pasos):
        x = 30 + i * (w + gap)
        body += step(x, 40, w, 210, color, title, lines, number=i + 1)
        if i < len(pasos) - 1:
            body += arrow(x + w + 6, 145, x + w + gap - 6, tint(NAVY, 0.35), 4)
    return svg('flujo-mision', H, body)


def estados_entrega():
    """Por dónde pasa una entrega y quién mueve cada paso."""
    H = 320
    body = text(600, 34, 'Cada entrega pasa por estos tres estados', 20, 600, tint(NAVY, 0.6))
    estados = [
        (GREY, 'Pendiente', 'El alumno todavía no ha entregado', 'Le avisa el recordatorio'),
        (SKY, 'Entregada', 'Está en tu bandeja de revisión', 'El alumno ya no puede cambiarla'),
        (MINT, 'Revisada', 'Le has puesto un porcentaje', 'Se reparten las recompensas'),
    ]
    w, gap = 340, 40
    for i, (color, title, l1, l2) in enumerate(estados):
        x = 30 + i * (w + gap)
        body += rect(x, 70, w, 200, WHITE, 22, tint(color, 0.7) if color != GREY else color)
        body += circle(x + w / 2, 120, 26, color if color != GREY else GREY)
        body += text(x + w / 2, 172, title, 24, 700)
        body += text(x + w / 2, 208, l1, 17, 500, tint(NAVY, 0.65))
        body += text(x + w / 2, 234, l2, 17, 500, tint(NAVY, 0.65))
        if i < 2:
            body += arrow(x + w + 8, 170, x + w + gap - 8, tint(NAVY, 0.35), 4)
    body += text(200, 296, 'lo mueve el alumno', 16, 600, tint(NAVY, 0.5))
    body += text(920, 296, 'lo mueves tú', 16, 600, tint(NAVY, 0.5))
    return svg('estados-entrega', H, body)


def circuito_recompensas():
    """De dónde sale cada recurso y en qué se gasta."""
    H = 380
    body = ''
    filas = [
        (SKY, 'XP', 'Se gana entregando misiones', 'Sube de nivel y de rango', 'No se gasta'),
        (YELLOW, 'Monedas', 'Se ganan igual que el XP', 'Se gastan en la tienda de clase',
         'Se pueden perder'),
        (PURPLE, 'Maná', 'Se gana con misiones y comportamientos',
         'Se gasta en poderes de la tienda', 'Se recarga'),
    ]
    for i, (color, nombre, origen, destino, nota) in enumerate(filas):
        y = 40 + i * 110
        body += rect(30, y, 1140, 90, tint(color, 0.12), 20)
        body += circle(90, y + 45, 30, color)
        body += text(150, y + 45, nombre, 24, 700, NAVY, 'start')
        body += text(320, y + 30, origen, 18, 500, tint(NAVY, 0.7), 'start')
        body += text(320, y + 60, destino, 18, 600, NAVY, 'start')
        body += rect(940, y + 27, 200, 36, WHITE, 18)
        body += text(1040, y + 45, nota, 16, 600, tint(NAVY, 0.6))
    body += text(600, 358, 'Una moneda vale lo mismo que un punto de experiencia',
                 18, 600, tint(NAVY, 0.6))
    return svg('circuito-recompensas', H, body)


def rarezas_escala():
    """Las cuatro rarezas y para qué sirve cada una."""
    H = 300
    body = text(600, 34, 'La rareza dice lo que pesa una misión', 20, 600, tint(NAVY, 0.6))
    rarezas = [
        (tint(NAVY, 0.3), 'Común', 'El día a día', 'Recompensa base'),
        (SKY, 'Rara', 'Algo más de trabajo', 'Recompensa mayor'),
        (PURPLE, 'Épica', 'Proyectos y grupos', 'Recompensa alta'),
        (YELLOW, 'Legendaria', 'Lo importante del curso', 'Recompensa máxima'),
    ]
    w, gap = 265, 25
    for i, (color, nombre, uso, premio) in enumerate(rarezas):
        x = 30 + i * (w + gap)
        alto = 130 + i * 22
        y = 250 - alto
        body += rect(x, y, w, alto, tint(color, 0.25), 18)
        body += rect(x, y, w, 8, color, 4)
        body += text(x + w / 2, y + 44, nombre, 23, 700)
        body += text(x + w / 2, y + 78, uso, 17, 500, tint(NAVY, 0.65))
        body += text(x + w / 2, y + 104, premio, 17, 600, tint(NAVY, 0.8))
    body += rect(30, 262, 1140, 6, GREY, 3)
    body += text(120, 286, 'menos peso', 16, 600, tint(NAVY, 0.5))
    body += text(1090, 286, 'más peso', 16, 600, tint(NAVY, 0.5))
    return svg('rarezas-escala', H, body)


def anatomia_mision():
    """Las piezas de una misión, señaladas sobre la propia ficha."""
    H = 420
    body = rect(60, 40, 560, 340, WHITE, 24, GREY)
    body += rect(96, 76, 200, 180, tint(MINT, 0.5), 16)
    body += text(196, 166, 'portada', 18, 600, tint(NAVY, 0.7))
    body += rect(324, 76, 130, 34, tint(PURPLE, 0.4), 17)
    body += text(389, 93, 'rareza', 16, 600)
    body += rect(468, 76, 118, 34, tint(PINK, 0.5), 17)
    body += text(527, 93, 'entrega', 16, 600)
    body += rect(324, 128, 262, 14, GREY, 7)
    body += rect(324, 156, 220, 14, GREY, 7)
    body += rect(324, 184, 250, 14, GREY, 7)
    body += text(455, 232, 'descripción', 17, 600, tint(NAVY, 0.55))
    for i in range(3):
        y = 280 + i * 32
        body += circle(112, y + 8, 11, MINT if i == 0 else GREY)
        body += rect(134, y + 1, 200 + i * 40, 14, GREY, 7)
    body += text(430, 320, 'enigmas: los pasos', 17, 600, tint(NAVY, 0.55))

    lista = [
        (MINT, 'Portada', 'La imagen que la identifica en la lista'),
        (PURPLE, 'Rareza', 'Cuánto pesa: de común a legendaria'),
        (PINK, 'Fecha de entrega', 'Dispara el recordatorio del alumno'),
        (SKY, 'Enigmas', 'Los pasos que hay que completar'),
    ]
    for i, (color, titulo, detalle) in enumerate(lista):
        y = 62 + i * 82
        body += circle(690, y + 22, 14, color)
        body += text(724, y + 12, titulo, 21, 700, NAVY, 'start')
        body += text(724, y + 38, detalle, 17, 500, tint(NAVY, 0.65), 'start')
    return svg('anatomia-mision', H, body)


def xp_nivel():
    """Cómo el XP se convierte en nivel y en rango."""
    H = 300
    body = text(600, 36, 'El XP no se gasta: solo sube', 20, 600, tint(NAVY, 0.6))
    body += rect(60, 120, 1080, 44, GREY, 22)
    body += rect(60, 120, 700, 44, SKY, 22)
    hitos = [(60, 'Nivel 1'), (330, 'Nivel 2'), (600, 'Nivel 3'), (870, 'Nivel 4'), (1140, 'Nivel 5')]
    for i, (x, nombre) in enumerate(hitos):
        alcanzado = x <= 760
        cx = min(max(x, 76), 1124)
        body += circle(cx, 142, 26, WHITE)
        body += circle(cx, 142, 19, SKY if alcanzado else GREY)
        body += text(cx, 200, nombre, 18, 700 if alcanzado else 500,
                     NAVY if alcanzado else tint(NAVY, 0.45))
    body += text(600, 250, 'Al llegar a cierto nivel cambia el rango, que es el nombre '
                 'que acompaña al alumno', 18, 500, tint(NAVY, 0.6))
    body += text(600, 278, 'Los niveles y lo que cuesta cada uno se configuran por clase',
                 18, 500, tint(NAVY, 0.6))
    return svg('xp-nivel', H, body)


def vidas():
    """Comportamientos y puntos de vida: qué suma y qué resta."""
    H = 330
    body = text(600, 36, 'Los comportamientos mueven los puntos de vida', 20, 600, tint(NAVY, 0.6))
    body += rect(60, 70, 500, 220, tint(MINT, 0.16), 22)
    body += text(310, 108, 'Suman', 24, 700)
    for i, item in enumerate(['Ayudar a un compañero', 'Entregar antes de tiempo',
                              'Participar en clase']):
        y = 152 + i * 44
        body += circle(120, y, 13, MINT)
        body += text(148, y, item, 18, 500, NAVY, 'start')

    body += rect(640, 70, 500, 220, tint(CORAL, 0.14), 22)
    body += text(890, 108, 'Restan', 24, 700)
    for i, item in enumerate(['No entregar a tiempo', 'Interrumpir la clase',
                              'Saltarse las normas']):
        y = 152 + i * 44
        body += circle(700, y, 13, CORAL)
        body += text(728, y, item, 18, 500, NAVY, 'start')

    body += text(600, 312, 'Sin vidas, el alumno no pierde el curso: pierde acceso a la '
                 'tienda hasta recuperarlas', 18, 600, tint(NAVY, 0.6))
    return svg('vidas', H, body)


def flujo_plantillas():
    """De tu clase al catálogo y del catálogo a una clase nueva."""
    H = 300
    body = ''
    pasos = [
        (PURPLE, 'Tu clase', ['Con su narrativa,', 'misiones y tienda']),
        (MINT, 'La publicas', ['Se copia sin alumnos', 'ni notas']),
        (SKY, 'Catálogo', ['La ve el resto del', 'profesorado']),
        (YELLOW, 'Alguien la importa', ['Empieza con todo', 'montado']),
    ]
    w, gap = 255, 40
    for i, (color, title, lines) in enumerate(pasos):
        x = 40 + i * (w + gap)
        body += step(x, 40, w, 200, color, title, lines, number=i + 1)
        if i < len(pasos) - 1:
            body += arrow(x + w + 8, 140, x + w + gap - 8, tint(NAVY, 0.35), 4)
    body += text(600, 274, 'Lo que importa alguien es una copia: lo que cambie no toca tu clase',
                 18, 600, tint(NAVY, 0.6))
    return svg('flujo-plantillas', H, body)


def flujo_ia():
    """Atenea propone, el profesorado decide."""
    H = 290
    body = ''
    pasos = [
        (PURPLE, 'Le pides algo', ['Una misión, un enigma,', 'una narrativa']),
        (SKY, 'Atenea propone', ['Escribe un borrador', 'con lo que sabe de la clase']),
        (YELLOW, 'Tú lo revisas', ['Cambias lo que quieras', 'antes de nada']),
        (MINT, 'Se guarda', ['Solo si le das a guardar', 'tú']),
    ]
    w, gap = 255, 40
    for i, (color, title, lines) in enumerate(pasos):
        x = 40 + i * (w + gap)
        body += step(x, 30, w, 200, color, title, lines, number=i + 1)
        if i < len(pasos) - 1:
            body += arrow(x + w + 8, 130, x + w + gap - 8, tint(NAVY, 0.35), 4)
    body += text(600, 264, 'La IA nunca publica nada por su cuenta ni cambia las notas',
                 19, 700, tint(NAVY, 0.7))
    return svg('flujo-ia', H, body)


def vista_roles():
    """Lo mismo, visto por el profesorado y por el alumnado."""
    H = 360
    body = ''
    for i, (color, quien, items) in enumerate([
        (YELLOW, 'Lo que ves tú', ['Todas las clases y sus alumnos',
                                   'La bandeja de entregas por revisar',
                                   'La configuración y la tienda',
                                   'Las estadísticas de la clase']),
        (MINT, 'Lo que ve el alumno', ['Solo las clases en las que está',
                                       'Sus misiones y sus entregas',
                                       'Su avatar, su nivel y sus insignias',
                                       'La clasificación, si la activas']),
    ]):
        x = 40 + i * 580
        body += rect(x, 40, 540, 280, tint(color, 0.16), 22)
        body += circle(x + 50, 90, 22, color)
        body += text(x + 86, 90, quien, 24, 700, NAVY, 'start')
        for j, item in enumerate(items):
            y = 150 + j * 42
            body += circle(x + 50, y, 7, tint(NAVY, 0.3))
            body += text(x + 72, y, item, 18, 500, NAVY, 'start')
    body += text(600, 344, 'Un alumno nunca ve la nota ni la entrega de otro', 19, 600,
                 tint(NAVY, 0.65))
    return svg('vista-roles', H, body)


for fn in (flujo_mision, estados_entrega, circuito_recompensas, rarezas_escala, anatomia_mision,
           xp_nivel, vidas, flujo_plantillas, flujo_ia, vista_roles):
    print('✓', fn())
