#!/usr/bin/env python3
"""
Gera o par ESCURO dos 8 tokens que nasceram da auditoria de papel (2026-08-02).

Por que existe: quando criei os 8, escolhi o valor escuro por estimativa. O
artefato afirma que todo par claro/escuro é "gerado em OKLCH com o mesmo alvo de
contraste" — então a estimativa era uma afirmação falsa na documentação. Medindo,
`Border/Strong` saía a 2,81:1 contra a superfície escura: abaixo do piso de 3,0.

Método (o mesmo do M73):
  · converte o valor CLARO para OKLCH e preserva o MATIZ (a semântica da família
    vive no matiz; mudar o matiz entre esquemas troca o significado);
  · resolve o L que atinge o alvo de contraste contra o FUNDO DE REFERÊNCIA do
    papel — que não é a superfície para todos: tinta sobre pastel mira o pastel
    escuro, não o card;
  · alvos: 5,2:1 para tinta e 3,4:1 para contorno (folga sobre os pisos 4,5/3,0,
    porque parar exatamente no piso quebra no arredondamento de render);
  · token decorativo (contraste < 1,5 no claro por desenho) não tem alvo: mantém
    o MESMO passo de L em relação ao seu fundo, para a relação visual do claro
    sobreviver no escuro.

Idempotente: recalcula sempre a partir do valor claro.
"""
import json, pathlib
from lib_cor import contraste, hex_para_oklch, oklch_para_hex, resolver_L, distancia_oklab

ARQ = pathlib.Path(__file__).parent / 'src/dados/paleta.json'
d = json.loads(ARQ.read_text())
p = d['paleta']
por = {t['nome']: t for t in p}

ALVO_TINTA = 5.2
ALVO_CONTORNO = 3.4

# token → (nome do fundo de referência, alvo, papel)
CASOS = {
    # Tinta sobre o pastel da própria família. O gabarito é Content/OnDangerSubtle,
    # que já existia e mede 4,83:1 no claro e 5,21:1 no escuro.
    'Content/OnSuccessSubtle': ('Background/SuccessSubtle', ALVO_TINTA, 'tinta'),
    'Content/OnWarningSubtle': ('Background/WarningSubtle', ALVO_TINTA, 'tinta'),
    'Content/OnRiskSubtle':    ('Background/RiskSubtle',    ALVO_TINTA, 'tinta'),
    'Content/OnInfoSubtle':    ('Background/InfoSubtle',    ALVO_TINTA, 'tinta'),
    # Contorno escuro de peça pequena sobre a superfície.
    'Border/Strong':           ('Background/Surface',       ALVO_CONTORNO, 'contorno'),
    # Decorativos: 1,09:1 e 1,61:1 no claro POR DESENHO. Alvo não se aplica —
    # preserva-se o passo de L.
    'Border/BrandSubtle':      ('Background/BrandSelected', None, 'decorativo'),
    # ORDEM IMPORTA: a trilha tem de estar resolvida antes do preenchimento que
    # vai em cima dela. Na 1ª versão o Neutral vinha primeiro, foi resolvido
    # contra a trilha ANTIGA, e a trilha mudou depois no mesmo script — o par
    # saiu a 1,54:1 sem nenhum aviso.
    'Background/Track':        ('Background/Surface',       None, 'decorativo'),
    # Preenchimento neutro: tem DUAS restrições, não uma — precisa se separar da
    # trilha (3,0, é o par que diz quanto já foi preenchido) E aguentar o
    # Content/OnFill em cima (4,5). Tratado no bloco `duplo` abaixo.
    'Background/Neutral':      ('Background/Track',         'duplo', 'preenchimento'),
}

print(f'superfície escura: {por["Background/Surface"]["dark"]}\n')
print(f'{"token":26} {"claro":9} {"escuro":9} {"antes":9} contraste (claro → escuro)')
print('─' * 92)

mudou = []
for nome, (fundo_nome, alvo, papel) in CASOS.items():
    tok = por[nome]
    claro, antes = tok['hex'], tok.get('dark')
    fundo = por[fundo_nome]
    # o fundo escuro da trilha precisa já estar resolvido quando o Neutral roda:
    # a ordem do dicionário garante isso (Track é decorativo e vem depois, então
    # usamos o valor vigente dele, que este mesmo script mantém estável).
    fundo_claro, fundo_escuro = fundo['hex'], fundo['dark']
    r_claro = contraste(claro, fundo_claro)

    if alvo == 'duplo':
        # Duas restrições ao mesmo tempo: separar da trilha (≥3,0) e sustentar o
        # Content/OnFill em cima (≥4,5). No escuro o OnFill é ESCURO, então
        # clarear ajuda o texto e afasta da trilha — mas só até o ponto em que o
        # preenchimento encosta na superfície. Varre-se o L e escolhe-se o
        # primeiro que satisfaz os dois, com folga.
        L_c, C, H = hex_para_oklch(claro)
        on_fill = por['Content/OnFill']['dark']
        escolhido, melhor = None, None
        L = L_c
        for _ in range(700):
            cand = oklch_para_hex(L, C, H)
            r_trilha = contraste(cand, fundo_escuro)
            r_texto = contraste(cand, on_fill)
            if r_trilha >= 3.0 * 1.06 and r_texto >= 4.5 * 1.06:
                escolhido = (cand, r_trilha, r_texto)
                break
            folga = min(r_trilha / 3.0, r_texto / 4.5)
            if melhor is None or folga > melhor[1]:
                melhor = ((cand, r_trilha, r_texto), folga)
            L += 0.0015
            if L > 1.0:
                break
        novo, r_escuro, r_texto = escolhido or melhor[0]
        tok['dark'] = novo
        print(f'{nome:26} {claro:9} {novo:9} {str(antes):9} '
              f'{contraste(claro, fundo_claro):5.2f}:1 → {r_escuro:5.2f}:1  vs {fundo_nome.split("/")[1]:16} '
              f'2 restrições (trilha {r_escuro:.2f} · texto em cima {r_texto:.2f})'
              f'{"" if novo == antes else "  ← corrigido"}')
        if novo != antes:
            mudou.append((nome, antes, novo, r_escuro))
        continue

    if alvo is None:
        # Decorativo: preserva o TAMANHO do passo de L, mas ESPELHA a direção.
        # No claro a trilha é mais escura que o card porque o card é branco — só
        # existe para onde ir. No escuro o card é escuro, e repetir a direção
        # afunda a trilha no preto (medido: #030303, invisível). A inversão é o
        # mesmo princípio que o resto do sistema já usa: no escuro o
        # preenchimento vira o tom claro e o conteúdo em cima vira o escuro.
        L_c, C, H = hex_para_oklch(claro)
        L_fc, _, _ = hex_para_oklch(fundo_claro)
        L_fe, _, _ = hex_para_oklch(fundo_escuro)
        passo = abs(L_c - L_fc)
        novo = oklch_para_hex(max(0.0, min(1.0, L_fe + passo)), C, H)
        r_escuro = contraste(novo, fundo_escuro)
        nota_alvo = f'passo de L espelhado (±{passo:.3f})'
    else:
        # tinta e contorno sobre fundo escuro precisam CLAREAR
        novo, r_escuro = resolver_L(claro, fundo_escuro, alvo, clarear=True)
        nota_alvo = f'alvo {alvo}'

    tok['dark'] = novo
    marca = '' if novo == antes else '  ← corrigido'
    print(f'{nome:26} {claro:9} {novo:9} {str(antes):9} '
          f'{r_claro:5.2f}:1 → {r_escuro:5.2f}:1  vs {fundo_nome.split("/")[1]:16} {nota_alvo}{marca}')
    if novo != antes:
        mudou.append((nome, antes, novo, r_escuro))

ARQ.write_text(json.dumps(d, indent=1, ensure_ascii=False))
print(f'\n{len(mudou)} valor(es) escuro(s) corrigido(s) de {len(CASOS)}')

# ── verificações que precisam passar depois de mexer ─────────────────────────
print('\n── as 6 famílias continuam distinguíveis no escuro? (limiar 0,05)')
fam = ['Content/OnSuccessSubtle', 'Content/OnWarningSubtle', 'Content/OnRiskSubtle',
       'Content/OnInfoSubtle', 'Content/OnDangerSubtle']
pior = None
for i, a in enumerate(fam):
    for b in fam[i + 1:]:
        dist = distancia_oklab(por[a]['dark'], por[b]['dark'])
        if pior is None or dist < pior[0]:
            pior = (dist, a, b)
        if dist < 0.05:
            print(f'   ⚠ {a.split("/")[1]} × {b.split("/")[1]} = {dist:.3f}')
print(f'   pior par: {pior[1].split("/")[1]} × {pior[2].split("/")[1]} = {pior[0]:.3f}'
      f' {"✓" if pior[0] >= 0.05 else "✗"}')

print('\n── nenhum dos 8 colide com um token JÁ existente? (mesmo hex, mesma categoria)')
colisao = 0
for nome in CASOS:
    cat = nome.split('/')[0]
    for t in p:
        if t['nome'] == nome or not t['nome'].startswith(cat + '/'):
            continue
        if t['dark'] and t['dark'].upper() == por[nome]['dark'].upper():
            print(f'   ⚠ {nome} e {t["nome"]} têm o mesmo valor escuro {t["dark"]}')
            colisao += 1
print(f'   colisões: {colisao}')
