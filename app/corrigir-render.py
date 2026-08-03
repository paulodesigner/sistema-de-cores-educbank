#!/usr/bin/env python3
"""
Preenche props e slots dos componentes que renderizavam vazios (2026-08-02).

O Paulo mandou prints: o `AthDropButton` como um retângulo com uma setinha, o
`NavSelectTenant` dizendo "Nenhuma rede encontrada", o campo de busca esticado a
1500px com o texto no meio. Cor certa, forma errada — nada disso a auditoria de
cor mede.

Toda prop aqui saiu do `defineProps` do arquivo real (via `analisar-props.py`) e
todo slot saiu dos `<slot name="…">` do template. Nada foi chutado: prop
inventada não renderiza, e prop obrigatória faltando é o que fazia o componente
montar como casca (o `EdsButtonIcon` sem `icon` — que é `required: true` — sai
como um quadrado de 36×36 vazio).

`largura` é a largura que o componente tem NO PRODUTO: um campo vive numa coluna
de grid, não nos 766px do palco (ver Palco.vue).

Idempotente.
"""
import json, pathlib

ARQ = pathlib.Path(__file__).parent / 'src/registry/componentes.json'
reg = json.loads(ARQ.read_text())
por_id = {c['id']: c for c in reg}

# id → o que acrescentar. Comentário só onde a escolha não é óbvia.
CORRECOES = {
    # ─── casca vazia por falta de prop OBRIGATÓRIA ────────────────────────────
    'edsbuttonicon': {'props': {'icon': 'pencil-simple', 'variant': 'primary'}},
    'athinfinitloader': {'props': {'id': 'listaExemplo', 'loading': True, 'heightBox': 96}},
    # `Option` é {text, value} (SegmentControl.vue:41-44) — passei {label, value}
    # na 1ª versão e os botões saíram sem rótulo.
    'segmentcontrol': {'props': {'id': 'periodo', 'modelValue': 'mes', 'options': [
        {'text': 'Mês', 'value': 'mes'}, {'text': 'Trimestre', 'value': 'tri'},
        {'text': 'Ano', 'value': 'ano'}]}},
    # `TabIcons` é {name, step, icon, isActive} (tab/types/tabs.ts:19).
    'athtabsicon': {'props': {'tabs': [
        {'name': 'Lista', 'step': '1', 'icon': 'list', 'isActive': True},
        {'name': 'Funil', 'step': '2', 'icon': 'kanban', 'isActive': False}]}},
    'athcardoverviewdetails': {'props': {
        'textTitle': 'Faturas emitidas', 'icon': 'receipt', 'color': 'info'},
        'slots': {'left': 'R$ 18.430,00', 'right': '32 faturas'}},
    # `WizardStep` é {step, label} (AthWizard.vue:35-38) — com {title} o wizard
    # renderizava três bolinhas verdes sem nenhum rótulo.
    'athwizard': {'props': {'modelValue': 2, 'steps': [
        {'step': 1, 'label': 'Dados do aluno'},
        {'step': 2, 'label': 'Responsável'},
        {'step': 3, 'label': 'Contrato'}]}},
    # Os nomes vêm de `components/timeline/types/timeline.ts:3` — `AthTimelineType`
    # é {eventDate, text, details?, status}. Na 1ª versão inventei
    # {title, description, date} e a linha do tempo montou VAZIA: prop com nome
    # errado não é erro de execução, é silêncio.
    'athtimelinevertical': {'props': {'data': [
        {'eventDate': '2026-07-28T10:00:00', 'text': 'Fatura emitida',
         'details': ['Enviada ao responsável'], 'status': 'created'},
        {'eventDate': '2026-07-30T14:20:00', 'text': 'Pagamento confirmado',
         'details': ['Pix · R$ 1.250,00'], 'status': 'success'}]}},
    # `items` é required e eu não tinha passado. `AlertItem` é
    # {id, status, title, description?, dismissible?} (eds-alert-group/types.ts).
    'edsalertgroup': {'props': {'contextLabel': 'Nesta matrícula', 'startCollapsed': False,
        'items': [
            {'id': 1, 'status': 'error', 'title': 'Contrato vencido',
             'description': 'O contrato expirou em 20/07.', 'dismissible': True},
            {'id': 2, 'status': 'warning', 'title': 'Responsável sem telefone confirmado'},
            {'id': 3, 'status': 'success', 'title': 'Pagamento de julho confirmado'}]}},

    # ─── casca vazia por falta de SLOT ────────────────────────────────────────
    # O produto compõe estes por dentro; sem slot sobra só o contorno.
    'athdropbutton': {'props': {'text': 'Mais ações', 'isButton': True},
                      'slots': {'default': 'Exportar planilha'}},
    'athaccordion': {'props': {'id': 'exemploAcordeao', 'opened': True, 'info': '3 pendências'},
                     'slots': {'header': 'Dados do responsável', 'default': 'Ana Souza · 000.000.000-00'}},
    'athpopover': {'slots': {'default': 'Passe aqui', 'body': 'Detalhe da informação'}},
    'athpopoversimple': {'props': {'label': 'Ações'},
                         'slots': {'body': 'Editar · Duplicar · Excluir'}},
    'athinputthemedefault': {'props': {'textLabel': 'Nome do aluno'},
                             'slots': {'default': 'Ana Souza'}},
    'athtabs': {'slots': {'default': 'Dados · Faturas · Contrato'}},
    'athinputtextfake': {'props': {'title': 'Nome do aluno', 'text': 'Ana Souza'}},
    # `Filter` é {value, label} (filters/types/filter, confirmado em :51).
    'athfiltertablesimple': {'props': {'modelValue': 'todos', 'options': [
        {'value': 'todos', 'label': 'Todos'}, {'value': 'pagas', 'label': 'Pagas'},
        {'value': 'vencidas', 'label': 'Vencidas'}]}},

    # ─── montava, mas sem o que a prop revela ─────────────────────────────────
    # `showIcon` é false por default: o campo de busca aparecia SEM a lupa, que é
    # justamente o que o distingue de um campo de texto comum.
    'athinputtextsearch': {'props': {'showIcon': True, 'modelValue': 'Ana',
                                     'placeholder': 'Buscar aluno'}},
    'athcard': {'props': {'title': 'Faturas do mês', 'icon': 'receipt', 'isActive': True}},
    'athloader': {'props': {'text': 'Carregando as faturas', 'size': 'md'}, 'largura': 'cheia'},
    'athprocessingloader': {'props': {'modelValue': True, 'text': 'Processando o pagamento',
                                      'secondText': 'Isso pode levar alguns segundos'}},
    'athpanelfinishedsuccess': {'props': {
        'msgSuccess': 'Matrícula criada', 'msgDescription': 'O responsável recebeu o contrato por e-mail.',
        'msgBack': 'Voltar para a lista', 'msgCreateNew': 'Criar outra matrícula'}},
    # Atenção: o painel de ERRO não espelha o de sucesso. Ele usa
    # `message`/`description`/`textBack` (AthPanelFinishedError.vue), enquanto o de
    # sucesso usa `msgSuccess`/`msgDescription`/`msgBack`. Assumi a simetria e
    # passei os nomes errados — o painel montou oco.
    'athpanelfinishederror': {'props': {
        'message': 'Não foi possível criar a matrícula',
        'description': 'Confira os dados do responsável e tente de novo.',
        'textBack': 'Voltar para a lista', 'textAction': 'Tentar de novo'}},
    'athloadingbar': {'props': {'size': 'lg'}},
    'athtab': {'props': {'notification': 3}, 'slot': 'Faturas'},

    # ─── largura: componente que NÃO segue o default do grupo ─────────────────
    # Formulário de endereço é um bloco de vários campos: cabe em cheia.
    'athformaddress': {'largura': 'cheia'},
    'athswipemonths': {'largura': 'cheia'},      # régua de 12 meses
    'athinputrangeslider': {'largura': 'meio'},
    'athinputslider': {'largura': 'meio'},
    'athsecuritypassword': {'largura': 'meio'},
    'athcardbuttonsimple': {'largura': 'meio'},
    'athcardradiobutton': {'largura': 'meio'},
    'athprogressbar': {'largura': 'meio'},
    'athskeletontext': {'largura': 'meio'},
    'athhr': {'largura': 'meio'},

    # ─── lote final: os que sobraram depois da 1ª rodada ──────────────────────
    'athinputtexteditor': {'largura': 'cheia', 'props': {
        'textLabel': 'Mensagem do lembrete', 'name': 'mensagem',
        'modelValue': '<p>Olá! A mensalidade de <strong>agosto</strong> vence em 10/08.</p>',
        'placeholder': 'Escreva a mensagem'}},
    'modalitemtwoparts': {'slots': {'left': 'Dados do aluno', 'right': 'Faturas do ano'}},
    # Modal por EVENTO: o id da prop é o nome do evento que o abre (:107 do
    # componente). Sem o gatilho, o palco fica com 0 nós e parece quebrado.
    'athguardianinfomodal': {'abrirEvento': 'openAthGuardianInfoModal',
                             'props': {'guardianDefault': {
                                 'name': 'Ana Souza', 'document': '000.000.000-00',
                                 'email': 'ana@exemplo.com', 'phoneNumber': '11999990000',
                                 'isPrincipal': True}}},
}

# Chave duplicada num dict literal do Python é silenciosa: a última vence, e a
# primeira desaparece sem aviso. Foi o que aconteceu com 'athloader' e
# 'athinputtexteditor' na 1ª versão — as props sumiram e o componente seguiu
# renderizando vazio. Este bloco lê o PRÓPRIO arquivo e falha se houver repetição.
import ast as _ast
_fonte = pathlib.Path(__file__).read_text()
_arvore = _ast.parse(_fonte)
for _no in _ast.walk(_arvore):
    if isinstance(_no, _ast.Assign) and getattr(_no.targets[0], 'id', '') == 'CORRECOES':
        _chaves = [k.value for k in _no.value.keys]
        _dupes = {k for k in _chaves if _chaves.count(k) > 1}
        if _dupes:
            raise SystemExit(f'ERRO: chave repetida em CORRECOES: {sorted(_dupes)} — '
                             'junte as entradas numa só, senão a primeira é descartada em silêncio')

mudou = 0
for cid, patch in CORRECOES.items():
    c = por_id.get(cid)
    if not c:
        print(f'  ⚠ {cid} não está no registry')
        continue
    antes = json.dumps(c, sort_keys=True)
    for chave, valor in patch.items():
        if chave in ('props', 'slots') and isinstance(valor, dict):
            c[chave] = {**(c.get(chave) or {}), **valor}   # soma, não substitui
        else:
            c[chave] = valor
    if json.dumps(c, sort_keys=True) != antes:
        mudou += 1
        print(f'  {cid}: {" · ".join(patch.keys())}')

ARQ.write_text(json.dumps(reg, indent=1, ensure_ascii=False) + '\n')
print(f'\n{mudou} entradas do registry atualizadas de {len(CORRECOES)} pedidas')
print(f'agora: {sum(1 for c in reg if c.get("props"))} com props · '
      f'{sum(1 for c in reg if c.get("slot") or c.get("slots"))} com slot · '
      f'{sum(1 for c in reg if c.get("largura"))} com largura própria')
