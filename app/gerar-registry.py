#!/usr/bin/env python3
"""Gera src/registry/componentes.json — a ponte entre a lista do artefato e o
arquivo .vue REAL de cada componente.

Nada aqui é adivinhado: o caminho vem de uma varredura do repositório
(read-only) casando pelo nome do arquivo. Componente sem arquivo com o mesmo
nome fica marcado, em vez de sumir da lista.
"""
import json, os, subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
HUB = os.path.abspath(os.path.join(AQUI, '../..'))
EBP = os.path.join(HUB, 'EducbankPay/webclient/src')

ext = json.load(open(os.path.join(AQUI, '../gerar/extraido.json')))
medidos = json.load(open(os.path.join(AQUI, '../gerar/tokens-medidos.json')))

arquivos = subprocess.run(['find', EBP, '-name', '*.vue'], capture_output=True, text=True).stdout.split('\n')
por_nome = {}
for p in arquivos:
    p = p.strip()
    if not p:
        continue
    nome = os.path.basename(p)[:-4]
    por_nome.setdefault(nome.lower(), p.replace(EBP, '@ebp'))

# Nome no artefato -> nome do arquivo, quando diferem
APELIDOS = {
    'switch': 'athinputswitch',
    # O item "Família Ath*Select*" era um agrupamento sem arquivo. Passa a
    # renderizar um select real da família, que é o que a página documenta.
    'athselectfamily': 'athinputselectenrollments',
}

# Props e slot mínimos para o componente montar mostrando algo. Só o que precisa;
# o resto monta com o default do próprio componente.
EXTRAS = {
  'edsbutton': {'props': {'type': 'primary'}, 'slot': 'Confirmar'},
  'edsbuttonremove': {'props': {}, 'slot': 'Remover'},
  'edsbuttonicon': {'props': {'icon': 'pencil-simple'}, 'slot': ''},
  'athinputtext': {'props': {'label': 'Nome do responsável', 'modelValue': 'João da Silva'}},
  # sem `options`/`modelValue` o componente chama parseTags(undefined) e quebra
  # `rules` e `name` explícitos: o vee-validate faz split() na regra e quebra
  # quando ela chega undefined
  'edsinputselect': {'props': {'label': 'Turma', 'modelValue': '1', 'name': 'turma', 'rules': '',
                               'options': [{'label': '1º ano', 'value': '1'},
                                           {'label': '2º ano', 'value': '2'},
                                           {'label': '3º ano', 'value': '3'}]}},
  'athinputmoney': {'props': {'label': 'Mensalidade', 'modelValue': 1250}},
  'athinputtextarea': {'props': {'label': 'Observação', 'modelValue': 'Texto de exemplo'}},
  'athinputcheckbox': {'props': {'label': 'Aceito os termos', 'modelValue': True}},
  'athinputswitch': {'props': {'modelValue': True}},
  'athinputradio': {'props': {'label': 'Mensal', 'modelValue': True}},
  'athinputpercentage': {'props': {'label': 'Desconto', 'modelValue': 10}},
  'athtag': {'props': {'text': 'Ativa', 'type': 'success'}, 'slot': 'Ativa'},
  'athbadge': {'props': {'value': 3}},
  'athpill': {'props': {}, 'slot': 'Rótulo'},
  'athtitle': {'props': {'title': 'Matrículas', 'subtitle': 'Acompanhe o funil'}, 'slot': 'Matrículas'},
  'athribbon': {'props': {'text': 'Turma encerrada'}, 'slot': 'Turma encerrada'},
  'athhr': {'props': {}},
  'athloading': {'props': {}},
  'athloader': {'props': {}},
  'athprogressbar': {'props': {'value': 60}},
  'athskeletontext': {'props': {}},
  'athskeletoninput': {'props': {}},
  'athbreadcrumb': {'props': {'items': [{'name': 'Início', 'path': '/'}, {'name': 'Matrículas'}]}},
  'athcard': {'props': {}, 'slot': 'Conteúdo do card'},
  'athpanelwarning': {'props': {'text': 'Confira os dados antes de continuar.'}, 'slot': 'Confira os dados antes de continuar.'},
  'athcopytext': {'props': {'text': 'ABC-123'}, 'slot': 'ABC-123'},
  'athcountdowntimer': {'props': {'seconds': 90}},
  # Props conferidas uma a uma no defineProps do próprio arquivo (analisar-props.py).
  'athpill': {'props': {'type': 'success', 'text': 'Ativa'}},
  'athmodal': {'props': {'type': 'full', 'name': 'demoAthModal'}, 'slot': 'Conteúdo do modal',
               'abrirEvento': 'demoAthModal'},
  # modal controlado por prop: o palco dá o gatilho (abrir automático cobriria a tela)
  'athmodalinformation': {'props': {'title': 'Sobre a matrícula',
                                    'description': 'Uma explicação curta sobre o que acontece nesta etapa.'},
                          'gatilhoProp': 'modelValue'},
  'athmodalcenter': {'props': {'title': 'Confirmar'}, 'slot': 'Essa ação não pode ser desfeita.',
                     'gatilhoProp': 'modelValue'},
  'athmodalheader': {'props': {'title': 'Confirmar exclusão'}},
  'athbreadcrumb': {'props': {'items': [{'name': 'Início', 'route': '/'}, {'name': 'Matrículas'}]},
                    'slot': 'Matrículas'},
  'athtab': {'props': {'name': 'Dados', 'selected': True}},
  'athtabs': {'props': {'notification': 2}, 'slot': 'Dados'},
  'athtabsnormal': {'props': {'data': [{'name': 'Resumo', 'selected': True}, {'name': 'Histórico'}]}},
  'athtabsicon': {'props': {'data': [{'name': 'Resumo', 'icon': 'list', 'selected': True}, {'name': 'Alunos', 'icon': 'student'}]}},
  'athwizard': {'props': {'modelValue': 2, 'steps': [{'name': 'Dados'}, {'name': 'Plano'}, {'name': 'Revisão'}]}},
  'athformtitle': {'props': {'title': 'Dados do responsável', 'icon': 'user'}},
  'athformtitlelist': {'props': {'title': 'Responsáveis'}},
  'athformheader': {'props': {'title': 'Matrícula 2026', 'subtitle': 'Colégio Horizonte'}},
  'athcopytext': {'props': {'id': 'cod', 'inputText': 'ABC-123'}},
  'athcopytextbox': {'props': {'id': 'cod2', 'inputText': 'https://educbank.com.br/m/ABC-123'}},
  'athpaneldescription': {'props': {'title': 'Resumo do plano'}, 'slot': 'Mensalidade de R$ 1.250,00 em 12 parcelas.'},
  'athmulticheckbox': {'props': {'value': ['a'], 'options': [{'name': 'Manhã', 'value': 'a'}, {'name': 'Tarde', 'value': 'b'}, {'name': 'Noite', 'value': 'c'}]}},
  'athinputmulticheckbox': {'props': {'value': ['a'], 'options': [{'name': 'Manhã', 'value': 'a'}, {'name': 'Tarde', 'value': 'b'}]}},
  'athformaddress': {'props': {'modelValue': {'zipCode': '01310-100', 'street': 'Av. Paulista', 'number': '1000',
                                              'complement': '', 'neighborhood': 'Bela Vista', 'city': 'São Paulo',
                                              'state': 'SP', 'country': 'BR'}}},
  'edsinputmultiselectsuggest': {'props': {'name': 'tags', 'textLabel': 'Interesses',
                                           'suggestionsLabel': 'Sugestões', 'suggestions': ['Integral', 'Bolsa', 'Transporte'],
                                           'modelValue': ['Integral']}},
  # AlertItem usa `status` ('info'|'warning'|'success'|'error'), conferido em alerts/eds-alert-group/types.ts
  'edsalertgroup': {'props': {'items': [
      {'id': '1', 'status': 'error', 'title': 'Boleto vencido', 'description': 'Vencido há 3 dias.'},
      {'id': '2', 'status': 'warning', 'title': 'Cadastro incompleto', 'description': 'Faltam dados do responsável.'},
      {'id': '3', 'status': 'success', 'title': 'Contrato assinado'}],
      'contextLabel': 'Matrícula', 'startCollapsed': False}},
  # Filter (components/filters/types/filter.ts): campos label/value
  'athfilterreferencesdate': {'props': {'modelValue': '2026-08-01', 'options': [
      {'label': 'Agosto 2026', 'value': '2026-08-01', 'name': 'Agosto 2026'},
      {'label': 'Julho 2026', 'value': '2026-07-01', 'name': 'Julho 2026'}]}},
  'athfiltertablesimple': {'props': {'options': [{'name': 'Todos', 'value': ''}, {'name': 'Ativos', 'value': 'a'}]}},
  # a prop é `item` (ItemNavNotification), não `notification`
  'itemnotification': {'props': {'item': {'id': '1', 'title': 'Matrícula concluída',
                                          'description': 'Gabriela Melo concluiu a matrícula.',
                                          'notificationType': 0, 'backgroundJobStatus': 1,
                                          'readTime': None, 'creationTime': '2026-08-02T10:00:00'}}},
  'athpanelfilestabledownloaddelete': {'props': {'files': [{'id': '1', 'name': 'contrato.pdf', 'size': 12345, 'fileName': 'contrato.pdf'}],
                                                 'items': [{'id': '1', 'name': 'contrato.pdf', 'fileName': 'contrato.pdf'}]}},
  'athpanelfilesupload': {'props': {'files': [{'id': '1', 'name': 'boleto.pdf', 'size': 5432}]}},
  # defineProps<{ show: boolean; currentPhone?: string | null }>
  'phoneverificationmodal': {'props': {'currentPhone': '11999990000'}, 'gatilhoProp': 'show'},
  'modalmfavalidated': {'props': {'modelValue': True, 'show': True}},
  'athinputtextsearch': {'props': {'label': 'Buscar aluno', 'modelValue': 'Ana'}},
  'athinputdiscount': {'props': {'label': 'Desconto', 'modelValue': 10}},
  'athtextselecteditems': {'props': {'items': [{'name': 'Manhã'}, {'name': 'Tarde'}]}},
  'athsignerslistinput': {'props': {'modelValue': [{'name': 'Ana Souza', 'email': 'ana@exemplo.com'}]}},
  'athtreejs': {'props': {'nodes': [{'id': 1, 'label': 'Colégio Horizonte', 'nodes': [{'id': 2, 'label': '1º ano'}]}]}},
  'athtreejsmultisearch': {'props': {'nodes': [{'id': 1, 'label': 'Colégio Horizonte', 'nodes': [{'id': 2, 'label': '1º ano'}]}]}},
  'athspreadsheetinspectionpanel': {'props': {'items': []}},
  'athalertbar': {'props': {'type': 'warning'}, 'slot': 'Confira os dados antes de continuar.'},
  'athinfos': {'props': {'title': 'Mensalidade', 'description': 'R$ 1.250,00'}},
  'athbadge': {'props': {'value': 3, 'text': '3'}},
  # Modais que se abrem por evento (event.listen no onMounted do próprio SFC).
  # O nome do evento e o formato da carga foram lidos em cada arquivo.
  'changepassword': {'props': {}, 'abrirEvento': 'openModalChangePassword'},
  'modalmfavalidated': {'props': {}, 'abrirEvento': 'modalMFAValidated',
                        'eventosAntes': [{'nome': 'openModalMFAValidated',
                                          'dados': {'message': 'Guarde estes códigos de recuperação',
                                                    'codes': ['824193', '577104', '390288', '146502', '731955', '208467']}}]},
  # dataTable com a forma exata do PropType do componente
  'athpanelfilestabledownloaddelete': {'props': {'id': 'contratos', 'dataTable': [
      {'id': '1', 'downloadName': 'contrato-2026.pdf', 'originalName': 'contrato-2026.pdf',
       'uploadedAt': '2026-08-01T10:00:00', 'signatureInfo': None},
      {'id': '2', 'downloadName': 'aditivo-01.pdf', 'originalName': 'aditivo-01.pdf',
       'uploadedAt': '2026-07-20T10:00:00', 'signatureInfo': None}]}},
  'athselectfamily': {'props': {'label': 'Matrícula', 'modelValue': None}},
  # <ath-modal name="openModalMyAccount"> + listener 'openMyAccountModalEvent'
  'securityaccount': {'props': {}, 'abrirEvento': 'openModalMyAccount',
                      'eventosAntes': [{'nome': 'openMyAccountModalEvent'}]},
  # os "vazios" abaixo precisam de conteúdo/slot para aparecer: nenhum é erro
  'athinputtextsearch': {'props': {'label': 'Buscar aluno', 'modelValue': 'Ana', 'placeholder': 'Buscar aluno'}},
  'athloading': {'props': {'loading': True, 'show': True, 'isLoading': True}},
  # AthRibbon e AthTab não têm defineProps: o conteúdo vem por SLOT
  # a prop é textLabel (lido no template do SFC), não `text` nem slot
  'athribbon': {'props': {'textLabel': 'Turma encerrada', 'class': 'dark'}},
  'athtab': {'props': {'name': 'Dados', 'selected': True, 'icon': 'student'}, 'slot': 'Dados'},
  # BreadCrumbItems = { text, route? } — conferido na interface do SFC
  'athbreadcrumb': {'props': {'items': [{'text': 'Início', 'route': '/'},
                                        {'text': 'Matrículas', 'route': '/'},
                                        {'text': 'Ana Souza'}]}},
  'ebtippy': {'props': {'content': 'Explicação do campo', 'placement': 'right'}, 'slot': 'Passe o mouse aqui'},
  'athmodalheader': {'props': {'title': 'Confirmar exclusão', 'name': 'demoHeader'}, 'slot': 'Confirmar exclusão'},
  # icon é obrigatório (nome do ícone Phosphor)
  'athicon': {'props': {'icon': 'student', 'fontSize': '2.4'}},
  'athcardwithbutton': {'props': {'title': 'Importar planilha',
                                  'description': 'Envie o arquivo com os alunos da turma.'}},
  'athpanelfinisheddata': {'props': {'msgSuccess': 'Dados enviados com sucesso',
                                     'subtitle': 'A escola vai revisar em até 2 dias úteis.',
                                     'icon': 'check-circle', 'msgButton': 'Voltar para matrículas',
                                     'firstInformation': '32 alunos', 'secondInformation': '3 turmas'}},
  # Tabelas: sem `data`+`columns` o componente real mostra o estado vazio ("Nenhum
  # registro") — fiel, mas não mostra cor de linha, hover nem seleção.
  'edstable': {'props': {
      'columns': [{'title': 'Aluno', 'field': 'aluno'}, {'title': 'Turma', 'field': 'turma'},
                  {'title': 'Situação', 'field': 'situacao'}],
      'data': [{'id': 1, 'aluno': 'Ana Souza', 'turma': '1º ano', 'situacao': 'Ativa'},
               {'id': 2, 'aluno': 'Bruno Lima', 'turma': '2º ano', 'situacao': 'Ativa'},
               {'id': 3, 'aluno': 'Carla Dias', 'turma': '3º ano', 'situacao': 'Pendente'}],
      'showCheckedRows': True, 'showPagination': False, 'pagination': False}},
}

saida = []
sem_arquivo = []
for c in ext:
    if c['id'] == 'athfiltercessionstatus':
        continue
    chave = APELIDOS.get(c['id'], c['titulo'].lower())
    caminho = por_nome.get(chave) or por_nome.get(c['id'])
    item = {
        'id': c['id'],
        'titulo': c['titulo'],
        'grupo': c['grupo'],
        'arquivo': caminho,
        'tokens': medidos.get(c['id'], []),
        'nota': c['hint'] or '',
    }
    extra = EXTRAS.get(chave) or EXTRAS.get(c['id'])
    if extra:
        item.update(extra)   # props, slot, abrirEvento, eventosAntes
    if not caminho:
        sem_arquivo.append(c['titulo'])
    saida.append(item)

# Além do JSON, gera um TS com IMPORTS EXPLÍCITOS. Um glob amplo (`**/*.vue`)
# quebra o build de produção: o repositório tem arquivos .vue vazios, e no build
# tudo é transformado (no dev o glob é lazy e o problema não aparece).
linhas_ts = [
    '/* GERADO por gerar-registry.py — não edite à mão.',
    '   Import explícito de cada componente real. Sem glob: arquivo vazio no',
    '   repositório derruba o build inteiro quando se varre tudo. */',
    'export const COMPONENTES: Record<string, () => Promise<any>> = {',
]
# EbTippy usa `defineProps<Partial<EbTippyProps>>()` com o tipo importado por
# alias; o compilador SFC não resolve esse tipo fora do app e derruba o BUILD
# (em dev ele só falhava ao montar). Fica de fora do import, com o motivo à
# vista na tela — é uma diretiva de tooltip, não um componente de cor.
SEM_IMPORT = set()

for item in sorted(saida, key=lambda x: x['id']):
    if item['id'] in SEM_IMPORT:
        item['motivo'] = 'tipo importado por alias que o compilador SFC não resolve fora do app (e depende de tippy.js)'
        continue
    if item['arquivo']:
        linhas_ts.append(f"  '{item['id']}': () => import('{item['arquivo']}'),")
linhas_ts.append('}')
open(os.path.join(AQUI, 'src/registry/componentes-imports.ts'), 'w', encoding='utf-8').write('\n'.join(linhas_ts) + '\n')

destino = os.path.join(AQUI, 'src/registry/componentes.json')
json.dump(saida, open(destino, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('gerado:', destino)
print('  componentes:', len(saida), '| com arquivo real:', sum(1 for x in saida if x['arquivo']))
print('  sem arquivo .vue de mesmo nome:', sem_arquivo)
