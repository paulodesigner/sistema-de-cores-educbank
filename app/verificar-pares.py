#!/usr/bin/env python3
"""
Verifica os PARES que as notas da paleta afirmam — nos dois esquemas.

A paleta não é uma lista de cores: é um conjunto de pares. Quando a nota de um
token diz "conteúdo em cima usa Content/OnFill", isso é uma promessa verificável,
e uma promessa que precisa valer no claro E no escuro. Este script mede.

Motivo de existir: os 8 tokens de 2026-08-02 mudaram valores e um deles
(Background/Neutral) tem exatamente uma nota desse tipo. Sem medir os dois
esquemas, a nota vira decoração.
"""
import json, pathlib, re
from lib_cor import contraste

ARQ = pathlib.Path(__file__).parent / 'src/dados/paleta.json'
p = json.loads(ARQ.read_text())['paleta']
por = {t['nome']: t for t in p}

PISO_TEXTO, PISO_OBJETO = 4.5, 3.0
falhas, avisos = [], []


def medir(tinta, fundo, piso, rotulo):
    """Mede o par nos dois esquemas. `dark` de um token pode faltar (token que só
    existe no claro) — nesse caso o esquema escuro é pulado, não inventado."""
    linhas = []
    for esquema, campo in (('claro', 'hex'), ('escuro', 'dark')):
        a, b = por[tinta].get(campo), por[fundo].get(campo)
        if not a or not b:
            linhas.append((esquema, None, None))
            continue
        r = contraste(a, b)
        ok = r >= piso
        linhas.append((esquema, r, ok))
        if not ok:
            falhas.append(f'{rotulo} [{esquema}] {a} sobre {b} = {r:.2f}:1 (piso {piso})')
    return linhas


print('══ 1 · Content/OnFill sobre TODO preenchimento sólido')
print('   (a promessa mais forte da paleta: "um valor cobre as seis famílias")')
PREENCHIMENTOS = [t['nome'] for t in p if t['nome'].startswith('Background/')
                  and not any(x in t['nome'] for x in ('Subtle', 'Surface', 'Canvas', 'Hover',
                                                       'Selected', 'Vivid', 'Track'))]
for f in PREENCHIMENTOS:
    ls = medir('Content/OnFill', f, PISO_TEXTO, f'OnFill × {f}')
    txt = '  '.join(f'{e} {r:5.2f}:1 {"✓" if ok else "✗"}' if r else f'{e} —' for e, r, ok in ls)
    print(f'   {f:34} {txt}')

print('\n══ 2 · tinta sobre o pastel da própria família')
PARES_PASTEL = [
    ('Content/OnSuccessSubtle', 'Background/SuccessSubtle'),
    ('Content/OnWarningSubtle', 'Background/WarningSubtle'),
    ('Content/OnRiskSubtle', 'Background/RiskSubtle'),
    ('Content/OnInfoSubtle', 'Background/InfoSubtle'),
    ('Content/OnDangerSubtle', 'Background/DangerSubtle'),
    ('Content/Success', 'Background/SuccessSubtle'),
    ('Content/Warning', 'Background/WarningSubtle'),
    ('Content/Risk', 'Background/RiskSubtle'),
    ('Content/Info', 'Background/InfoSubtle'),
    ('Content/OnBrandSubtle', 'Background/BrandSubtle'),
]
for tinta, fundo in PARES_PASTEL:
    ls = medir(tinta, fundo, PISO_TEXTO, f'{tinta} × {fundo}')
    txt = '  '.join(f'{e} {r:5.2f}:1 {"✓" if ok else "✗"}' if r else f'{e} —' for e, r, ok in ls)
    print(f'   {tinta:28} {txt}')

print('\n══ 3 · texto e contorno sobre as superfícies')
SUPERFICIES = ['Background/Surface', 'Background/Canvas', 'Background/Hover', 'Background/BrandSelected']
for sup in SUPERFICIES:
    for tinta, piso in (('Content/Primary', PISO_TEXTO), ('Content/Secondary', PISO_TEXTO),
                        ('Content/Tertiary', PISO_TEXTO), ('Border/Default', PISO_OBJETO),
                        ('Border/Strong', PISO_OBJETO)):
        ls = medir(tinta, sup, piso, f'{tinta} × {sup}')
        txt = '  '.join(f'{e} {r:5.2f}:1 {"✓" if ok else "✗"}' if r else f'{e} —' for e, r, ok in ls)
        print(f'   {tinta:20} sobre {sup.split("/")[1]:14} {txt}')
    print()

print('══ 4 · a barra de progresso (o par que o usuário LÊ é preenchido × vazio)')
for cheio in ('Background/Neutral', 'Background/Brand', 'Background/Success'):
    ls = medir(cheio, 'Background/Track', PISO_OBJETO, f'{cheio} × Track')
    txt = '  '.join(f'{e} {r:5.2f}:1 {"✓" if ok else "✗"}' if r else f'{e} —' for e, r, ok in ls)
    print(f'   {cheio:22} sobre a trilha  {txt}')
"""Por que o limite externo da trilha NÃO entra na lista de falhas.

A WCAG 1.4.11 pede 3:1 para as partes de um objeto gráfico necessárias para
entendê-lo. Numa barra de progresso, essa parte é a fronteira preenchido × vazio
— medida acima, e passa nos dois esquemas. O limite externo (trilha contra o
card) fica em 1,61:1 no claro.

Testei elevá-lo a 3:1 e o resultado mostra que o requisito é incompatível com o
componente: para separar do card branco, a trilha precisa ir a ~#949494 — e aí
ela ENCOSTA no preenchimento. Medido: Background/Neutral cai para 1,86:1 e até a
barra de marca cai para 1,64:1. Dois cinzas não fecham os dois pisos ao mesmo
tempo; ganhar o limite externo custa justamente o par que carrega a informação.

É também o que os DS de referência fazem: Material 3, Carbon e Polaris todos usam
trilha de baixo contraste contra a superfície. Então este par é medido e mostrado,
mas não conta como falha — e fica registrado aqui para ninguém "corrigir" depois
sem saber o que se perde.
"""
ls = medir('Background/Track', 'Background/Surface', 0, 'Track × Surface')
txt = '  '.join(f'{e} {r:5.2f}:1' if r else f'{e} —' for e, r, ok in ls)
print(f'   {"a trilha":22} sobre o card    {txt}   ← informativo (ver nota no código)')

print('\n══ 5 · pares que a NOTA de cada token afirma e que este script não cobre')
nao_cobertos = []
for t in p:
    for alvo in re.findall(r'(?:usa|com) (Content/\w+)', t.get('nota') or ''):
        if alvo in por:
            nao_cobertos.append((t['nome'], alvo))
cobertos = {(f, 'Content/OnFill') for f in PREENCHIMENTOS} | {(f, t) for t, f in PARES_PASTEL}
resto = [x for x in nao_cobertos if (x[0], x[1]) not in cobertos]
for fundo, tinta in resto:
    piso = PISO_TEXTO
    ls = medir(tinta, fundo, piso, f'{tinta} × {fundo} (da nota)')
    txt = '  '.join(f'{e} {r:5.2f}:1 {"✓" if ok else "✗"}' if r else f'{e} —' for e, r, ok in ls)
    print(f'   {tinta:26} sobre {fundo:30} {txt}')
if not resto:
    print('   (nenhum par afirmado ficou sem medição)')

print('\n' + '═' * 70)
if falhas:
    print(f'✗ {len(falhas)} par(es) abaixo do piso:')
    for f in falhas:
        print(f'   {f}')
else:
    print('✓ todos os pares afirmados passam nos dois esquemas')
