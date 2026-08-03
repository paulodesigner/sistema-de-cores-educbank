#!/usr/bin/env python3
"""
Conversão de cor e contraste, sem dependência externa.

Existe porque os pares claro/escuro do sistema são gerados em OKLCH — onde o L é
perceptualmente uniforme —, e não escolhidos no olho. O caminho é
sRGB → linear → XYZ(D65) → OKLab → OKLCH e volta, com verificação de gamut.

Fórmulas: OKLab de Björn Ottosson (2020); contraste da WCAG 2.1 (1.4.3).
"""
import math

# ─── sRGB ────────────────────────────────────────────────────────────────────
def hex_para_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_para_hex(rgb):
    return '#' + ''.join(f'{round(max(0.0, min(1.0, c)) * 255):02X}' for c in rgb)


def _para_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _de_linear(c):
    return c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


# ─── OKLab / OKLCH ───────────────────────────────────────────────────────────
def rgb_para_oklab(rgb):
    r, g, b = (_para_linear(c) for c in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklab_para_rgb(lab):
    L, a, b = lab
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = (v ** 3 for v in (l_, m_, s_))
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return tuple(_de_linear(c) for c in (r, g, bb))


def hex_para_oklch(h):
    L, a, b = rgb_para_oklab(hex_para_rgb(h))
    C = math.hypot(a, b)
    H = math.degrees(math.atan2(b, a)) % 360
    return L, C, H


def oklch_para_rgb(L, C, H):
    rad = math.radians(H)
    return oklab_para_rgb((L, C * math.cos(rad), C * math.sin(rad)))


def no_gamut(rgb, tol=1e-4):
    return all(-tol <= c <= 1 + tol for c in rgb)


def oklch_para_hex(L, C, H):
    """Reduz o croma até caber no gamut sRGB — preserva matiz e luminosidade,
    que são o que carrega a semântica da família."""
    c = C
    for _ in range(64):
        rgb = oklch_para_rgb(L, c, H)
        if no_gamut(rgb):
            return rgb_para_hex(rgb)
        c *= 0.97
    return rgb_para_hex(oklch_para_rgb(L, 0, H))


# ─── contraste WCAG ──────────────────────────────────────────────────────────
def luminancia(h):
    r, g, b = (_para_linear(c) for c in hex_para_rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a, b):
    la, lb = luminancia(a), luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def distancia_oklab(a, b):
    """Distância perceptual. Abaixo de ~0,05 duas cores lidas lado a lado
    confundem — foi o critério que pegou a colisão Alerta × Risco (M72)."""
    la, aa, ba = rgb_para_oklab(hex_para_rgb(a))
    lb, ab, bb = rgb_para_oklab(hex_para_rgb(b))
    return math.dist((la, aa, ba), (lb, ab, bb))


def resolver_L(hex_claro, fundo, alvo, clarear=True, passo=0.0015):
    """Acha o tom que atinge o contraste `alvo` contra `fundo`, preservando o
    matiz do hex de origem. `clarear=True` sobe o L (token de tinta sobre fundo
    escuro); False desce (preenchimento escuro).

    Devolve (hex, contraste_obtido). Se o alvo for inalcançável no gamut, devolve
    o melhor que conseguiu — quem chama decide se aceita.
    """
    L0, C, H = hex_para_oklch(hex_claro)
    melhor, melhor_r = None, 0.0
    L = L0
    for _ in range(700):
        h = oklch_para_hex(L, C, H)
        r = contraste(h, fundo)
        if r > melhor_r:
            melhor, melhor_r = h, r
        if r >= alvo:
            return h, r
        L = L + passo if clarear else L - passo
        if not 0.0 <= L <= 1.0:
            break
    return melhor, melhor_r
