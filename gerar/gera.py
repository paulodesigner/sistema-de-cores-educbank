#!/usr/bin/env python3
"""Gera sistema-de-cores/index.html — a documentação FINAL do sistema de cores.

Só o presente: nenhum "antes", nenhum "hoje era". Os componentes vêm do estudo
(`estudo-de-cores/index.html`), lado do padrão apenas, com os valores legados
trocados pelos do padrão. A paleta e os papéis vêm dos mesmos dados do estudo.
"""
import json, re, sys, html as H
sys.path.insert(0, '.')
from uso import USO

BASE = __file__.rsplit('/sistema-de-cores/', 1)[0]
ESTUDO = BASE + '/estudo-de-cores/index.html'
SAIDA = BASE + '/sistema-de-cores/index.html'

fonte = open(ESTUDO, encoding='utf-8').read()
ext = json.load(open('extraido.json'))
dados = json.load(open('paleta.json'))
paleta, familias, superficies, alias = dados['paleta'], dados['familias'], dados['superficies'], dados['alias']

# ─────────────────────────────────────────────────────────────────────────────
# 1 · Assets herdados do estudo: os ícones e o CSS (a fidelidade dos componentes
#     depende do CSS original — ele é cópia do SCSS do produto).
# ─────────────────────────────────────────────────────────────────────────────
defs = re.search(r'(<svg width="0" height="0".*?</svg>)', fonte, re.S).group(1)
style_todo = re.search(r'<style>(.*?)</style>', fonte, re.S).group(1)

# Valores legados -> valores do padrão. Aplicado ao CSS de componentes E ao HTML
# extraído, para que o artefato final não contenha nenhum valor fora da paleta.
TROCAS = [
    ('#1a1a1a', '#002a3a'),   # Content/Primary
    ('#7d8097', '#666666'),   # Content/Tertiary
    ('#a6a6a6', '#666666'),   # Content/Tertiary
    ('#2d3849', '#575e6a'),   # Content/Secondary
    ('#665200', '#6f5d00'),   # Content/Warning
    ('#7a4b00', '#6b2300'),   # Content/Risk
    ('#e3e4e9', '#cccccc'),   # Border/Subtle
    ('#8a76eb', '#6b55d8'),   # Content/Brand
    ('#898989', '#8c8c8c'),   # Border/Default
    ('#cca300', '#ae9300'),   # Border/Warning
    ('#e2e2e2', '#f2f2f2'),   # Background/Hover
    ('rgba(51,51,51,.5)', 'rgba(0,0,0,.5)'),        # Overlay/Scrim
    ('rgba(51, 51, 51, 0.5)', 'rgba(0,0,0,.5)'),
    ('rgba(0,0,0,.6)', 'rgba(0,0,0,.5)'),
    ('rgba(0, 0, 0, 0.6)', 'rgba(0,0,0,.5)'),
    ('#f7c9c9', '#ffafa0'),   # Background/DangerSubtlePressed
    ('#333333', '#002a3a'),   # Content/Primary
    ('#5b5f66', '#575e6a'),   # Content/Secondary
    ('#f2f0fc', '#f3f1ff'),   # Background/BrandSelected
    ('#eef0f4', '#f2f2f2'),   # Background/Hover
    ('#8a8e94', '#666666'),   # Content/Tertiary
]
def padroniza(txt):
    total = 0
    for a, b in TROCAS:
        n = txt.lower().count(a.lower())
        if n:
            total += n
            txt = re.sub(re.escape(a), b, txt, flags=re.I)
    return txt, total

corte = style_todo.find('/* Componentes reais */')
css_casca_estudo, css_comp = style_todo[:corte], style_todo[corte:]
css_comp, trocas_css = padroniza(css_comp)

# Da casca do estudo só aproveito o que os componentes extraídos usam.
CLASSES_HERDADAS = ['.legend', '.row', '.stage', '.divider', '.col', '.swatch', '.mono', '.state-label', '.xr-']
blocos_casca = []
for bloco in re.split(r'(?<=\})\s*', css_casca_estudo):
    if any(c in bloco.split('{')[0] for c in CLASSES_HERDADAS):
        blocos_casca.append(bloco.strip())
css_herdado = '\n  '.join(b for b in blocos_casca if b)
css_herdado, _ = padroniza(css_herdado)

# JS de interação dos componentes (switch, tabela, segmento, sliders).
# Só as delegações de interação dos componentes. O bloco "CASCA v2" do estudo
# fica FORA: ele governa a navegação daquele artefato (abas, filtros, modo
# fácil) e aqui a navegação é outra — arrastá-lo junto trazia chamadas a
# funções que não existem neste arquivo.
ini = fonte.find("  panelsRoot.addEventListener('click', function(e){")
casca = fonte.find("     CASCA v2 — comportamento")
inp = fonte.find("  panelsRoot.addEventListener('input', function(e){")
fim = fonte.rfind("})();")
bloco1 = fonte[ini:fonte.rfind('/*', ini, casca)]
bloco2 = fonte[inp:fim]
js_interacao = (bloco1 + '\n' + bloco2).replace('panelsRoot', 'raizPaineis')
assert 'assignAnchors' not in js_interacao and 'ativarAba' not in js_interacao
js_syncseg = re.search(r'(  function syncSegPills\(scope\)\{.*?\n  \})', fonte, re.S).group(1)

# ─────────────────────────────────────────────────────────────────────────────
# 2 · Componentes: só o padrão, valores padronizados, tokens deduzidos
# ─────────────────────────────────────────────────────────────────────────────
hex_para_tokens = {}
for p in paleta:
    hex_para_tokens.setdefault(p['hex'].lower(), []).append(p['nome'])
por_nome = {p['nome']: p for p in paleta}

def categoria_da_prop(prop):
    prop = prop.lower()
    if 'accent-color' in prop: return 'Control'
    if 'border' in prop or 'outline' in prop or 'stroke' in prop: return 'Border'
    if 'background' in prop: return 'Background'
    if 'color' in prop or 'fill' in prop: return 'Content'
    return ''

def tokens_do_html(htm, citados):
    achados = []
    for prop, val in re.findall(r'([a-zA-Z-]+)\s*:\s*(#[0-9a-fA-F]{6})', htm):
        cat = categoria_da_prop(prop)
        for nome in hex_para_tokens.get(val.lower(), []):
            if not cat or nome.startswith(cat + '/'):
                achados.append(nome)
    for nome in citados:
        if nome in por_nome:
            achados.append(nome)
    vistos, saida = set(), []
    for n in achados:
        if n not in vistos:
            vistos.add(n); saida.append(n)
    ordem = {'Background': 0, 'Content': 1, 'Border': 2, 'Control': 3, 'Overlay': 4}
    return sorted(saida, key=lambda n: (ordem.get(n.split('/')[0], 9), n))

# Cores que vivem apenas em regra CSS própria (sem estilo inline) não são
# dedutíveis do HTML — este é o único caso, e vem declarado à mão.
TOKENS_MANUAIS = {
    'edsbuttonremove': ['Background/Surface', 'Background/DangerSubtle', 'Background/DangerSubtlePressed',
                        'Content/OnDangerSubtle', 'Content/OnDangerSubtlePressed', 'Border/Danger'],
}

# Tokens medidos no navegador (extrai3.js) — captura o que vem de regra CSS,
# que a leitura do HTML não vê. É a fonte primária; a dedução por HTML e as
# citações no texto entram como complemento.
try:
    TOKENS_MEDIDOS = json.load(open(__file__.rsplit('/', 1)[0] + '/tokens-medidos.json'))
except FileNotFoundError:
    TOKENS_MEDIDOS = {}
    print('  aviso: tokens-medidos.json ausente — rode `node extrai3.js` para a lista completa')

GRUPOS = ['Botões', 'Campos de formulário', 'Navegação', 'Textos', 'Feedback', 'Dados', 'Ícones', 'Layout']
comps, trocas_html, sem_token = [], 0, []
for c in ext:
    if c['id'] == 'athfiltercessionstatus':
        continue                                   # arquivo vazio no repo: não é componente
    htm, n = padroniza(c['html'])
    trocas_html += n
    citados = c['tokens'] + c['tokensNoWhy']
    medidos = TOKENS_MEDIDOS.get(c['id'], [])
    deduzidos = TOKENS_MANUAIS.get(c['id']) or tokens_do_html(htm, citados)
    ordem_cat = {'Background': 0, 'Content': 1, 'Border': 2, 'Control': 3, 'Overlay': 4}
    toks = sorted(set(medidos) | set(deduzidos),
                  key=lambda n: (ordem_cat.get(n.split('/')[0], 9), n))
    if not toks: sem_token.append(c['id'])
    comps.append({'id': c['id'], 'titulo': c['titulo'], 'grupo': c['grupo'], 'html': htm,
                  'tokens': toks, 'hint': c['hint']})

# ─────────────────────────────────────────────────────────────────────────────
# 3 · Regras de uso (o que a auditoria fixou como regra do sistema)
# ─────────────────────────────────────────────────────────────────────────────
REGRAS = [
 ('Cor de fundo e cor de conteúdo andam em par',
  'Nenhum valor é escolhido sozinho. Todo preenchimento tem um conteúdo definido para ir em cima dele, e o par é medido antes de entrar no sistema. Ao usar um fundo, use o conteúdo que vem com ele.', None),
 ('O anel de foco é claro quando a vizinhança é escura',
  'Border/Focus vale sobre fundo claro. Sobre preenchimento sólido, fundo escuro ou área escurecida, o anel passa a ser Border/Inverse — um traço claro. O que decide não é o elemento, é o que está em volta dele.', 'foco'),
 ('Etiqueta ganha contorno quando a linha está sob o mouse',
  'Os fundos claros de família não contrastam com as superfícies que os hospedam, então a pílula perde a forma quando a linha muda de fundo. A borda existe sempre, transparente, e só recebe a cor da família no hover da linha — assim nada se desloca.', 'badge'),
 ('Vivid é decoração e não carrega conteúdo',
  'Os quatro tons Vivid existem para faixa, ilustração e gráfico. Nenhum deles passa o mínimo para texto ou ícone. Se for para ler, use o Content da família.', None),
 ('Um único escurecimento atrás de qualquer modal',
  'Overlay/Scrim é o valor único para toda a plataforma. E nada de texto direto em cima dele: nenhum tom, claro ou escuro, passa o mínimo contra o scrim — o conteúdo vai dentro da janela.', None),
 ('No clique, a borda acompanha o fundo',
  'No botão de contorno, o fundo escurece no clique. A borda escurece junto, para o degrau Pressed da família — senão ela desaparece no exato momento em que a pessoa aperta.', 'pressed'),
 ('Texto de marca sobre fundo de marca tem degrau próprio',
  'Content/Brand serve sobre branco e sobre o canvas. Sobre Background/BrandSubtle, use Content/OnBrandSubtle: é o degrau feito para esse par.', None),
 ('Um mesmo valor pode ter vários nomes',
  'Quando o mesmo tom faz trabalhos diferentes, ele ganha um nome por trabalho. Não é duplicação: é o que permite mudar o papel de texto sem arrastar o papel de preenchimento.', None),
 ('Estado desligado é isento do mínimo de contraste',
  'Content/Disabled e Border/Disabled comunicam justamente indisponibilidade. São as duas únicas exceções ao piso.', None),
 ('Sombra não é cor',
  'Elevação não faz parte desta paleta. Sombra tem escala própria e não deve ser resolvida com token de cor.', None),
]

# ─────────────────────────────────────────────────────────────────────────────
# 4 · Montagem
# ─────────────────────────────────────────────────────────────────────────────
def esc(t): return H.escape(t, quote=True)

def swatch(p):
    return f'''<article class="tok" data-nome="{esc(p['nome'])}" data-hex="{p['hex'].lower()}">
      <div class="tok__cor" style="background:{p['hex']};"></div>
      <div class="tok__corpo">
        <h4 class="tok__nome">{esc(p['nome'])}</h4>
        <div class="tok__vals"><code class="tok__hex">{p['hex']}</code><code class="tok__var">{esc(p['cssVar'])}</code>
          <button type="button" class="ds-copy" data-copy="var({esc(p['cssVar'])})" title="Copiar a variável CSS">copiar</button></div>
        <p class="tok__uso">{esc(USO[p['nome']])}</p>
      </div>
    </article>'''

# ---- páginas -----------------------------------------------------------------
paginas = []

fund = ['<h2>Sistema de cores</h2>',
 '<p class="ds-lead">Toda cor do produto tem um nome, e o nome diz o trabalho que ela faz. Quem desenha e quem programa usam o mesmo nome. É isso que mantém a interface coerente sem depender de ninguém decorar códigos de cor.</p>',
 '<h3 class="ds-h3">A forma do nome</h3>',
 '<p class="ds-p">Todo token é <code>Categoria/Papel</code>. A categoria diz que tipo de coisa é; o papel diz qual trabalho ela cumpre.</p>',
 '<div class="ds-grid4">' + ''.join(
    f'<div class="ds-box"><b>{c}</b><span>{d}</span></div>' for c, d in [
      ('Background', 'fundo e preenchimento'), ('Content', 'texto e ícone'),
      ('Border', 'contorno, borda, divisor'), ('Control', 'preenchimento de controle nativo'),
      ('Overlay', 'escurecimento atrás de janela')]) + '</div>',
 '<h3 class="ds-h3">Os quatro papéis de cada família</h3>',
 '<p class="ds-p">As seis famílias semânticas — marca, sucesso, erro, informação, alerta e risco — têm o mesmo molde: um preenchimento, o conteúdo que vai em cima dele, um contêiner claro e o conteúdo que vai em cima do contêiner.</p>',
 '<div class="ds-grid4">' + ''.join(
    f'<div class="ds-box"><b>{c}</b><span>{d}</span></div>' for c, d in [
      ('Preenchimento', 'a ênfase máxima: botão cheio'),
      ('Conteúdo sobre preenchimento', 'o que fica legível em cima dele'),
      ('Contêiner', 'o fundo claro de etiqueta, chip e faixa'),
      ('Conteúdo sobre contêiner', 'o texto e o ícone do contêiner')]) + '</div>',
 '<h3 class="ds-h3">O mínimo de contraste</h3>',
 '<p class="ds-p">Todo par desta documentação é medido pela regra WCAG 2.1, nível AA, no seu navegador, agora.</p>',
 '<div class="ds-regua">'
   '<div><span class="cr cr--ok">4,50:1 ✓</span> texto de qualquer tamanho</div>'
   '<div><span class="cr cr--meio">3,00:1 ◐</span> borda, ícone e texto grande</div>'
   '<div><span class="cr cr--nao">abaixo de 3 ✕</span> não serve para nada que precise ser visto</div>'
 '</div>',
 '<h3 class="ds-h3">Dois esquemas</h3>',
 '<p class="ds-p">Cada token tem um valor no esquema claro e um no escuro, gerados em OKLCH com o mesmo alvo de contraste. O papel é o mesmo nos dois: só o tom muda. O esquema claro é o que está em produção.</p>']
paginas.append(('fundamentos', 'Fundamentos', '', '\n'.join(fund)))

# paleta
gr_ordem, por_grupo = [], {}
for p in paleta:
    if p['grupo'] not in por_grupo:
        por_grupo[p['grupo']] = []; gr_ordem.append(p['grupo'])
    por_grupo[p['grupo']].append(p)
def celula_cor(hexv):
    """Célula de valor: amostra + hex. A amostra tem contorno próprio, porque sem
    ele um token claro (#FFFFFF, #F8F8F8) desaparece na célula branca — e é nos
    claros que a pessoa mais precisa ver o degrau."""
    if not hexv or hexv == '—':
        return '<span class="pal-cel pal-cel--vazia">—</span>'
    return ('<span class="pal-cel"><i class="pal-cel__sw" style="background:' + hexv + ';"></i>'
            '<code>' + esc(hexv) + '</code></span>')


def linha_lista(p):
    return (
        '<tr data-nome="' + esc(p['nome']) + '" data-hex="' + p['hex'].lower() + '">'
        '<th scope="row"><button type="button" class="pal-tok" '
        'data-copy="var(' + esc(p['cssVar']) + ')" title="Copiar var(' + esc(p['cssVar']) + ')">'
        '<b>' + esc(p['nome']) + '</b><code>' + esc(p['cssVar']) + '</code></button></th>'
        '<td>' + celula_cor(p['hex']) + '</td>'
        '<td>' + celula_cor(p['dark'] or '—') + '</td>'
        '<td class="pal-uso">' + esc(USO[p['nome']]) + '</td>'
        '</tr>')


pal_html = ['<h2>Paleta</h2>',
 f'<p class="ds-lead">{len(paleta)} tokens, agrupados por família. O nome é o que se escreve no dia a dia; a variável ao lado é o que entra no código.</p>',
 # A barra reúne o filtro e o alternador de visão. O alternador fica à DIREITA —
 # padrão de toda lista que oferece duas leituras (observado no Midday e no Gusto):
 # perto do conteúdo que ele governa, longe do campo que se digita.
 '<div class="pal-barra">',
 '  <div class="ds-busca-inline"><input type="search" id="buscaToken" placeholder="Filtrar por nome, valor ou uso" aria-label="Filtrar tokens"><span id="buscaConta"></span></div>',
 '  <div class="pal-visao" role="group" aria-label="Modo de visualização">',
 '    <button type="button" data-visao="cartoes" aria-pressed="true" title="Cartões, com a amostra grande">Cartões</button>',
 '    <button type="button" data-visao="lista" aria-pressed="false" title="Lista compacta, claro e escuro lado a lado">Lista</button>',
 '  </div>',
 '</div>',
 # As DUAS visões são geradas e o alternador só troca qual está visível. Montar a
 # lista por JS a partir dos dados seria mais enxuto, mas a versão ESTÁTICA (que
 # abre por file:// e é a que se manda por link) perderia a visão em lista.
 '<div class="pal-corpo" data-visao="cartoes">']
pal_html.append('<div class="pal-cartoes">')
for g in gr_ordem:
    pal_html.append(f'<h3 class="ds-h3 ds-anchor" data-grupo="{esc(g)}">{esc(g)}</h3>')
    pal_html.append('<div class="tok-grid">' + '\n'.join(swatch(p) for p in por_grupo[g]) + '</div>')
pal_html.append('</div>')
# ── Visão em LISTA: claro e escuro lado a lado, uma linha por token.
#    É a leitura que responde "qual é o par deste token no outro esquema?" sem
#    rolar. Na visão em cartões o valor escuro fica no pé de cada cartão, então
#    comparar dois tokens obriga a percorrer a página.
pal_html.append('<div class="pal-lista">')
pal_html.append('<table class="pal-tab">')
pal_html.append('<thead><tr><th scope="col">Token</th><th scope="col">Claro</th>'
                '<th scope="col">Escuro</th><th scope="col">Onde usar</th></tr></thead>')
for g in gr_ordem:
    pal_html.append(f'<tbody class="pal-tab__grupo" data-grupo="{esc(g)}">')
    pal_html.append(f'<tr class="pal-tab__cab"><th colspan="4" scope="colgroup">{esc(g)}'
                    f'<span>{len(por_grupo[g])}</span></th></tr>')
    pal_html.extend(linha_lista(p) for p in por_grupo[g])
    pal_html.append('</tbody>')
pal_html.append('</table></div>')
pal_html.append('</div>')
paginas.append(('paleta', 'Paleta', '', '\n'.join(pal_html)))

# papéis
pap = ['<h2>Papéis de cor</h2>',
 '<p class="ds-lead">Cada faixa abaixo é, ao mesmo tempo, a amostra e a prova: o fundo é a cor do papel e o texto é a cor do papel pareado com ele. Se dá para ler, o par está certo.</p>',
 '<div class="ds-esq" role="group" aria-label="Esquema"><button type="button" data-esq="claro" aria-pressed="true">Claro</button><button type="button" data-esq="escuro" aria-pressed="false">Escuro</button></div>',
 '<h3 class="ds-h3">As seis famílias</h3>',
 '<div class="fam-grid">']
for f in familias:
    faixas = ''.join(
      f'<div class="fam__band" data-l="{b["claro"]}" data-lp="{b["parClaro"]}" data-d="{b["escuro"]}" data-dp="{b["parEscuro"]}" '
      f'style="background:{b["claro"]};color:{b["parClaro"]};">{esc(b["papel"])}</div>' for b in f['faixas'])
    contorno = re.sub(r'<br>.*', '', f['nota'])
    pap.append(f'''<section class="fam">
      <header class="fam__head"><h3 class="fam__nome">{esc(f['nome'])}</h3><span class="fam__contorno">{contorno}</span></header>
      <div class="fam__stack">{faixas}</div>
      <div class="fam__pares" data-pares></div>
    </section>''')
pap.append('</div>')
pap.append('<h3 class="ds-h3">Superfícies e conteúdo</h3>')
pap.append('<p class="ds-p">A família neutra segue a mesma lógica de par: cada degrau de fundo vem com o conteúdo que passa em cima dele. É assim que se constrói profundidade por tom, sem sombra.</p>')
pap.append('<div class="sup-stack">')
for s in superficies:
    m = re.match(r'(#[0-9A-Fa-f]{6}) \+ ([^ ]+)', s['hex'])
    fundo, conteudo = (m.group(1), m.group(2)) if m else ('#ffffff', 'Content/Primary')
    cor = por_nome.get(conteudo, {}).get('hex', '#002a3a')
    pap.append(f'<div class="sup-row" data-a="{fundo.lower()}" data-b="{cor.lower()}" style="background:{fundo};color:{cor};">'
               f'<span class="sup-row__n">{esc(s["nome"])}</span><span class="sup-row__d">{esc(s["desc"])}</span>'
               f'<span class="sup-row__x"><code>{fundo.upper()}</code> + <code>{esc(conteudo)}</code> <span data-cr="{fundo.lower()}|{cor.lower()}"></span></span></div>')
pap.append('</div>')
pap.append('<h3 class="ds-h3">Um valor, vários papéis</h3>')
pap.append('<p class="ds-p">O mesmo tom cumprindo trabalhos diferentes. Cada trabalho tem nome próprio, e é isso que permite mudar um sem mexer no outro.</p>')
pap.append('<div class="alias-grid">')
def lum(hexa):
    c = []
    for i in (1, 3, 5):
        v = int(hexa[i:i+2], 16) / 255
        c.append(v/12.92 if v <= 0.03928 else ((v+0.055)/1.055) ** 2.4)
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
def contraste(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
def sobre(hexa):
    """Texto do chip decidido por medição, nunca fixo: com branco fixo o rótulo
    do #F2F2F2 ficava ilegível em cima da própria cor."""
    return '#12181c' if contraste(hexa, '#12181c') >= contraste(hexa, '#ffffff') else '#ffffff'

for a in alias:
    itens = ''.join(f'<div class="alias__role"><b>{esc(r["nome"])}</b><span>{esc(r["uso"])}</span></div>' for r in a['papeis'])
    txt = sobre(a['hex'])
    pap.append(f'''<div class="alias"><div class="alias__chip" style="background:{a['hex']};color:{txt};">
      <span class="alias__hex">{a['hex']}</span></div><div class="alias__body">
      <div class="alias__count">{len(a['papeis'])} papéis</div><div class="alias__list">{itens}</div></div></div>''')
pap.append('</div>')
paginas.append(('papeis', 'Papéis de cor', '', '\n'.join(pap)))

# ── Instruções para IA (substitui "Regras de uso" — pedido do Paulo 2026-08-02).
#    Documento TÉCNICO e enxuto para um agente consumir antes de aplicar cor:
#    passo a passo de leitura (famílias, claro/escuro) e de aplicação em
#    componente. As 10 regras de uso não sumiram: viraram as diretivas do passo 6,
#    em voz imperativa — formato que modelo segue melhor que prosa.
import json as _json

_tokens_ia = [
    {'n': p['nome'], 'v': f"var({p['cssVar']})", 'c': p['hex'], 'd': p['dark'] or None}
    for p in paleta
]
_json_ia = _json.dumps({
    'contrato': '.claude/references/ds-contract/tokens-semantic.dtcg.json',
    'esquemas': {'claro': 'c', 'escuro': 'd'},
    'tokens': _tokens_ia,
}, ensure_ascii=False, separators=(',', ':'))

ia = ['<h2>Instruções para IA</h2>',
 '<p class="ds-lead">O contrato de leitura e aplicação das cores, para agentes. Sete passos, sem prosa: quem segue os sete não inventa cor.</p>',
 '<ol class="ia-passos">',

 '<li><b>Fonte da verdade.</b> Leia <code>.claude/references/ds-contract/tokens-semantic.dtcg.json</code> '
 '(78 papéis; cada um declara <code>ebp.propriedadesPermitidas</code>, <code>ebp.fundoPadrao</code> e '
 '<code>ebp.contrasteMinimo</code>). Nunca use hex de memória; nunca leia só os primitivos.</li>',

 '<li><b>O nome.</b> Todo token é <code>Categoria/Papel</code> e vira a variável <code>--categoria-papel</code>. '
 'A categoria FIXA a propriedade CSS: <code>Background</code>→<code>background</code> · '
 '<code>Content</code>→<code>color/fill/stroke</code> · <code>Border</code>→<code>border/outline</code> · '
 '<code>Control</code>→<code>accent-color</code> · <code>Overlay</code>→véu de modal.</li>',

 '<li><b>Escolha pelo papel, nunca pelo valor.</b> 1 hex = 1 nome POR categoria '
 '(#6B55D8 é Background/Brand, Content/Brand, Border/Brand e Control/Accent ao mesmo tempo). '
 'Pergunte "isto é fundo, tinta ou traço?" e só então procure o nome — valor parecido é a causa nº 1 de erro.</li>',

 '<li><b>Pares e pisos.</b> Cor não existe sozinha: todo Content tem um fundo de referência. '
 'Tinta de família mede contra o pastel DA PRÓPRIA família (Content/Success × Background/SuccessSubtle), '
 'não contra o branco. Pisos: 4,5:1 texto · 3,0:1 borda, ícone e texto grande. '
 'Isentos: <code>Content/Disabled</code>, <code>Border/Disabled</code> e decorativos por desenho (trilha, divisor).</li>',

 '<li><b>Claro e escuro.</b> O papel é o MESMO nos dois esquemas; só o valor muda (campos <code>c</code>/<code>d</code> abaixo). '
 'No claro, o pior caso de uma tinta é o branco — de graça. No escuro INVERTE: o pior caso é a superfície mais clara '
 '(<code>Background/Hover</code>); resolva contra ela. Nunca gere o valor escuro por estimativa: preserve o matiz e '
 'atinja o alvo do papel (5,2 tinta · 3,4 contorno).</li>',

 '<li><b>Aplicação em componente</b> — as dez diretivas:'
 '<ul class="ia-diretivas">'
 '<li>Etiqueta/badge: fundo <code>*Subtle</code> + texto <code>On*Subtle</code> (ou o Content da família). '
 'Na linha em hover/selecionada, contorno <code>currentColor</code> — borda sempre presente em <code>transparent</code>, só troca de cor.</li>'
 '<li>Foco: halo duplo — traço claro (<code>Border/Inverse</code>) colado + anel <code>Border/Focus</code> com '
 '<code>outline-offset ≥ 2px</code>. Sobre preenchimento ou vizinhança escura, o anel é o CLARO. '
 'Campo composto: a indicação vai no WRAPPER (<code>:focus-within</code>), nunca no input interno.</li>'
 '<li><code>*Vivid</code> é decoração: nunca carrega texto nem ícone.</li>'
 '<li>Véu de modal: só <code>Overlay/Scrim</code>. Nada de texto direto sobre o véu.</li>'
 '<li>No clique, a borda acompanha o fundo (par <code>*Pressed</code>).</li>'
 '<li>Texto de marca sobre pastel de marca usa <code>Content/OnBrandSubtle</code>, não <code>Content/Brand</code>.</li>'
 '<li>Um valor com vários nomes é design, não redundância: use o nome do papel que você está pintando.</li>'
 '<li>Traço ≤ 8px sem texto (filete, divisor, bolinha) pode usar <code>Border/*</code> como preenchimento; acima disso é superfície.</li>'
 '<li>Sombra não é cor: elevação tem escala própria.</li>'
 '<li>Texto padrão herdado do contêiner não é escolha do componente: só declare cor quando o papel pedir.</li>'
 '</ul></li>',

 '<li><b>Verifique antes de entregar.</b> As três perguntas, nesta ordem: o valor existe? '
 'a categoria bate com a propriedade? o par tinta×fundo EFETIVO passa o piso? '
 'Papel errado é PORTÃO (D6), não média — um caso reprova a tela. '
 'Auditores executáveis: <code>sistema-de-cores/app/auditar-*.cjs</code>.</li>',
 '</ol>',

 '<h3 class="ds-h3">Os 78 tokens, nos dois esquemas (copiável)</h3>',
 '<p class="ds-p">O mesmo dado da Paleta, em forma de máquina: <code>n</code> nome · <code>v</code> variável · '
 '<code>c</code> claro · <code>d</code> escuro.</p>',
 '<div class="ia-json"><button type="button" class="ds-copy" data-copy=\'' + _json_ia.replace("'", '&#39;') + '\'>copiar JSON</button>'
 '<pre class="ia-json__pre"><code>' + esc(_json_ia[:1200]) + '…</code></pre></div>']
paginas.append(('instrucoes-ia', 'Instruções para IA', '', '\n'.join(ia)))

# ── Nomenclatura — o showroom em camadas (v3: a série, pedido do Paulo).
#    v2 provou a técnica (marcador projetado + medição + bezier no pixel) num
#    espécime. A v3 vira SÉRIE: mais quatro palcos, cada um ensinando uma
#    complexidade que a pilha básica não cobre — escolhidos pesquisando o
#    registry (EdsTable, AthModalCenter, AthInputText, sidebar):
#      2 · linha de tabela + etiqueta  → regra 3 (hover da linha, contorno currentColor)
#      3 · modal sobre a página        → regra 5 (Overlay/Scrim como CAMADA translúcida)
#      4 · campo em três momentos      → o eixo Z vira TEMPO (Default→Focus+halo→Danger)
#      5 · menu inverso                → regra 2 (superfície escura inverte tudo)
#    Infra: rótulo declara o marcador que aponta (data-para); o medidor
#    `gerar/medir-nomen.cjs` grava as projeções em `nomen-coords.json`.
import json as _json, os as _os

_coords_path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'nomen-coords.json')
_coords = _json.load(open(_coords_path)) if _os.path.exists(_coords_path) else {}


def _curva(rotulo, lado='dir'):
    c = _coords.get(rotulo)
    if not c:
        return ''
    sx, sy, tx, ty = c['sx'], c['sy'], c['tx'], c['ty']
    cx = (sx + tx) / 2 + (-46 if lado == 'dir' else 46)
    cy = (sy + ty) / 2 - 24
    return (f'<path d="M {sx:.0f},{sy:.0f} Q {cx:.0f},{cy:.0f} {tx:.0f},{ty:.0f}"/>'
            f'<circle cx="{tx:.0f}" cy="{ty:.0f}" r="3.4"/>')


def _lab(mk, x, y, titulo, var, desc):
    return (f'<div class="nomen-lab" data-para="{mk}" style="left:{x}px;top:{y}px">'
            f'<b>{titulo}</b><code>{esc(var)}</code><span>{esc(desc)}</span></div>')


def _palco(altura, labs, corpo):
    """Um palco fixo 830×altura: cena 3D + SVG de setas + rótulos. `labs` é uma
    lista (mk, x, y, título, var, descrição); as curvas saem do lado do rótulo
    que olha para o alvo (o medidor decide pelo x)."""
    svg = ''.join(_curva(mk, 'dir' if x > 415 else 'esq') for mk, x, *_ in labs)
    labs_html = ''.join(_lab(*l) for l in labs)
    return (f'<div class="nomen-stage" style="height:{altura}px">{corpo}'
            f'<svg class="nomen-svg" viewBox="0 0 830 {altura}" aria-hidden="true">{svg}</svg>'
            f'{labs_html}</div>')


def _mk(mkid, pos):
    return f'<s class="mk" data-mk="{mkid}" style="{pos}"></s>'


# ═══ Palco 1 · a pilha básica (v2, mantida) ═══════════════════════════════════
_p1_corpo = ('<div class="nomen-cena" aria-hidden="true"><div class="nomen-pilha">'
 '<div class="nomen-cam nomen-cam--canvas">' + _mk('canvas', 'left:30%;top:90%') + '</div>'
 '<div class="nomen-cam nomen-cam--surface">' + _mk('surface', 'left:36%;top:90%')
 + _mk('bordsub', 'left:85%;top:calc(100% - 1px)') + '</div>'
 '<div class="nomen-cam nomen-cam--itens">'
 '<span class="nomen-btn">' + _mk('brand', 'left:14%;top:56%')
 + '<b class="nomen-btn__t">' + _mk('onfill', 'left:calc(100% + 4px);top:55%') + 'Confirmar</b></span>'
 '<span class="nomen-tag">' + _mk('dangsub', 'left:12%;top:58%')
 + '<b class="nomen-tag__t">' + _mk('ondang', 'left:calc(100% + 4px);top:55%') + 'Vencida</b></span>'
 '</div></div></div>')
_p1_labs = [
    ('onfill',  596,  46, 'Content/OnFill', '--content-on-fill', 'o conteúdo sobre o preenchimento'),
    ('brand',   596, 130, 'Background/Brand', '--background-brand', 'o preenchimento de marca, por cima do cartão'),
    ('ondang',  596, 214, 'Content/OnDangerSubtle', '--content-on-danger-subtle', 'a tinta da família, sobre o pastel dela'),
    ('dangsub', 596, 298, 'Background/DangerSubtle', '--background-danger-subtle', 'o contêiner claro da família'),
    ('bordsub', 596, 382, 'Border/Subtle', '--border-subtle', 'o traço no limite do cartão'),
    ('surface', 596, 466, 'Background/Surface', '--background-surface', 'o cartão: a superfície padrão'),
    ('canvas',  596, 550, 'Background/Canvas', '--background-canvas', 'o chão da página, embaixo de tudo'),
]

# ═══ Palco 2 · linha de tabela + etiqueta (EdsTable + AthTag) ═════════════════
_p2_corpo = ('<div class="nomen-cena" aria-hidden="true"><div class="nomen-pilha">'
 '<div class="nomen-cam nomen-cam--tsurface">'
 '<i class="nomen-trow" style="top:22%">' + _mk('t-divisor', 'left:70%;top:-1px')
 + '</i><i class="nomen-trow" style="top:48%"></i><i class="nomen-trow" style="top:74%"></i>'
 + _mk('t-surface', 'left:20%;top:90%') + '</div>'
 '<div class="nomen-cam nomen-cam--thover">' + _mk('t-hover', 'left:16%;top:58%') + '</div>'
 '<div class="nomen-cam nomen-cam--titens">'
 '<span class="nomen-tag nomen-tag--ok">' + _mk('t-subtle', 'left:14%;top:60%')
 + _mk('t-contorno', 'left:-2px;top:50%')
 + '<b class="nomen-tag__t">' + _mk('t-tinta', 'left:calc(100% + 4px);top:55%') + 'Matriculado</b></span>'
 '</div></div></div>')
_p2_labs = [
    ('t-tinta',    596,  56, 'Content/Success', '--content-success', 'a tinta da família, sobre o pastel'),
    ('t-subtle',   596, 140, 'Background/SuccessSubtle', '--background-success-subtle', 'o contêiner claro da etiqueta'),
    ('t-contorno', 596, 224, 'Contorno — currentColor', 'border-color: currentColor', 'sempre presente; no hover da linha ele assume a TINTA da etiqueta (regra 3)'),
    ('t-hover',    596, 308, 'Background/Hover', '--background-hover', 'a linha sob o mouse — é ela que exige o contorno'),
    ('t-divisor',  596, 392, 'Border/Faint', '--border-faint', 'o divisor entre linhas'),
    ('t-surface',  596, 476, 'Background/Surface', '--background-surface', 'a tabela: superfície padrão'),
]

# ═══ Palco 3 · modal sobre a página (AthModalCenter) ══════════════════════════
_p3_corpo = ('<div class="nomen-cena" aria-hidden="true"><div class="nomen-pilha">'
 '<div class="nomen-cam nomen-cam--mpagina">'
 '<i class="nomen-mbar" style="top:16%;width:52%"></i><i class="nomen-mbar" style="top:30%;width:74%"></i>'
 '<i class="nomen-mbar" style="top:44%;width:63%"></i><i class="nomen-mbar" style="top:58%;width:70%"></i></div>'
 '<div class="nomen-cam nomen-cam--mscrim">' + _mk('m-scrim', 'left:12%;top:22%') + '</div>'
 '<div class="nomen-cam nomen-cam--mitens"><span class="nomen-modal">'
 + _mk('m-surface', 'left:12%;top:26%') + _mk('m-borda', 'left:62%;top:calc(100% - 1px)')
 + '<b class="nomen-modal__t">Excluir aluno?</b>'
 '<span class="nomen-modal__acoes"><em class="nomen-modal__ghost">Cancelar</em>'
 '<em class="nomen-modal__danger">' + _mk('m-danger', 'left:16%;top:55%')
 + '<b class="nomen-modal__dt">' + _mk('m-onfill', 'left:calc(100% + 4px);top:55%') + 'Excluir</b></em></span>'
 '</span></div></div></div>')
_p3_labs = [
    ('m-onfill',  596,  56, 'Content/OnFill', '--content-on-fill', 'o conteúdo sobre o preenchimento de perigo'),
    ('m-danger',  596, 140, 'Background/Danger', '--background-danger', 'a ação destrutiva, preenchida'),
    ('m-surface', 596, 224, 'Background/Surface', '--background-surface', 'o modal flutua na superfície padrão'),
    ('m-borda',   596, 308, 'Border/Subtle', '--border-subtle', 'o traço no limite do modal'),
    ('m-scrim',   596, 392, 'Overlay/Scrim', '--overlay-50', 'o ÚNICO escurecimento da plataforma — e nada de texto direto sobre ele (regra 5)'),
]

# ═══ Palco 4 · o campo em três momentos (AthInputText) ════════════════════════
_p4_corpo = ('<div class="nomen-cena" aria-hidden="true"><div class="nomen-pilha">'
 '<div class="nomen-cam nomen-cam--frepouso"><span class="nomen-campo">'
 + _mk('f-default', 'left:50%;top:calc(100% - 1px)')
 + '<u>CPF</u><em>000.000.000-00</em></span></div>'
 '<div class="nomen-cam nomen-cam--ffoco"><span class="nomen-campo nomen-campo--foco">'
 + _mk('f-focus', 'left:50%;top:calc(100% - 1px)') + _mk('f-halo', 'left:-6px;top:50%')
 + '<u>CPF</u><em>123.456.</em></span></div>'
 '<div class="nomen-cam nomen-cam--ferro"><span class="nomen-campo nomen-campo--erro">'
 + _mk('f-danger', 'left:50%;top:calc(100% - 1px)')
 + '<u>CPF</u><em>123.456.789-00</em></span>'
 '<b class="nomen-campo__msg">' + _mk('f-msg', 'left:calc(100% + 4px);top:55%') + 'CPF inválido</b></div>'
 '</div></div>')
_p4_labs = [
    ('f-danger', 596,  56, 'Border/Danger', '--border-danger', 'o momento do erro: a borda muda de família'),
    ('f-msg',    596, 140, 'Content/Danger', '--content-danger', 'a mensagem, na tinta da família'),
    ('f-halo',   596, 224, 'Border/FocusInner', '--border-focus-inner', 'o halo interno que acompanha o foco'),
    ('f-focus',  596, 308, 'Border/Focus', '--border-focus', 'o momento do foco: a borda escurece'),
    ('f-default',596, 392, 'Border/Default', '--border-default', 'o repouso: o contorno de campo do dia a dia'),
]

# ═══ Palco 5 · o menu inverso (sidebar) ═══════════════════════════════════════
_p5_corpo = ('<div class="nomen-cena" aria-hidden="true"><div class="nomen-pilha">'
 '<div class="nomen-cam nomen-cam--canvas">' + _mk('i-canvas', 'left:26%;top:88%') + '</div>'
 '<div class="nomen-cam nomen-cam--iside">' + _mk('i-inverse', 'left:72%;top:86%')
 + '<i class="nomen-iitem">Página inicial</i><i class="nomen-iitem">Matrículas</i></div>'
 '<div class="nomen-cam nomen-cam--iativo"><span class="nomen-iativo">'
 + _mk('i-filete', 'left:1px;top:50%') + _mk('i-anel', 'left:42%;top:-8px')
 + '<b class="nomen-iativo__t">' + _mk('i-onfill', 'left:calc(100% + 4px);top:55%') + 'Faturas</b></span></div>'
 '</div></div>')
_p5_labs = [
    ('i-anel',   596,  56, 'Border/Inverse — o anel', '--border-inverse', 'o foco por teclado sobre fundo escuro é CLARO (regra 2)'),
    ('i-onfill', 596, 140, 'Content/OnFill', '--content-on-fill', 'o rótulo do item ativo'),
    ('i-filete', 596, 224, 'Border/Inverse — o filete', '--border-inverse', 'o mesmo token no traço do item ativo'),
    ('i-inverse',596, 308, 'Background/Inverse', '--background-inverse', 'a superfície escura: tudo em cima dela inverte'),
    ('i-canvas', 596, 392, 'Background/Canvas', '--background-canvas', 'o chão da página, ao lado do menu'),
]

nom = ['<h2>Nomenclatura</h2>',
 '<p class="ds-lead">O nome diz a posição da cor na pilha. <b>Background</b> é o chão, '
 '<b>Content</b> é o que se lê em cima dele, <b>Border</b> é o traço no limite — e o sufixo '
 '(<i>Subtle, Hover, Pressed, OnFill…</i>) diz o degrau ou o par. Cinco pilhas explodidas, '
 'cada uma com uma complexidade do sistema.</p>',

 '<h3 class="ds-h3">1 · A pilha básica</h3>',
 '<p class="ds-p">Cartão sobre o chão, um preenchimento de marca e uma etiqueta de família por cima.</p>',
 _palco(620, _p1_labs, _p1_corpo),

 '<h3 class="ds-h3">2 · A linha de tabela e a etiqueta</h3>',
 '<p class="ds-p">A regra 3, em camadas: a linha muda de fundo sob o mouse — e é isso que faz a etiqueta ganhar contorno <code>currentColor</code>.</p>',
 _palco(560, _p2_labs, _p2_corpo),

 '<h3 class="ds-h3">3 · O modal sobre a página</h3>',
 '<p class="ds-p">A regra 5, em camadas: um único escurecimento (<code>Overlay/Scrim</code>) entre a página e a superfície que flutua.</p>',
 _palco(560, _p3_labs, _p3_corpo),

 '<h3 class="ds-h3">4 · O campo, em três momentos</h3>',
 '<p class="ds-p">Aqui a altura é TEMPO: o mesmo campo em repouso, no foco (com o halo interno) e no erro — só a borda e a mensagem mudam de token.</p>',
 _palco(560, _p4_labs, _p4_corpo),

 '<h3 class="ds-h3">5 · O menu inverso</h3>',
 '<p class="ds-p">A regra 2, em camadas: sobre a superfície escura tudo inverte — conteúdo, filete e anel de foco ficam claros.</p>',
 _palco(560, _p5_labs, _p5_corpo),

 '<h3 class="ds-h3">A mesma lógica num botão</h3>',
 '<p class="ds-p">Preenchimento, conteúdo por cima, traço no limite — em qualquer componente, os três papéis.</p>',
 '<div class="nomen-stage nomen-stage--2d">',
 '  <div class="nomen2d-alvo"><button type="button" class="nomen2d-btn">'
 + _mk('b2-fill', 'left:16%;top:52%') + _mk('b2-ring', 'left:38%;top:calc(100% + 9px)')
 + '<b class="nomen2d-btn__t">' + _mk('b2-text', 'left:calc(100% + 4px);top:55%') + 'Confirmar</b>'
 '</button></div>',
 f'  <svg class="nomen-svg" viewBox="0 0 830 300" aria-hidden="true">'
 + _curva('b2-fill', 'esq') + _curva('b2-text', 'dir') + _curva('b2-ring', 'esq') + '</svg>',
 _lab('b2-fill', 56, 60, 'Background/Brand', '--background-brand', 'o preenchimento'),
 _lab('b2-text', 596, 60, 'Content/OnFill', '--content-on-fill', 'o conteúdo sobre o preenchimento'),
 _lab('b2-ring', 56, 196, 'Border/Focus + Border/Inverse', '--border-focus · --border-inverse', 'o halo duplo quando o teclado chega'),
 '</div>',

 '<h3 class="ds-h3">Lendo qualquer nome</h3>',
 '<div class="ds-grid4">'
 '<div class="ds-box"><b>Categoria</b><span>onde a cor está na pilha: fundo, conteúdo, traço</span></div>'
 '<div class="ds-box"><b>Família</b><span>o significado: Brand, Success, Danger, Warning, Risk, Info</span></div>'
 '<div class="ds-box"><b>Degrau</b><span>Subtle · Hover · Pressed — a intensidade ou o estado</span></div>'
 '<div class="ds-box"><b>Par</b><span>On… — feito para ficar POR CIMA de outro token</span></div>'
 '</div>']
paginas.append(('nomenclatura', 'Nomenclatura', '', '\n'.join(nom)))

# componentes
for c in comps:
    toks = ''.join(
      f'<button type="button" class="tok-chip" data-copy="var({por_nome[t]["cssVar"]})" title="{esc(USO.get(t,""))} — clique para copiar var({por_nome[t]["cssVar"]})">'
      f'<span class="tok-chip__sw" style="background:{por_nome[t]["hex"]};"></span>{esc(t)}</button>' for t in c['tokens'] if t in por_nome)
    corpo = [f'<h2>{esc(c["titulo"])}</h2>']
    if c['hint']:
        corpo.append(f'<p class="ds-lead">{esc(c["hint"])}</p>')
    # .col.proposed não é decoração: 15 regras de cor do produto são escopadas
    # nessa classe no CSS de origem. Sem ela, o botão renderiza sem cor.
    corpo.append('<h3 class="ds-h3">Componente</h3>')
    # O seletor de estado é controle DA FERRAMENTA: sai do card e vira barra
    # acima dele. O handler procura o alvo por data-group no documento inteiro,
    # então mover não quebra a interação.
    controles = re.findall(r'<div class="state-pills".*?</div>', c['html'], re.S)
    if controles:
        c['html'] = re.sub(r'<div class="state-pills".*?</div>', '', c['html'], flags=re.S)
        corpo.append('<div class="ds-ctl"><span class="ds-ctl__lbl">Estado</span>' + ''.join(controles) + '</div>')
    corpo.append(f'<div class="ds-palco"><div class="col proposed"><div class="col-card">{c["html"]}</div></div></div>')
    corpo.append('<h3 class="ds-h3">Tokens</h3>')
    vazio = '<span class="ds-p">Sem cor própria: herda os tokens do componente que o compõe.</span>'
    corpo.append('<div class="tok-chips">' + (toks or vazio) + '</div>')
    paginas.append((c['id'], c['titulo'], c['grupo'], '\n'.join(corpo)))

# ---- casca -------------------------------------------------------------------
nav = []
grupo_atual = None
for pid, titulo, grupo, _ in paginas:
    if grupo != grupo_atual and grupo:
        nav.append(f'<div class="ds-nav__g">{esc(grupo)}</div>')
        grupo_atual = grupo
    nav.append(f'<button class="ds-nav__i" role="tab" data-p="{pid}" aria-selected="false">{esc(titulo)}</button>')

paineis = '\n'.join(
  f'<section class="ds-panel" data-p="{pid}" role="tabpanel" aria-label="{esc(titulo)}">{corpo}</section>'
  for pid, titulo, grupo, corpo in paginas)

CASCA_CSS = open('casca.css', encoding='utf-8').read()
JS = open('app.js', encoding='utf-8').read()

doc = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sistema de Cores — EducbankPay</title>
<style>
{CASCA_CSS}
  /* ══ Componentes reais — cópia fiel do SCSS do produto, com os valores do
     padrão aplicados. Não encaixar na escala de espaçamento da casca. ══ */
  {css_herdado}
{css_comp}
</style>
</head>
<body>
{defs}
<header class="ds-top">
  <div class="ds-top__in">
    <div class="ds-top__brand"><span class="ds-top__mark"></span><span class="ds-top__nome">EducbankPay <em>· Sistema de Cores</em></span></div>
    <div class="ds-top__acts">
      <span class="ds-top__meta">{len(paleta)} tokens · {len(comps)} componentes</span>
      <button class="ds-top__btn" id="temaBtn" aria-label="Alternar claro e escuro">
        <svg viewBox="0 0 24 24" width="16" height="16"><use href="#i-sun"/></svg></button>
    </div>
  </div>
</header>
<div class="ds-shell">
  <aside class="ds-side">
    <div class="ds-side__busca"><svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-magnifying-glass"/></svg>
      <input type="search" id="buscaNav" placeholder="Buscar" aria-label="Buscar página"><kbd>/</kbd></div>
    <nav class="ds-nav" role="tablist" aria-orientation="vertical">{''.join(nav)}</nav>
  </aside>
  <main class="ds-main" id="dsMain">
{paineis}
  </main>
  <aside class="ds-rail" id="dsRail" aria-label="Nesta página"><div class="ds-rail__t">Nesta página</div><nav id="dsRailNav"></nav></aside>
</div>
<footer class="ds-foot">Sistema de cores do EducbankPay · atualizado em 2026-08-02 · contraste medido no navegador pela regra WCAG 2.1 AA · os componentes desta página são o código do produto, no padrão vigente.</footer>
<button class="ds-topo" id="dsTopo" aria-label="Voltar ao começo">↑</button>
<script>
(function(){{
  var raizPaineis = document.getElementById('dsMain');
{JS}
{js_syncseg}
{js_interacao}
}})();
</script>
</body>
</html>
'''

open(SAIDA, 'w', encoding='utf-8').write(doc)
print('gerado:', SAIDA)
print('  componentes:', len(comps), '| tokens:', len(paleta), '| páginas:', len(paginas))
print('  trocas de valor legado: CSS', trocas_css, '| HTML', trocas_html)
print('  componentes sem token deduzido:', len(sem_token), sem_token[:8])
print('  tamanho: %.0f KB' % (len(doc)/1024))
