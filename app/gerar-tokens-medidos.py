#!/usr/bin/env python3
"""
Reescreve a lista de tokens de cada componente com o que ele REALMENTE pinta.

Pedido do Paulo: "sobre os [tokens] apresentados de cada página, de cada
componente, o interessante seria só mostrar os que estão sendo usado no componente
demonstrado".

Isto resolve a conformidade pela raiz. A auditoria doc↔componente fechava em 14 de
108 conformes — 94 divergências entre a lista DECLARADA e o que a tela mostra. A
alternativa era corrigir 94 listas à mão, o que envelheceria na primeira mudança de
componente. Aqui a lista passa a ser DERIVADA da medição: a doc diz a verdade por
construção, e volta a dizer depois de qualquer alteração, bastando rodar de novo.

O que conta como "usado pelo componente":
  · `background-color`, `border-color` e `outline-color` próprios;
  · `color` quando o elemento o DECLARA — cor herdada do palco não é escolha do
    componente (o palco dá `color: var(--content-primary)` a tudo, e sem esse
    filtro Content/Primary apareceria em 108 de 108).

Guarda-corpo: se a medição devolver lista VAZIA para um componente que hoje tem
tokens declarados, a lista antiga é preservada e o caso é reportado — lista vazia
costuma significar "não renderizou nesta rodada", e trocar dado bom por vazio é
pior que não mexer.

  node medir-tokens.cjs > /tmp/tokens-medidos.json   (produz a medição)
  python3 gerar-tokens-medidos.py /tmp/tokens-medidos.json
"""
import json, pathlib, sys

AQUI = pathlib.Path(__file__).parent
REG = AQUI / 'src/registry/componentes.json'
medicao = json.loads(pathlib.Path(sys.argv[1]).read_text())
reg = json.loads(REG.read_text())

ORDEM = {'Background': 0, 'Content': 1, 'Border': 2, 'Control': 3, 'Overlay': 4}


def ordenar(nomes):
    """Fundo, tinta, contorno — a mesma ordem da paleta, para a lista ser
    previsível de página para página."""
    return sorted(nomes, key=lambda n: (ORDEM.get(n.split('/')[0], 9), n))


mudou, vazios, iguais = [], [], 0
for c in reg:
    novo = medicao.get(c['id'])
    if novo is None:
        continue
    antes = c.get('tokens') or []
    if not novo and antes:
        vazios.append(c['id'])
        continue
    novo = ordenar(novo)
    if novo == antes:
        iguais += 1
        continue
    mudou.append((c['id'], len(antes), len(novo),
                  sorted(set(antes) - set(novo)), sorted(set(novo) - set(antes))))
    c['tokens'] = novo

REG.write_text(json.dumps(reg, indent=1, ensure_ascii=False) + '\n')

print(f'componentes: {len(reg)} · listas iguais: {iguais} · reescritas: {len(mudou)}')
if vazios:
    print(f'\n⚠ {len(vazios)} com medição VAZIA — lista antiga preservada '
          f'(provável falha de render nesta rodada): {", ".join(vazios[:8])}'
          + (' …' if len(vazios) > 8 else ''))
print('\n── as 18 maiores mudanças (o que saiu / o que entrou):')
for cid, na, nn, saiu, entrou in sorted(mudou, key=lambda x: -(len(x[3]) + len(x[4])))[:18]:
    print(f'{cid}  {na} → {nn} tokens')
    if saiu:
        print(f'   saiu:   {", ".join(saiu)}')
    if entrou:
        print(f'   entrou: {", ".join(entrou)}')
