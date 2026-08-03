#!/usr/bin/env python3
"""
Correção de paleta, parte 2 (2026-08-02) — simetria das famílias de estado.

A família Danger tem TRÊS tons de tinta: Content/Danger #E50000,
Content/OnDangerSubtle #B70000, Content/OnDangerSubtlePressed #5C0000. As outras
quatro famílias tinham só o primeiro — e o token `--content-<familia>-bold`, que
é TINTA, precisava apontar para um valor cujo único nome estava em Background:

    '--content-success-bold': 'Background/SuccessHover'   ← tinta com nome de fundo
    '--content-warning-bold': 'Background/WarningHover'
    '--content-risk-bold':    'Background/RiskHover'
    '--content-info-bold':    'Background/InfoHover'
    '--content-danger-bold':  'Content/OnDangerSubtle'    ← este já estava certo

Foi o que a auditoria de papel pegou no EdsAlertGroup: o ícone de alerta pintado
com #544500, cujo único nome era Background/WarningHover. O valor está correto e
passa contraste — faltava o NOME do papel. A nota do próprio SuccessHover já
dizia isso ("Também é a cor de TEXTO do botão de contorno de sucesso, 8,23:1 ✓"):
um valor em dois papéis, com nome só num deles.

Idempotente.
"""
import json, pathlib

ARQ = pathlib.Path(__file__).parent / 'src/dados/paleta.json'
d = json.loads(ARQ.read_text())
p = d['paleta']


def L(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4) for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def R(a, b):
    la, lb = L(a), L(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


# (nome novo, hex, de-onde-vem, sobre-qual-pastel, tom claro do dark)
NOVOS = [
    ('Content/OnSuccessSubtle', '#005C1F', 'Background/SuccessHover', '#EAFAF1', '#7ED89B'),
    ('Content/OnWarningSubtle', '#544500', 'Background/WarningHover', '#F6E697', '#D9C158'),
    ('Content/OnRiskSubtle',    '#4B1000', 'Background/RiskHover',    '#FFD29E', '#E0A06B'),
    ('Content/OnInfoSubtle',    '#1824AE', 'Background/InfoHover',    '#E9F3FE', '#8FA8F0'),
]

por_nome = {t['nome']: t for t in p}
for nome, hexv, origem, pastel, dark in NOVOS:
    if nome in por_nome:
        continue
    familia = nome.replace('Content/On', '').replace('Subtle', '')
    ancora = f'Content/{familia}'
    i = max(i for i, t in enumerate(p) if t['nome'] == ancora)
    p.insert(i + 1, {
        'grupo': 'Conteúdo',
        'nome': nome,
        'hex': hexv,
        'nota': f'TOKEN NOVO (2026-08-02) — tinta sobre o pastel de {familia.lower()} '
                f'({R(hexv, pastel):.2f}:1 ✓) e cor de texto do botão de contorno dessa família '
                f'({R(hexv, "#FFFFFF"):.2f}:1 ✓ sobre branco). Mesmo valor do {origem}, categoria de papel '
                f'diferente: aqui a cor é TINTA, não fundo. Fecha a simetria com a família Perigo, que já '
                f'tinha Content/OnDangerSubtle',
        'dark': dark,
        'cssVar': f'--content-{familia.lower()}-bold',
        'situacao': 'declarar',
    })

ARQ.write_text(json.dumps(d, indent=1, ensure_ascii=False))
print(f'paleta: {len(p)} tokens')
for nome, hexv, _, pastel, _ in NOVOS:
    print(f'  {nome:26} {hexv}  sobre o pastel {R(hexv, pastel):.2f}:1  sobre branco {R(hexv, "#FFFFFF"):.2f}:1')
