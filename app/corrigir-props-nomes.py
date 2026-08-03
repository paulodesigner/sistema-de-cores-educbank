#!/usr/bin/env python3
"""
Corrige os nomes de prop do registry que não existem no código (2026-08-02).

O `verificar-props.py` achou 28 casos. A maioria NÃO é desta rodada: são props
inventadas que estavam no registry desde antes e faziam o componente renderizar
parcialmente errado sem nenhum sinal — o Vue ignora prop desconhecida em silêncio.
O padrão mais comum é o mais banal: `label` onde o repo usa `textLabel`, e
`subtitle` onde o repo usa `subTitle` (camelCase com T maiúsculo).

Cada linha aqui foi conferida contra o `defineProps` do arquivo real. RENOMEAR
quando existe equivalente; REMOVER quando a prop simplesmente não existe (e o que
ela tentava fazer se resolve por slot ou por outra prop).

Rodar até `verificar-props.py` fechar em zero.
"""
import json, pathlib

ARQ = pathlib.Path(__file__).parent / 'src/registry/componentes.json'
reg = json.loads(ARQ.read_text())
por = {c['id']: c for c in reg}

# ── renomear: {id: {nome_errado: nome_certo}} ────────────────────────────────
RENOMEAR = {
    # `label` → `textLabel`: o rótulo de campo do repo é sempre textLabel.
    'athinputtext': {'label': 'textLabel'},
    'athinputmoney': {'label': 'textLabel'},
    'athinputtextarea': {'label': 'textLabel'},
    'athinputpercentage': {'label': 'textLabel'},
    'athinputdiscount': {'label': 'textLabel'},
    'athinputtextsearch': {'label': 'placeholder'},   # este componente não tem rótulo, só placeholder
    'athselectfamily': {'label': 'textLabel'},
    # camelCase com T maiúsculo
    'athformheader': {'subtitle': 'subTitle'},
    'athtitle': {'subtitle': 'subTitle'},
    # EdsButton usa `variant`, não `type`
    'edsbutton': {'type': 'variant'},
    # AthInputMultiCheckbox: o valor marcado é `valueCheckBox`
    'athinputmulticheckbox': {'value': 'valueCheckBox'},
    # AthPanelWarning: o texto é `message`
    'athpanelwarning': {'text': 'message'},
    # AthProgressBar: o quanto está preenchido é `completed`
    'athprogressbar': {'value': 'completed'},
    # AthTabsIcon: a lista é `tabs` (a chave `data` sobrou de uma versão antiga)
    'athtabsicon': {'data': None},
    # AthBadge mostra `text`, não `value`
    'athbadge': {'value': 'text'},
}

# ── remover: prop que não existe e cujo efeito vem de outro lugar ────────────
REMOVER = {
    # sobraram do merge com os nomes antigos — o painel de erro usa
    # message/description/textBack (ver corrigir-render.py)
    'athpanelfinishederror': ['msgError', 'msgDescription', 'msgBack'],
    # AthTab não tem contador; o que ele tem é name/step/icon/selected
    'athtab': ['notification'],
    # AthModalCenter não tem título por prop: o cabeçalho vem por slot
    'athmodalcenter': ['title'],
    # AthPanelFilesUpload não recebe arquivos por prop (o upload é interno)
    'athpanelfilesupload': ['files'],
}

# ── objetos dentro de listas: campos conferidos contra a interface ───────────
OBJETOS = {
    # TabNormal é {name, step, isActive, …} (tab/types/tabs.ts) — `selected` não existe
    # e `step`/`isActive` são obrigatórios.
    'athtabsnormal': ('data', [
        {'name': 'Dados', 'step': '1', 'isActive': True},
        {'name': 'Faturas', 'step': '2', 'isActive': False},
    ]),
    # Filter é {value, label, field?, icon?, typeInput?} — `name` não existe.
    'athfilterreferencesdate': ('options', [
        {'value': '2026-08', 'label': 'Agosto/2026'},
        {'value': '2026-07', 'label': 'Julho/2026'},
    ]),
    # TreeDataType exige checked e expanded.
    # `TreeDataType` usa `label` (tree/types/tree-data.types.ts) — escrevi `text`
    # na 1ª tentativa. Terceira vez que erro o nome do campo de rótulo neste
    # mesmo dia; é exatamente o erro que o verificador existe para pegar.
    'athtreejs': ('nodes', [
        {'id': 1, 'label': 'Colégio Horizonte', 'checked': False, 'expanded': True,
         'nodes': [{'id': 2, 'label': '1º ano', 'checked': True, 'expanded': False},
                   {'id': 3, 'label': '2º ano', 'checked': False, 'expanded': False}]},
    ]),
    'athtreejsmultisearch': ('nodes', [
        {'id': 1, 'label': 'Colégio Horizonte', 'checked': False, 'expanded': True,
         'nodes': [{'id': 2, 'label': '1º ano', 'checked': True, 'expanded': False},
                   {'id': 3, 'label': '2º ano', 'checked': False, 'expanded': False}]},
    ]),
}

n = 0
for cid, mapa in RENOMEAR.items():
    c = por.get(cid)
    if not c or not c.get('props'):
        continue
    for errado, certo in mapa.items():
        if errado not in c['props']:
            continue
        valor = c['props'].pop(errado)
        if certo:
            c['props'].setdefault(certo, valor)
        print(f'  {cid}: {errado} → {certo or "(removida)"}')
        n += 1

for cid, nomes in REMOVER.items():
    c = por.get(cid)
    if not c or not c.get('props'):
        continue
    for nome in nomes:
        if c['props'].pop(nome, '__nao__') != '__nao__':
            print(f'  {cid}: removida a prop `{nome}` (não existe no defineProps)')
            n += 1

for cid, (nome, valor) in OBJETOS.items():
    c = por.get(cid)
    if not c:
        continue
    c.setdefault('props', {})[nome] = valor
    print(f'  {cid}: `{nome}` reescrito conforme a interface')
    n += 1

ARQ.write_text(json.dumps(reg, indent=1, ensure_ascii=False) + '\n')
print(f'\n{n} correções aplicadas')
