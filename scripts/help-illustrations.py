"""
Ilustraciones del centro de ayuda de ITAKAI.

Son esquemas de la propia interfaz —tarjetas, barras de progreso, fichas de
recompensa— dibujados con la paleta de marca. Sin una sola palabra dentro del
dibujo: así valen igual en los diez idiomas de la plataforma.

Se ejecuta desde la raíz del repositorio:

    python3 scripts/help-illustrations.py

y reescribe los SVG de `app/public/app/ayuda`. Los colores son los mismos
tokens que `app/app/assets/css/tailwind.css`; si cambia la marca, se cambian
aquí y se vuelve a generar.
"""
import pathlib
import re

OUT = pathlib.Path(__file__).resolve().parent.parent / 'app' / 'public' / 'app' / 'ayuda'

NAVY = '#23245D'
WHITE = '#FFFFFF'
YELLOW = '#FFC338'
PURPLE = '#AC74FD'
PINK = '#FF9CA7'
MINT = '#6CF3AF'
SKY = '#00AAFC'
CORAL = '#FF6B6B'

W, H = 1200, 480


def tint(hex_color, ratio):
    """Mezcla el color con blanco: 0 = blanco, 1 = color puro."""
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    mix = lambda c: round(c * ratio + 255 * (1 - ratio))
    return '#%02X%02X%02X' % (mix(r), mix(g), mix(b))


def rect(x, y, w, h, fill, r=16, opacity=None):
    op = f' opacity="{opacity}"' if opacity is not None else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{op}/>'


def circle(cx, cy, r, fill, opacity=None):
    op = f' opacity="{opacity}"' if opacity is not None else ''
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{op}/>'


def line(x1, y1, x2, y2, stroke, width=6, cap='round', dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{stroke}" stroke-width="{width}" '
            f'stroke-linecap="{cap}" fill="none"{d}/>')


def card(x, y, w, h, r=24, fill=WHITE, shadow=NAVY):
    """Tarjeta blanca con una sombra suave, como las del producto."""
    return rect(x + 4, y + 8, w, h, shadow, r, 0.08) + rect(x, y, w, h, fill, r)


def text_lines(x, y, widths, color=NAVY, h=12, gap=22, opacity=0.18):
    return ''.join(rect(x, y + i * gap, w, h, color, h // 2, opacity)
                   for i, w in enumerate(widths))


def check(cx, cy, size, color):
    s = size
    return (f'<path d="M{cx - s} {cy} l{s * 0.7} {s * 0.7} L{cx + s} {cy - s * 0.8}" '
            f'stroke="{color}" stroke-width="{max(4, s * 0.45):.0f}" stroke-linecap="round" '
            f'stroke-linejoin="round" fill="none"/>')


def star(cx, cy, r, fill):
    import math
    pts = []
    for i in range(10):
        radius = r if i % 2 == 0 else r * 0.45
        angle = math.pi / 2 * 3 + i * math.pi / 5
        pts.append(f'{cx + radius * math.cos(angle):.1f},{cy + radius * math.sin(angle):.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"/>'


def blob(accent):
    """Fondo: manchas del color de la categoría, muy suaves."""
    return (rect(0, 0, W, H, tint(accent, 0.26), 0)
            + circle(1080, 90, 190, tint(accent, 0.48))
            + circle(120, 430, 160, tint(accent, 0.4))
            + circle(660, -40, 120, tint(accent, 0.34)))


def svg(name, accent, body):
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
           f'width="{W}" height="{H}" role="img">{blob(accent)}{body}</svg>')
    # Los cálculos dejan decimales interminables; en el fichero no aportan nada.
    doc = re.sub(r'\d+\.\d{3,}', lambda m: f'{float(m.group()):.2f}'.rstrip('0').rstrip('.'), doc)
    (OUT / f'{name}.svg').write_text(doc, encoding='utf-8')
    return name


# ---------------------------------------------------------------- ilustraciones

def recorrido():
    """Clase → misión → recompensa: el recorrido completo, en tres tarjetas."""
    body = ''
    for i, (x, accent) in enumerate([(80, PURPLE), (455, MINT), (830, YELLOW)]):
        body += card(x, 110, 290, 260)
        body += rect(x + 26, 136, 238, 74, tint(accent, 0.55), 14)
        body += circle(x + 63, 173, 22, accent)
        body += text_lines(x + 26, 232, [190, 140, 165])
        body += rect(x + 26, 306, 96, 30, accent, 15)
    for x in (395, 770):
        body += line(x, 240, x + 40, 240, NAVY, 7)
        body += (f'<path d="M{x + 32} 228 L{x + 46} 240 L{x + 32} 252" stroke="{NAVY}" '
                 f'stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    return svg('recorrido', YELLOW, body)


def clase_nueva():
    """Crear una clase: la portada arriba y los campos del formulario debajo."""
    body = card(120, 80, 420, 320)
    body += rect(120, 80, 420, 150, tint(PURPLE, 0.6), 24)
    body += rect(120, 190, 420, 40, tint(PURPLE, 0.6), 0)
    body += circle(330, 155, 44, WHITE, 0.85)
    body += star(330, 155, 26, PURPLE)
    body += text_lines(152, 262, [300, 220])
    body += rect(152, 330, 120, 34, PURPLE, 17)

    body += card(600, 110, 480, 260)
    for i, w in enumerate([300, 380, 240]):
        body += rect(632, 146 + i * 66, 120, 12, NAVY, 6, 0.3)
        body += rect(632, 168 + i * 66, 416, 34, tint(PURPLE, 0.22), 12)
        body += rect(648, 180 + i * 66, w, 10, NAVY, 5, 0.22)
    return svg('clase-nueva', PURPLE, body)


def mision():
    """Una misión: portada, rareza, fecha y las tres recompensas."""
    body = card(150, 90, 900, 300, 28)
    body += rect(182, 122, 260, 236, tint(MINT, 0.5), 20)
    body += circle(312, 208, 46, WHITE, 0.9)
    body += star(312, 208, 28, MINT)
    body += rect(238, 292, 148, 34, MINT, 17)

    body += rect(482, 132, 200, 30, tint(PURPLE, 0.45), 15)
    body += rect(698, 132, 130, 30, tint(PINK, 0.5), 15)
    body += text_lines(482, 190, [520, 470, 360], gap=26)
    for i, color in enumerate([SKY, YELLOW, PURPLE]):
        x = 482 + i * 106
        body += rect(x, 296, 90, 40, tint(color, 0.28), 20)
        body += circle(x + 22, 316, 12, color)
        body += rect(x + 42, 310, 34, 12, NAVY, 6, 0.35)
    return svg('mision', MINT, body)


def enigmas():
    """Los pasos de una misión: una lista encadenada, dos ya resueltos."""
    body = card(230, 70, 740, 340, 28)
    for i in range(4):
        y = 110 + i * 78
        done = i < 2
        body += circle(292, y + 26, 22, MINT if done else tint(NAVY, 0.12))
        if done:
            body += check(292, y + 26, 10, WHITE)
        else:
            body += circle(292, y + 26, 8, WHITE)
        if i < 3:
            body += line(292, y + 52, 292, y + 78, tint(NAVY, 0.18), 5, dash='2 12')
        body += rect(336, y + 6, 590, 42, tint(MINT, 0.22) if done else tint(NAVY, 0.05), 14)
        body += rect(360, y + 21, 300 - i * 30, 12, NAVY, 6, 0.3)
        body += rect(842, y + 19, 60, 16, MINT if done else tint(NAVY, 0.12), 8)
    return svg('enigmas', MINT, body)


def recompensas():
    """XP, monedas y maná: las tres fichas y la barra que llenan."""
    body = ''
    for i, (color, label) in enumerate([(SKY, 'xp'), (YELLOW, 'coin'), (PURPLE, 'mana')]):
        x = 130 + i * 330
        body += card(x, 90, 280, 200, 26)
        body += circle(x + 140, 160, 48, tint(color, 0.35))
        body += circle(x + 140, 160, 30, color)
        body += rect(x + 80, 232, 120, 18, NAVY, 9, 0.22)

    body += card(130, 330, 940, 90, 26)
    body += rect(170, 358, 860, 34, tint(NAVY, 0.08), 17)
    body += rect(170, 358, 560, 34, MINT, 17)
    body += circle(730, 375, 26, WHITE)
    body += circle(730, 375, 17, MINT)
    return svg('recompensas', MINT, body)


def entregas():
    """Revisar una entrega: el documento a un lado y el porcentaje al otro."""
    body = card(130, 80, 400, 320, 26)
    body += rect(166, 116, 150, 22, NAVY, 11, 0.25)
    body += text_lines(166, 164, [328, 300, 328, 250], gap=30)
    body += rect(166, 320, 190, 44, tint(MINT, 0.35), 22)
    body += check(196, 342, 11, MINT)

    body += card(590, 80, 480, 320, 26)
    body += circle(830, 200, 96, tint(NAVY, 0.07))
    body += (f'<path d="M830 104 a96 96 0 1 1 -68 164" stroke="{MINT}" stroke-width="26" '
             f'stroke-linecap="round" fill="none"/>')
    body += circle(830, 200, 58, WHITE)
    body += rect(786, 192, 88, 18, NAVY, 9, 0.3)
    body += rect(646, 330, 368, 34, tint(NAVY, 0.08), 17)
    body += rect(646, 330, 258, 34, MINT, 17)
    body += circle(904, 347, 24, WHITE)
    body += circle(904, 347, 14, MINT)
    return svg('entregas', MINT, body)


def tienda():
    """La tienda de clase: tres artículos con su precio en monedas."""
    body = ''
    for i, color in enumerate([YELLOW, PINK, PURPLE]):
        x = 110 + i * 340
        body += card(x, 90, 300, 300, 26)
        body += rect(x + 30, 122, 240, 130, tint(color, 0.4), 18)
        body += circle(x + 150, 187, 40, WHITE, 0.9)
        body += circle(x + 150, 187, 24, color)
        body += text_lines(x + 30, 276, [180], h=14)
        body += rect(x + 30, 316, 110, 40, tint(YELLOW, 0.35), 20)
        body += circle(x + 52, 336, 13, YELLOW)
        body += rect(x + 72, 330, 46, 12, NAVY, 6, 0.35)
        body += rect(x + 172, 316, 98, 40, NAVY, 20)
    return svg('tienda', PINK, body)


def insignias():
    """Insignias: tres medallas con su cinta, una todavía por conseguir."""
    body = ''
    for i, (color, earned) in enumerate([(YELLOW, True), (PINK, True), (PURPLE, False)]):
        cx = 300 + i * 300
        body += card(cx - 130, 90, 260, 300, 26)
        body += circle(cx, 210, 74, tint(color, 0.3) if earned else tint(NAVY, 0.06))
        body += circle(cx, 210, 54, color if earned else tint(NAVY, 0.12))
        body += star(cx, 210, 30, WHITE)
        body += (f'<path d="M{cx - 34} 268 l0 66 l34 -24 l34 24 l0 -66 z" '
                 f'fill="{color if earned else tint(NAVY, 0.12)}"/>')
        body += rect(cx - 70, 352, 140, 14, NAVY, 7, 0.22)
    return svg('insignias', PINK, body)


def niveles():
    """Niveles y rangos: la barra de experiencia con sus hitos."""
    body = card(120, 130, 960, 220, 28)
    body += rect(170, 236, 860, 40, tint(NAVY, 0.08), 20)
    body += rect(170, 236, 520, 40, PINK, 20)
    for i in range(5):
        cx = 170 + i * 215
        reached = i <= 2
        body += circle(cx, 256, 34, WHITE)
        body += circle(cx, 256, 26, PINK if reached else tint(NAVY, 0.12))
        if reached:
            body += star(cx, 256, 14, WHITE)
        body += rect(cx - 30, 314, 60, 12, NAVY, 6, 0.2)
    body += rect(170, 172, 200, 22, NAVY, 11, 0.25)
    body += rect(900, 168, 130, 30, tint(PINK, 0.4), 15)
    return svg('niveles', PINK, body)


def vista_alumno():
    """Lo que ve el alumno: su avatar, su progreso y sus misiones."""
    body = card(150, 70, 380, 340, 28)
    body += circle(340, 176, 66, tint(YELLOW, 0.45))
    body += circle(340, 158, 26, WHITE)
    body += (f'<path d="M296 214 a44 44 0 0 1 88 0 z" fill="{WHITE}"/>')
    body += rect(260, 268, 160, 16, NAVY, 8, 0.25)
    body += rect(206, 308, 268, 26, tint(NAVY, 0.08), 13)
    body += rect(206, 308, 178, 26, YELLOW, 13)

    body += card(590, 70, 480, 340, 28)
    for i in range(3):
        y = 108 + i * 96
        body += rect(626, y, 408, 72, tint(YELLOW, 0.18), 18)
        body += circle(668, y + 36, 24, YELLOW)
        body += rect(708, y + 20, 220 - i * 40, 12, NAVY, 6, 0.3)
        body += rect(708, y + 44, 140, 10, NAVY, 5, 0.2)
    return svg('vista-alumno', YELLOW, body)


def atenea():
    """La IA propone y el profesorado decide: un borrador y sus dos botones."""
    body = card(180, 80, 620, 320, 28)
    body += rect(216, 118, 240, 22, NAVY, 11, 0.25)
    body += text_lines(216, 170, [540, 500, 548, 420], gap=32)
    body += rect(216, 330, 150, 42, PURPLE, 21)
    body += rect(384, 330, 150, 42, tint(NAVY, 0.08), 21)

    body += circle(880, 200, 92, tint(PURPLE, 0.35))
    body += circle(880, 200, 68, WHITE)
    body += star(880, 200, 40, PURPLE)
    for cx, cy, r in [(996, 116, 16), (782, 118, 11), (964, 306, 13)]:
        body += star(cx, cy, r, PURPLE)
    return svg('atenea', PURPLE, body)


def narrativa():
    """La historia de la clase: un capítulo abierto y los que vienen detrás."""
    body = card(200, 80, 560, 320, 28)
    body += rect(236, 116, 300, 24, NAVY, 12, 0.28)
    body += text_lines(236, 172, [488, 460, 488, 380, 300], gap=32)

    for i in range(3):
        x = 810 + i * 22
        body += card(x, 120 + i * 10, 220, 240 - i * 20, 22, tint(PURPLE, 0.3 + i * 0.16))
    body += rect(852, 168, 140, 16, NAVY, 8, 0.25)
    body += text_lines(852, 208, [140, 118, 132], gap=26)
    return svg('narrativa', PURPLE, body)


def plantilla():
    """Publicar o importar una plantilla: de tu clase al catálogo y vuelta."""
    body = card(110, 120, 320, 250, 26)
    body += rect(142, 152, 256, 96, tint(PURPLE, 0.45), 18)
    body += text_lines(142, 272, [200, 160])
    body += rect(142, 320, 110, 32, PURPLE, 16)

    body += card(770, 120, 320, 250, 26)
    body += rect(802, 152, 256, 96, tint(MINT, 0.45), 18)
    body += text_lines(802, 272, [200, 160])
    body += rect(802, 320, 110, 32, MINT, 16)

    body += circle(600, 245, 88, WHITE, 0.9)
    body += (f'<path d="M552 222 h96" stroke="{NAVY}" stroke-width="9" stroke-linecap="round"/>'
             f'<path d="M634 208 l16 14 l-16 14" stroke="{NAVY}" stroke-width="9" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
             f'<path d="M648 272 h-96" stroke="{NAVY}" stroke-width="9" stroke-linecap="round"/>'
             f'<path d="M566 258 l-16 14 l16 14" stroke="{NAVY}" stroke-width="9" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    return svg('plantilla', PURPLE, body)


def invitar():
    """Invitar al alumnado: el código de la clase y quienes ya han entrado."""
    body = card(140, 90, 420, 300, 26)
    body += rect(176, 126, 348, 110, tint(YELLOW, 0.35), 18)
    for i in range(5):
        body += rect(202 + i * 62, 158, 42, 46, WHITE, 10)
    body += rect(176, 268, 200, 18, NAVY, 9, 0.25)
    body += rect(176, 316, 160, 40, YELLOW, 20)

    body += card(620, 90, 440, 300, 26)
    for i in range(4):
        y = 126 + i * 66
        body += circle(686, y + 24, 24, tint([YELLOW, PINK, MINT, PURPLE][i], 0.75))
        body += rect(726, y + 12, 200 - i * 24, 13, NAVY, 7, 0.3)
        body += rect(726, y + 36, 120, 10, NAVY, 5, 0.18)
        if i < 3:
            body += rect(956, y + 16, 72, 26, tint(MINT, 0.4), 13)
    return svg('invitar', YELLOW, body)


def accesibilidad():
    """Accesibilidad: tamaño de letra, contraste y paletas para daltonismo."""
    body = card(120, 100, 300, 280, 26)
    body += rect(156, 300, 228, 16, NAVY, 8, 0.2)
    for i, (size, y) in enumerate([(26, 200), (38, 196), (54, 190)]):
        cx = 190 + i * 78
        body += circle(cx, 200, size / 2 + 12, tint(MINT, 0.3))
        body += rect(cx - size / 4, y - size / 2, size / 2, size, NAVY, size / 6, 0.75)

    body += card(450, 100, 300, 280, 26)
    body += circle(600, 210, 78, NAVY)
    body += (f'<path d="M600 132 a78 78 0 0 0 0 156 z" fill="{WHITE}"/>')
    body += (f'<circle cx="600" cy="210" r="78" fill="none" stroke="{NAVY}" stroke-width="6"/>')
    body += rect(486, 300, 228, 16, NAVY, 8, 0.2)

    body += card(780, 100, 300, 280, 26)
    for i, color in enumerate([MINT, YELLOW, SKY, PINK, PURPLE, CORAL]):
        cx = 850 + (i % 3) * 80
        cy = 178 + (i // 3) * 78
        body += circle(cx, cy, 30, color)
    body += rect(816, 300, 228, 16, NAVY, 8, 0.2)
    return svg('accesibilidad', MINT, body)


def avisos():
    """Avisos y recordatorios: la campana y lo que llega por debajo."""
    body = circle(300, 218, 118, WHITE, 0.92)
    body += (f'<path d="M300 128 a68 68 0 0 1 68 68 v44 l20 30 h-176 l20 -30 v-44 '
             f'a68 68 0 0 1 68 -68 z" fill="{MINT}"/>')
    body += (f'<path d="M276 282 a24 24 0 0 0 48 0 z" fill="{MINT}"/>')
    body += circle(300, 122, 14, NAVY)
    body += circle(368, 152, 24, CORAL)

    body += card(500, 96, 600, 290, 26)
    for i in range(3):
        y = 132 + i * 86
        body += rect(536, y, 528, 66, tint(MINT, 0.2) if i == 0 else tint(NAVY, 0.05), 16)
        body += circle(578, y + 33, 20, MINT if i == 0 else tint(NAVY, 0.14))
        body += rect(614, y + 18, 300 - i * 50, 12, NAVY, 6, 0.3)
        body += rect(614, y + 40, 180, 10, NAVY, 5, 0.2)
    return svg('avisos', MINT, body)


def comportamientos():
    """Comportamientos y vidas: los corazones y los ajustes de la clase."""
    body = card(130, 100, 380, 280, 26)
    for i in range(3):
        cx = 220 + i * 100
        full = i < 2
        color = CORAL if full else tint(NAVY, 0.12)
        body += (f'<path d="M{cx} 232 c-46 -34 -70 -60 -70 -88 a38 38 0 0 1 70 -20 '
                 f'a38 38 0 0 1 70 20 c0 28 -24 54 -70 88 z" fill="{color}"/>')
    body += rect(166, 300, 308, 16, NAVY, 8, 0.2)

    body += card(570, 100, 500, 280, 26)
    for i, color in enumerate([MINT, PINK, MINT]):
        y = 136 + i * 76
        body += rect(606, y, 428, 60, tint(NAVY, 0.05), 16)
        body += circle(646, y + 30, 18, color)
        body += rect(680, y + 16, 220 - i * 40, 12, NAVY, 6, 0.3)
        body += rect(680, y + 38, 130, 10, NAVY, 5, 0.18)
        body += rect(950, y + 16, 60, 28, tint(color, 0.4), 14)
    return svg('comportamientos', PINK, body)



def recursos():
    """Elegir qué usa la clase: los interruptores de cada recurso."""
    body = card(300, 80, 600, 320, 28)
    for i, (color, on) in enumerate([(SKY, True), (YELLOW, True), (PURPLE, True), (CORAL, False)]):
        y = 116 + i * 66
        body += circle(348, y + 24, 22, tint(color, 0.35))
        body += circle(348, y + 24, 13, color)
        body += rect(388, y + 12, 230 - i * 30, 13, NAVY, 7, 0.3)
        body += rect(388, y + 34, 150, 10, NAVY, 5, 0.18)
        body += rect(760, y + 6, 104, 44, color if on else tint(NAVY, 0.12), 22)
        body += circle(842 if on else 782, y + 28, 16, WHITE)
    return svg('recursos', PURPLE, body)


def guia():
    """La guía de clase: el documento a la izquierda y su índice a la derecha."""
    body = card(140, 80, 560, 320, 28)
    body += rect(176, 116, 280, 24, NAVY, 12, 0.28)
    body += text_lines(176, 172, [488, 440, 488], gap=30)
    body += rect(176, 268, 488, 100, tint(PURPLE, 0.22), 18)
    body += rect(200, 296, 60, 44, PURPLE, 10)
    body += text_lines(280, 300, [300, 240], gap=24)

    body += card(760, 110, 320, 260, 26)
    for i in range(5):
        y = 148 + i * 44
        body += circle(796, y + 6, 8, PURPLE if i == 1 else tint(NAVY, 0.18))
        body += rect(820, y, 220 - (i % 3) * 40, 12, NAVY, 6, 0.32 if i == 1 else 0.18)
    return svg('guia', PURPLE, body)


def duplicar():
    """Duplicar la clase para el curso siguiente: la copia y lo que se queda."""
    body = card(190, 60, 330, 270, 24, tint(PURPLE, 0.35))
    body += card(250, 130, 330, 270, 24)
    body += rect(282, 162, 266, 96, tint(PURPLE, 0.5), 18)
    body += circle(415, 210, 34, WHITE, 0.9)
    body += star(415, 210, 20, PURPLE)
    body += text_lines(282, 286, [210, 160])
    body += rect(282, 342, 110, 32, PURPLE, 16)

    body += card(700, 110, 380, 270, 26)
    for i, keep in enumerate([True, True, False, True]):
        y = 146 + i * 60
        body += rect(732, y, 316, 46, tint(NAVY, 0.05), 14)
        body += circle(760, y + 23, 15, MINT if keep else tint(NAVY, 0.14))
        if keep:
            body += check(760, y + 23, 7, WHITE)
        body += rect(790, y + 17, 200 - i * 30, 12, NAVY, 6, 0.28)
    return svg('duplicar', PURPLE, body)


def publicar():
    """Publicar la clase como plantilla: sube al catálogo público."""
    body = card(150, 130, 340, 260, 26)
    body += rect(182, 162, 276, 100, tint(MINT, 0.45), 18)
    body += text_lines(182, 286, [210, 170])
    body += rect(182, 342, 120, 32, MINT, 16)

    body += (f'<path d="M600 300 L600 190" stroke="{NAVY}" stroke-width="10" '
             f'stroke-linecap="round"/>'
             f'<path d="M568 220 L600 186 L632 220" stroke="{NAVY}" stroke-width="10" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')

    body += circle(880, 240, 130, WHITE, 0.92)
    body += circle(880, 240, 104, tint(MINT, 0.45))
    body += (f'<ellipse cx="880" cy="240" rx="46" ry="104" fill="none" stroke="{WHITE}" '
             f'stroke-width="8"/>')
    body += (f'<path d="M776 240 h208 M792 180 h176 M792 300 h176" stroke="{WHITE}" '
             f'stroke-width="8" stroke-linecap="round"/>')
    return svg('publicar', PURPLE, body)


def rarezas():
    """Rareza y fecha de entrega: las cuatro etiquetas y el calendario."""
    body = card(120, 110, 480, 260, 26)
    for i, color in enumerate([tint(NAVY, 0.25), SKY, PURPLE, YELLOW]):
        y = 146 + i * 56
        body += rect(152, y, 300, 40, tint(color, 0.3), 20)
        body += circle(178, y + 20, 12, color)
        body += rect(202, y + 14, 180 - i * 24, 12, NAVY, 6, 0.32)
        body += rect(478, y + 8, 90, 24, tint(color, 0.5), 12)

    body += card(680, 110, 400, 260, 26)
    body += rect(680, 110, 400, 56, MINT, 26)
    body += rect(680, 140, 400, 26, MINT, 0)
    for i in range(14):
        cx = 730 + (i % 7) * 52
        cy = 214 + (i // 7) * 56
        today = i == 10
        body += circle(cx, cy, 20, MINT if today else tint(NAVY, 0.06))
        body += rect(cx - 9, cy - 5, 18, 10, WHITE if today else NAVY, 5,
                     None if today else 0.25)
    body += rect(716, 322, 160, 14, NAVY, 7, 0.2)
    return svg('rarezas', MINT, body)


def avatares():
    """Avatar y alias por clase: se elige cara y se escribe el nombre."""
    body = card(130, 90, 380, 300, 26)
    body += circle(320, 200, 78, tint(YELLOW, 0.45))
    body += circle(320, 178, 30, WHITE)
    body += (f'<path d="M268 246 a52 52 0 0 1 104 0 z" fill="{WHITE}"/>')
    body += rect(206, 306, 228, 40, tint(NAVY, 0.06), 20)
    body += rect(230, 320, 140, 12, NAVY, 6, 0.3)

    body += card(580, 90, 500, 300, 26)
    for i in range(6):
        cx = 664 + (i % 3) * 134
        cy = 176 + (i // 3) * 132
        color = [YELLOW, PINK, MINT, PURPLE, SKY, CORAL][i]
        selected = i == 1
        body += circle(cx, cy, 50, tint(color, 0.55))
        body += circle(cx, cy - 12, 19, WHITE)
        body += (f'<path d="M{cx - 33} {cy + 32} a33 33 0 0 1 66 0 z" fill="{WHITE}"/>')
        if selected:
            body += (f'<circle cx="{cx}" cy="{cy}" r="60" fill="none" stroke="{NAVY}" '
                     f'stroke-width="6"/>')
    return svg('avatares', YELLOW, body)


def clasificacion():
    """Clasificación y progreso: el podio de la clase."""
    body = card(120, 90, 480, 300, 26)
    for i, (h, cx, color) in enumerate([(96, 232, tint(NAVY, 0.16)), (150, 360, YELLOW),
                                        (66, 488, tint(CORAL, 0.55))]):
        body += circle(cx, 300 - h - 44, 34, tint(color, 0.6))
        body += circle(cx, 300 - h - 52, 13, WHITE)
        body += (f'<path d="M{cx - 22} {300 - h - 18} a22 22 0 0 1 44 0 z" fill="{WHITE}"/>')
        body += rect(cx - 58, 300 - h, 116, h + 46, color, 12)

    body += card(670, 110, 410, 260, 26)
    for i in range(4):
        y = 146 + i * 56
        body += rect(702, y, 346, 44, tint(YELLOW, 0.22) if i == 0 else tint(NAVY, 0.05), 14)
        body += rect(718, y + 14, 22, 16, NAVY, 6, 0.3)
        body += circle(768, y + 22, 15, [YELLOW, PINK, MINT, PURPLE][i])
        body += rect(796, y + 16, 150 - i * 20, 12, NAVY, 6, 0.28)
        body += rect(978, y + 14, 54, 16, YELLOW if i == 0 else tint(NAVY, 0.12), 8)
    return svg('clasificacion', YELLOW, body)


def proveedor_ia():
    """Configurar la IA: elegir proveedor y ajustar sus mandos."""
    body = card(130, 100, 420, 280, 26)
    for i, on in enumerate([True, False, False]):
        y = 142 + i * 74
        body += rect(162, y, 356, 58, tint(PURPLE, 0.24) if on else tint(NAVY, 0.05), 16)
        body += circle(196, y + 29, 18, PURPLE if on else tint(NAVY, 0.14))
        if on:
            body += circle(196, y + 29, 7, WHITE)
        body += rect(230, y + 16, 200 - i * 34, 12, NAVY, 6, 0.3)
        body += rect(230, y + 38, 130, 10, NAVY, 5, 0.18)

    body += card(620, 100, 460, 280, 26)
    for i, pos in enumerate([0.72, 0.35, 0.55]):
        y = 158 + i * 72
        body += rect(656, y, 388, 12, tint(NAVY, 0.1), 6)
        body += rect(656, y, round(388 * pos), 12, PURPLE, 6)
        body += circle(656 + round(388 * pos), y + 6, 22, WHITE)
        body += circle(656 + round(388 * pos), y + 6, 13, PURPLE)
    return svg('proveedor-ia', PURPLE, body)


def almacenamiento():
    """Dónde viven los ficheros: en el disco de casa o en un bucket."""
    body = card(140, 120, 360, 250, 26)
    for i in range(3):
        y = 168 + i * 56
        body += rect(180, y, 280, 42, tint(NAVY, 0.07), 12)
        body += circle(210, y + 21, 12, PURPLE if i == 0 else tint(NAVY, 0.16))
        body += rect(238, y + 15, 170 - i * 24, 12, NAVY, 6, 0.25)

    body += (f'<path d="M566 245 h100" stroke="{NAVY}" stroke-width="9" stroke-linecap="round"/>'
             f'<path d="M652 231 l16 14 l-16 14" stroke="{NAVY}" stroke-width="9" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')

    body += card(700, 120, 380, 250, 26)
    body += (f'<path d="M818 286 a54 54 0 0 1 6 -106 a70 70 0 0 1 132 22 '
             f'a44 44 0 0 1 -6 84 z" fill="{tint(PURPLE, 0.5)}"/>')
    body += (f'<path d="M888 196 L888 268" stroke="{WHITE}" stroke-width="12" '
             f'stroke-linecap="round"/>'
             f'<path d="M860 240 L888 270 L916 240" stroke="{WHITE}" stroke-width="12" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    body += rect(790, 312, 200, 14, NAVY, 7, 0.2)
    return svg('almacenamiento', PURPLE, body)


def seguridad():
    """Seguridad de la cuenta: contraseña y verificación."""
    body = card(140, 90, 420, 300, 26)
    body += (f'<path d="M350 128 L490 176 v96 c0 66 -58 106 -140 130 '
             f'c-82 -24 -140 -64 -140 -130 v-96 z" fill="{tint(MINT, 0.55)}"/>')
    body += check(350, 244, 34, WHITE)

    body += card(640, 110, 440, 260, 26)
    for i in range(2):
        y = 152 + i * 74
        body += rect(672, y, 120, 12, NAVY, 6, 0.28)
        body += rect(672, y + 24, 376, 40, tint(NAVY, 0.06), 14)
        for j in range(8):
            body += circle(700 + j * 26, y + 44, 7, NAVY, 0.35)
    body += rect(672, 302, 180, 42, MINT, 21)
    return svg('seguridad', MINT, body)



def correo_invitacion():
    """El correo de invitación que no aparece: bandeja, sobre y reloj."""
    body = card(150, 90, 460, 300, 26)
    for i in range(4):
        y = 126 + i * 62
        body += rect(186, y, 388, 48, tint(NAVY, 0.05) if i else tint(YELLOW, 0.28), 14)
        body += circle(216, y + 24, 14, YELLOW if i == 0 else tint(NAVY, 0.14))
        body += rect(244, y + 12, 220 - i * 30, 12, NAVY, 6, 0.3)
        body += rect(244, y + 32, 140, 9, NAVY, 5, 0.16)

    body += card(690, 120, 380, 240, 26)
    body += rect(730, 160, 300, 160, tint(YELLOW, 0.45), 16)
    body += (f'<path d="M730 176 L880 268 L1030 176" stroke="{WHITE}" stroke-width="12" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    body += circle(1046, 316, 42, WHITE)
    body += circle(1046, 316, 32, tint(CORAL, 0.6))
    body += (f'<path d="M1046 296 V318 L1062 328" stroke="{WHITE}" stroke-width="8" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    return svg('correo-invitacion', YELLOW, body)


def acceso_clase():
    """Un alumno que no ve la clase: la lista y una ficha que no está."""
    body = card(150, 90, 420, 300, 26)
    for i in range(4):
        y = 126 + i * 62
        falta = i == 2
        body += rect(186, y, 348, 48, tint(NAVY, 0.05), 14, )
        if falta:
            body += rect(186, y, 348, 48, tint(CORAL, 0.16), 14)
        body += circle(216, y + 24, 14, tint(CORAL, 0.7) if falta else tint(YELLOW, 0.7))
        body += rect(244, y + 17, 200 - i * 26, 13, NAVY, 6, 0.28)

    body += card(660, 110, 400, 260, 26)
    body += circle(860, 216, 74, tint(YELLOW, 0.35))
    body += rect(824, 206, 72, 62, WHITE, 10)
    body += (f'<path d="M840 206 v-20 a20 20 0 0 1 40 0 v20" stroke="{WHITE}" '
             f'stroke-width="11" fill="none" stroke-linecap="round"/>')
    body += circle(860, 236, 9, tint(YELLOW, 0.8))
    body += rect(760, 320, 200, 14, NAVY, 7, 0.2)
    return svg('acceso-clase', YELLOW, body)


def ia_en_silencio():
    """La IA que no contesta: el borrador vacío y la chispa apagada."""
    body = card(140, 90, 560, 300, 26)
    body += rect(176, 126, 240, 20, NAVY, 10, 0.22)
    body += rect(176, 176, 488, 170, tint(NAVY, 0.04), 16)
    for i in range(3):
        body += circle(384 + i * 46, 262, 13, tint(NAVY, 0.16))

    body += circle(900, 218, 108, tint(NAVY, 0.06))
    body += circle(900, 218, 78, WHITE)
    body += star(900, 218, 44, tint(NAVY, 0.14))
    body += (f'<path d="M812 130 L988 306" stroke="{CORAL}" stroke-width="16" '
             f'stroke-linecap="round"/>')
    return svg('ia-en-silencio', YELLOW, body)


def subida_fallida():
    """Una subida que no entra: el archivo y el aviso."""
    body = card(200, 80, 380, 320, 26)
    body += (f'<path d="M270 120 h160 l80 80 v180 a10 10 0 0 1 -10 10 h-230 '
             f'a10 10 0 0 1 -10 -10 v-250 a10 10 0 0 1 10 -10 z" fill="{tint(YELLOW, 0.4)}"/>')
    body += (f'<path d="M430 120 v80 h80" fill="{tint(YELLOW, 0.7)}"/>')
    for i in range(3):
        body += rect(300, 250 + i * 34, 160 - i * 30, 14, WHITE, 7)

    body += circle(830, 220, 96, tint(CORAL, 0.25))
    body += circle(830, 220, 70, CORAL)
    body += rect(820, 178, 20, 56, WHITE, 10)
    body += circle(830, 252, 11, WHITE)
    body += rect(700, 328, 260, 14, NAVY, 7, 0.2)
    return svg('subida-fallida', YELLOW, body)


def deshacer():
    """Lo borrado sin querer: la papelera y la flecha de vuelta."""
    body = card(200, 90, 360, 300, 26)
    body += rect(300, 150, 160, 30, tint(NAVY, 0.14), 15)
    body += (f'<path d="M288 196 h184 l-20 160 a12 12 0 0 1 -12 10 h-120 '
             f'a12 12 0 0 1 -12 -10 z" fill="{tint(NAVY, 0.12)}"/>')
    for i in range(3):
        body += rect(326 + i * 40, 224, 14, 100, WHITE, 7)

    body += circle(860, 220, 112, tint(MINT, 0.3))
    body += (f'<path d="M860 148 a72 72 0 1 0 72 72" stroke="{WHITE}" stroke-width="22" '
             f'stroke-linecap="round" fill="none"/>')
    body += (f'<path d="M824 176 L860 140 L896 176" stroke="{WHITE}" stroke-width="22" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    return svg('deshacer', YELLOW, body)


def recompensas_descuadradas():
    """Las cuentas que no salen: la barra y la pregunta."""
    body = card(140, 110, 620, 260, 26)
    for i, color in enumerate([SKY, YELLOW, PURPLE]):
        y = 150 + i * 64
        body += circle(196, y + 22, 20, color)
        body += rect(232, y + 14, 300 - i * 60, 16, NAVY, 8, 0.25)
        body += rect(590, y + 8, 130, 30, tint(NAVY, 0.06), 15)
        body += rect(614, y + 17, 82 - i * 20, 12, NAVY, 6, 0.28)

    body += circle(920, 230, 104, tint(YELLOW, 0.35))
    body += circle(920, 230, 74, WHITE)
    body += (f'<path d="M894 202 a26 26 0 1 1 26 34 v14" stroke="{tint(YELLOW, 0.9)}" '
             f'stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    body += circle(920, 272, 11, tint(YELLOW, 0.9))
    return svg('recompensas-descuadradas', YELLOW, body)


def cuenta_bloqueada():
    """No poder entrar: el formulario y el candado."""
    body = card(160, 100, 460, 280, 26)
    for i in range(2):
        y = 148 + i * 82
        body += rect(200, y, 120, 13, NAVY, 7, 0.28)
        body += rect(200, y + 26, 380, 42, tint(NAVY, 0.06), 14)
        for j in range(9):
            body += circle(230 + j * 26, y + 47, 7, NAVY, 0.3)
    body += rect(200, 320, 190, 42, YELLOW, 21)

    body += circle(880, 232, 110, tint(YELLOW, 0.3))
    body += rect(818, 224, 124, 106, WHITE, 16)
    body += (f'<path d="M846 224 v-30 a34 34 0 0 1 68 0 v30" stroke="{WHITE}" '
             f'stroke-width="18" fill="none" stroke-linecap="round"/>')
    body += circle(880, 268, 15, tint(YELLOW, 0.85))
    body += rect(872, 276, 16, 30, tint(YELLOW, 0.85), 8)
    return svg('cuenta-bloqueada', YELLOW, body)


def gestionar_ayuda():
    """Gestionar el centro de ayuda: la lista con su estado y el artículo previsualizado."""
    body = card(110, 90, 520, 300, 26)
    body += rect(146, 124, 150, 34, PURPLE, 17)
    body += rect(308, 124, 130, 34, tint(NAVY, 0.06), 17)
    for i, published in enumerate([True, False, True]):
        y = 186 + i * 64
        body += rect(146, y, 448, 50, tint(NAVY, 0.04), 14)
        body += rect(162, y + 11, 28, 28, tint(PURPLE, 0.55), 8)
        body += rect(206, y + 19, 180 - i * 30, 12, NAVY, 6, 0.3)
        body += rect(420, y + 13, 84, 24, MINT if published else tint(NAVY, 0.12), 12)
        body += (f'<path d="M530 {y + 22} l10 -9 l10 9 M530 {y + 30} l10 9 l10 -9" '
                 f'stroke="{NAVY}" stroke-width="4" stroke-linecap="round" '
                 f'stroke-linejoin="round" fill="none" opacity="0.35"/>')

    body += card(700, 110, 380, 270, 26)
    body += rect(730, 140, 320, 90, tint(PURPLE, 0.35), 16)
    body += text_lines(730, 254, [300, 250, 280, 200], gap=26)
    body += circle(1030, 110, 42, PURPLE)
    body += (f'<path d="M1004 110 q26 -24 52 0 q-26 24 -52 0 z" stroke="{WHITE}" '
             f'stroke-width="5" fill="none"/>')
    body += circle(1030, 110, 8, WHITE)
    return svg('gestionar-ayuda', PURPLE, body)


def encontrar_ayuda():
    """Dónde encontrar ayuda: el menú lateral con su enlace y la guía que abre."""
    body = card(100, 70, 560, 340, 26)
    body += rect(100, 70, 170, 340, tint(NAVY, 0.05), 26)
    body += rect(246, 70, 24, 340, tint(NAVY, 0.05), 0)
    body += circle(185, 118, 26, tint(YELLOW, 0.6))
    body += rect(145, 156, 80, 11, NAVY, 5, 0.3)
    for i in range(4):
        y = 186 + i * 26
        body += circle(132, y + 5, 6, NAVY, 0.14)
        body += rect(146, y, 86 - (i % 2) * 22, 10, NAVY, 5, 0.14)
    body += rect(120, 296, 130, 2, NAVY, 1, 0.12)
    body += rect(114, 308, 142, 34, WHITE, 12)
    body += (f'<rect x="114" y="308" width="142" height="34" rx="12" fill="none" '
             f'stroke="{YELLOW}" stroke-width="4"/>')
    body += circle(134, 325, 8, YELLOW)
    body += rect(150, 320, 84, 10, NAVY, 5, 0.3)
    body += rect(120, 356, 130, 2, NAVY, 1, 0.12)
    for i in range(2):
        body += rect(146, 370 + i * 18, 70 - i * 16, 8, NAVY, 4, 0.14)

    body += rect(306, 106, 320, 90, tint(YELLOW, 0.3), 16)
    body += text_lines(306, 222, [300, 250, 280], gap=28)
    body += rect(306, 330, 130, 40, YELLOW, 20)

    body += line(690, 240, 760, 240, NAVY, 7)
    body += (f'<path d="M748 226 L764 240 L748 254" stroke="{NAVY}" stroke-width="7" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')

    body += card(800, 110, 300, 270, 26)
    body += rect(800, 110, 300, 44, tint(NAVY, 0.06), 26)
    body += rect(800, 132, 300, 22, tint(NAVY, 0.06), 0)
    body += circle(828, 132, 7, tint(NAVY, 0.25))
    body += circle(850, 132, 7, tint(NAVY, 0.25))
    body += circle(950, 214, 38, tint(YELLOW, 0.5))
    body += (f'<path d="M936 196 a14 14 0 1 1 14 18 v8" stroke="{NAVY}" stroke-width="8" '
             f'stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    body += circle(950, 234, 5, NAVY)
    body += text_lines(830, 276, [240, 200, 220], gap=26)
    return svg('encontrar-ayuda', YELLOW, body)


for fn in (recorrido, clase_nueva, mision, enigmas, recompensas, entregas, tienda, insignias,
           niveles, vista_alumno, atenea, narrativa, plantilla, invitar, accesibilidad, avisos,
           comportamientos, recursos, guia, duplicar, publicar, rarezas, avatares, clasificacion,
           proveedor_ia, almacenamiento, seguridad, correo_invitacion, acceso_clase,
           ia_en_silencio, subida_fallida, deshacer, recompensas_descuadradas,
           cuenta_bloqueada, gestionar_ayuda, encontrar_ayuda):
    print('✓', fn())
