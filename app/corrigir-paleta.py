#!/usr/bin/env python3
"""
Correções de PALETA que a auditoria de papel revelou (2026-08-02).

A auditoria anterior só perguntava "esse hex está na paleta?". A de papel pergunta
"esse hex é o token CERTO para esse papel?" — e aí apareceram três lacunas reais
do padrão, não do produto. Cada uma está registrada com o motivo.

Rodar uma vez; é idempotente.
"""
import json, pathlib

ARQ = pathlib.Path(__file__).parent / 'src/dados/paleta.json'
d = json.loads(ARQ.read_text())
p = d['paleta']
por_nome = {t['nome']: t for t in p}

# ─────────────────────────────────────────────────────────────────────────────
# 1 · Content/OnFill: #F2F2F2 → #FFFFFF
#
# O token é o ÚNICO claro válido sobre os seis preenchimentos ("um valor cobre
# todas as famílias"). Estava em #F2F2F2, mas o produto pinta BRANCO PURO em 64
# lugares (`color: var(--ath-color-white)` — EdsButton.vue:145, AthTag.vue:117,
# AthCard.vue:88…). Como nenhum componente consome `--content-on-fill` ainda,
# o valor que divergia era o do padrão, não o do código.
# Branco puro também é melhor em TODOS os oito preenchimentos:
#   Brand 4,79→5,36 · Success 4,92→5,50 · Danger 6,22→6,97 · Warning 5,79→6,48
#   Risk 10,06→11,26 · Info 6,72→7,52 · BrandHover 6,64→7,43 · Inverse 13,47→15,08
# #F2F2F2 segue vivo nos papéis que são dele: Background/Hover e Border/Inverse.
# ─────────────────────────────────────────────────────────────────────────────
t = por_nome['Content/OnFill']
t['hex'] = '#FFFFFF'
t['nota'] = (
    'Conteúdo sobre preenchimento sólido — o nome diz o papel. É o ÚNICO claro válido sobre os 6 '
    'preenchimentos da plataforma (5,36 a 11,26:1 ✓) e sobre Background/Inverse (15,08:1 ✓). '
    'É por isso que não existe OnBrand, OnSuccess, OnDanger separado: um valor cobre todos. '
    'Mesmo valor do Background/Surface, categoria de papel diferente: aqui a cor é TINTA, não fundo'
)
t['situacao'] = 'trocar valor'

# ─────────────────────────────────────────────────────────────────────────────
# 2 · Border/Strong #575E6A — token novo
#
# A top bar contorna o chip do usuário com `border: solid 1px
# var(--ath-color-secondary-700)` (NavBar.vue:244) — a MESMA variável que pinta o
# texto dele (:249). O valor é Content/Secondary; como borda, era papel errado, e
# a escala de bordas neutras parava em Border/Hover #737373 — nada tão escuro.
# Ou eu clareava o contorno (perdia o pixel do produto) ou dava nome ao papel.
# Dei nome: mesmo hex, categoria diferente, contorno preservado.
# ─────────────────────────────────────────────────────────────────────────────
if 'Border/Strong' not in por_nome:
    i = max(i for i, t in enumerate(p) if t['nome'].startswith('Border/Hover'))
    p.insert(i + 1, {
        'grupo': 'Borda',
        'nome': 'Border/Strong',
        'hex': '#575E6A',
        'nota': 'TOKEN NOVO (2026-08-02) — contorno escuro de elemento pequeno sobre fundo claro: '
                'o chip de usuário da top bar. Fecha a escala neutra de bordas '
                '(Disabled E5 · Faint D9 · Subtle CC · Moderate 99 · Hover 73 · Strong 57). '
                'Mesmo valor do Content/Secondary, categoria de papel diferente: aqui a cor é CONTORNO, não tinta',
        'dark': '#60696D',
        'cssVar': '--border-strong',
        'situacao': 'declarar',
    })

# ─────────────────────────────────────────────────────────────────────────────
# 3 · Background/Track #CCCCCC e Background/Neutral #666666 — tokens novos
#
# A barra de progresso (AthProgressBar.vue:51) pinta a trilha com
# `--ath-color-secondary-300` (#CCCCCC = Border/Subtle) e o preenchimento neutro
# com #666666 (Content/Tertiary). Nos dois casos a cor é PREENCHIMENTO de uma
# faixa de 16px — não é borda nem tinta —, e a paleta de fundos não tinha cinza
# médio nenhum: só Canvas #F8F8F8 e Hover #F2F2F2, claros demais para uma trilha
# aparecer. Lacuna do padrão. Mesmo hex, categoria do papel.
# ─────────────────────────────────────────────────────────────────────────────
if 'Background/Track' not in por_nome:
    i = max(i for i, t in enumerate(p) if t['nome'] == 'Background/Hover')
    p.insert(i + 1, {
        'grupo': 'Fundo',
        'nome': 'Background/Track',
        'hex': '#CCCCCC',
        'nota': 'TOKEN NOVO (2026-08-02) — trilha vazia de barra de progresso e de trilho de controle. '
                'A paleta de fundos só tinha claros (Canvas, Hover): nenhum servia de trilha, porque a '
                'trilha precisa aparecer contra o cartão branco. Mesmo valor do Border/Subtle, categoria '
                'de papel diferente: aqui a cor é PREENCHIMENTO da faixa, não contorno',
        'dark': '#3A464B',
        'cssVar': '--background-track',
        'situacao': 'declarar',
    })
if 'Background/Neutral' not in por_nome:
    i = max(i for i, t in enumerate(p) if t['nome'] == 'Background/Track')
    p.insert(i + 1, {
        'grupo': 'Fundo',
        'nome': 'Background/Neutral',
        'hex': '#666666',
        'nota': 'TOKEN NOVO (2026-08-02) — preenchimento neutro sobre a trilha: progresso sem cor de '
                'estado, etapa concluída de um passo a passo. Conteúdo em cima usa Content/OnFill '
                '(5,74:1 ✓). Mesmo valor do Content/Tertiary, categoria de papel diferente',
        'dark': '#8C9499',
        'cssVar': '--background-neutral',
        'situacao': 'declarar',
    })

ARQ.write_text(json.dumps(d, indent=1, ensure_ascii=False))
print(f'paleta: {len(p)} tokens')
for n in ('Content/OnFill', 'Border/Strong', 'Background/Track', 'Background/Neutral'):
    t = {x['nome']: x for x in p}[n]
    print(f"  {n:22} {t['hex']}  {t['cssVar']}")
