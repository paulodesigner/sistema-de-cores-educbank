#!/usr/bin/env python3
"""
Corrige os tokens do tema ESCURO que falham no PIOR CASO de superfície.

O achado (2026-08-02, pelo verificar-pares.py):

  No esquema CLARO, resolver uma tinta contra o branco é automaticamente o pior
  caso — todas as outras superfícies (#F8F8F8, #F2F2F2) são mais escuras, então
  quem passa no branco passa em todas.

  No ESCURO isso se inverte e a intuição falha: a superfície padrão
  (Background/Surface #1B2429) NÃO é o pior caso. O pior caso é a mais CLARA —
  Background/Hover #2B3539, a linha sob o mouse. As tintas do escuro foram
  resolvidas contra o Surface, com folga pequena, e quebram no hover:

      Content/Tertiary  5,26:1 no card  →  4,19:1 na linha em hover  ✗
      Border/Default    3,41:1 no card  →  2,71:1 na linha em hover  ✗

  No tema escuro, a linha em hover é exatamente onde o texto discreto e o
  contorno de campo somem. É estado comum, não borda de caso.

Duas coisas que a 1ª versão deste script errou, e que ficam registradas porque são
fáceis de repetir:
  · DIREÇÃO — para separar uma tinta CLARA de um fundo, clareia-se; escurecer a
    aproxima do fundo primeiro. Escurecendo, `Border/Subtle` foi para #000000.
  · PISO POR PAPEL — divisor decorativo (Border/Subtle, Border/Faint) nunca
    precisou de 3:1: no claro ele mede 1,61:1 por desenho. Exigir 3,0 dele é
    inventar um requisito. 3:1 é para contorno de CONTROLE (campo, caixa de
    marcar), que é objeto gráfico essencial.
E: verificar o resultado antes de imprimir ✓ — a 1ª versão imprimia o alvo
pretendido, não o obtido.

O tema escuro é PROPOSTA (M73), não produção. Idempotente.
"""
import json, pathlib
from lib_cor import contraste, hex_para_oklch, luminancia, resolver_L

ARQ = pathlib.Path(__file__).parent / 'src/dados/paleta.json'
d = json.loads(ARQ.read_text())
p = d['paleta']
por = {t['nome']: t for t in p}

SUPERFICIES = ['Background/Surface', 'Background/Canvas', 'Background/Hover', 'Background/BrandSelected']
pior = max(SUPERFICIES, key=lambda n: hex_para_oklch(por[n]['dark'])[0])
pior_hex = por[pior]['dark']

print('superfícies no escuro, por luminosidade:')
for n in sorted(SUPERFICIES, key=lambda n: hex_para_oklch(por[n]['dark'])[0], reverse=True):
    L, _, _ = hex_para_oklch(por[n]['dark'])
    print(f'   {n:28} {por[n]["dark"]}  L {L:.3f}{"   ← pior caso" if n == pior else ""}')
print()

# Piso POR PAPEL. Fora daqui de propósito: Border/Subtle e Border/Faint são
# divisores decorativos (1,61:1 no claro, por desenho) e Content/Disabled é
# isento por norma (WCAG 1.4.3).
ALVOS = {
    'Content/Primary': 4.5, 'Content/Secondary': 4.5, 'Content/Tertiary': 4.5,
    'Border/Default': 3.0,      # contorno de campo — objeto gráfico essencial
    'Border/Moderate': 3.0,     # contorno de contêiner clicável
    'Border/Hover': 3.0,
    'Border/Strong': 3.0,
}
FOLGA = 1.06   # parar exatamente no piso quebra no arredondamento de render

print(f'{"token":22} {"antes":9} {"depois":9}  no card    no pior caso')
print('─' * 72)
mudou, ainda_falha = [], []
for nome, piso in ALVOS.items():
    tok = por.get(nome)
    if not tok or not tok.get('dark'):
        continue
    antes = tok['dark']
    r_card = contraste(antes, por['Background/Surface']['dark'])
    r_pior = contraste(antes, pior_hex)
    if r_pior >= piso:
        print(f'{nome:22} {antes:9} {"—":9}  {r_card:5.2f}:1   {r_pior:5.2f}:1  ✓')
        continue

    # DIREÇÃO pela luminância: afasta-se do fundo pelo lado em que já se está.
    clarear = luminancia(antes) >= luminancia(pior_hex)
    novo, r = resolver_L(antes, pior_hex, piso * FOLGA, clarear=clarear)
    obtido = contraste(novo, pior_hex)
    if obtido < piso:                      # não alcançou: não finge que alcançou
        ainda_falha.append((nome, novo, obtido, piso))
        print(f'{nome:22} {antes:9} {novo:9}  '
              f'{contraste(novo, por["Background/Surface"]["dark"]):5.2f}:1   {obtido:5.2f}:1  ✗ NÃO alcançou')
        continue
    tok['dark'] = novo
    mudou.append((nome, antes, novo, obtido))
    print(f'{nome:22} {antes:9} {novo:9}  '
          f'{contraste(novo, por["Background/Surface"]["dark"]):5.2f}:1   {obtido:5.2f}:1  ✓  '
          f'← {"clareado" if clarear else "escurecido"}')

ARQ.write_text(json.dumps(d, indent=1, ensure_ascii=False))
print(f'\n{len(mudou)} token(s) reresolvido(s) contra {pior} ({pior_hex})')
for nome, antes, novo, r in mudou:
    print(f'   {nome}: {antes} → {novo}  ({r:.2f}:1 no pior caso)')
if ainda_falha:
    print(f'\n⚠ {len(ainda_falha)} não alcançável no gamut — precisa de decisão de design:')
    for nome, novo, r, piso in ainda_falha:
        print(f'   {nome}: melhor possível {novo} = {r:.2f}:1 (piso {piso})')
