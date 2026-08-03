#!/usr/bin/env python3
"""Gera src/estilo/tokens-padrao.css — o override que faz o CÓDIGO REAL aparecer
com as cores do padrão.

Duas frentes, e a segunda é a que importa mais:
  1. declara os nomes NOVOS do padrão (--border-default, --control-accent…);
  2. REDECLARA os nomes que o código já consome (--ath-color-*, --border-primary,
     --content-primary…) com o valor do padrão. É isso que muda a cor de um
     componente real sem tocar em uma linha do repositório.

O mapa legado → token foi levantado lendo `themes/root.scss` e
`themes/_educ_colors.scss` (read-only) em 2026-08-01.
"""
import json, os

AQUI = os.path.dirname(os.path.abspath(__file__))
paleta = json.load(open(os.path.join(AQUI, 'src/dados/paleta.json')))['paleta']
por_nome = {p['nome']: p for p in paleta}

# Nome que o código consome hoje -> token do padrão que deve valer nele.
LEGADO_PARA_TOKEN = {
    # Marca
    '--ath-color-primary-900': 'Background/Brand',
    '--ath-color-primary-700': 'Content/Brand',          # o roxo claro sai de cena
    '--ath-color-primary-500': 'Background/BrandHover',
    '--ath-color-primary-100': 'Background/BrandSubtle',
    '--ath-color-primary-50': 'Background/BrandSelected',
    '--background-selected': 'Background/BrandSelected',
    # Neutros / conteúdo
    '--ath-color-secondary-900': 'Content/Primary',
    '--ath-color-secondary-700': 'Content/Secondary',
    '--ath-color-secondary-600': 'Content/Secondary',
    '--ath-color-secondary-500': 'Content/Tertiary',
    '--ath-color-secondary-400': 'Border/Default',
    '--ath-color-secondary-300': 'Border/Subtle',
    '--ath-border-color': 'Border/Subtle',
    '--content-primary': 'Content/Primary',
    '--content-secondary': 'Content/Secondary',
    '--content-tertiary': 'Content/Tertiary',
    '--content-primary-inverse': 'Content/OnFill',
    '--content-secondary-inverse': 'Content/OnFill',
    '--content-tertiary-inverse': 'Content/OnFill',
    '--content-disabled': 'Content/Disabled',
    # Bordas
    '--border-primary': 'Border/Default',
    '--border-secondary': 'Border/Subtle',
    '--border-tertiary': 'Border/Faint',
    '--border-disabled': 'Border/Disabled',
    '--border-brand': 'Border/Brand',
    '--border-focus': 'Border/Focus',
    '--border-inverse': 'Border/Inverse',
    '--border-info': 'Border/Info',
    '--border-warning': 'Border/Warning',
    '--border-danger': 'Border/Danger',
    '--border-success': 'Border/Success',
    # Fundos
    '--background-primary': 'Background/Surface',
    '--background-hover': 'Background/Hover',
    '--background-pressed': 'Background/Hover',
    '--background-disabled': 'Background/Hover',
    '--background-inverse': 'Background/Inverse',
    '--background-brand': 'Background/Brand',
    '--background-brand-hover': 'Background/BrandHover',
    '--background-brand-pressed': 'Background/BrandPressed',
    # Famílias semânticas
    '--content-success': 'Content/Success',
    '--content-success-bold': 'Content/OnSuccessSubtle',
    '--content-success-darker': 'Content/OnSuccessSubtlePressed',
    '--background-success': 'Background/Success',
    '--background-success-hover': 'Background/SuccessHover',
    '--background-success-pressed': 'Background/SuccessPressed',
    '--background-success-outline-hover': 'Background/SuccessSubtleHover',
    '--background-success-outline-pressed': 'Background/SuccessSubtlePressed',
    '--background-positive': 'Background/Success',
    '--background-positive-subtle': 'Background/SuccessSubtle',
    '--content-danger': 'Content/Danger',
    '--content-danger-bold': 'Content/OnDangerSubtle',
    '--content-danger-darker': 'Content/OnDangerSubtlePressed',
    '--background-danger': 'Background/Danger',
    '--background-danger-hover': 'Background/DangerHover',
    '--background-danger-pressed': 'Background/DangerPressed',
    '--background-negative': 'Background/Danger',
    '--background-negative-subtle': 'Background/DangerSubtle',
    '--background-negative-outline-hover': 'Background/DangerSubtle',
    '--background-negative-outline-pressed': 'Background/DangerSubtlePressed',
    '--content-warning': 'Content/Warning',
    '--content-warning-bold': 'Content/OnWarningSubtle',
    '--background-warning-subtle': 'Background/WarningSubtle',
    '--content-risk': 'Content/Risk',
    '--content-risk-bold': 'Content/OnRiskSubtle',
    '--background-notice': 'Background/Risk',
    '--background-notice-subtle': 'Background/RiskSubtle',
    '--content-info': 'Content/Info',
    '--content-info-bold': 'Content/OnInfoSubtle',
    '--background-info': 'Background/Info',
    '--background-info-subtle': 'Background/InfoSubtle',
    '--content-link': 'Content/Brand',
    '--content-link-hover': 'Content/OnBrandSubtle',
    '--content-link-pressed': 'Background/BrandPressed',
    '--overlay-50': 'Overlay/Scrim',
    # Bloco de tema legado (`themes/main.scss`) que faltava mapear — apareceu na
    # auditoria das PÁGINAS: as barras de badge usavam o amarelo e o laranja
    # antigos (#efca44, #d98609).
    #
    # MAPEAR PELO PAPEL, NÃO PELO HEX PARECIDO. Estas cinco variáveis são o
    # coração das etiquetas de estado e o produto usa CADA UMA em três papéis ao
    # mesmo tempo (`_table.scss:53-61` é o molde repetido ~90 vezes):
    #     background: var(--ath-color-success-light)   ← fundo claro
    #     color:      var(--ath-color-success)         ← TEXTO sobre o fundo claro
    #     &::before   var(--ath-color-success)         ← pontinho
    # Mapeadas pelo hex mais próximo, caíam no tom Vivid — e Vivid é decoração,
    # não carrega conteúdo (regra nº 4 do sistema): a etiqueta "Matriculado" saía
    # #2ECC71 sobre #EAFAF1 = 1,95:1, quatro vezes abaixo do piso.
    # O tom sólido resolve os três papéis de uma vez, porque o mesmo hex é
    # Content/X E Background/X (ex.: #007A29 é os dois). Texto passa a ser
    # legível, o pontinho fica na mesma cor do texto e um fundo preenchido com
    # ele continua correto.
    '--ath-color-success': 'Content/Success',            # #007A29 (era Vivid #2ECC71)
    '--ath-color-success-light': 'Background/SuccessSubtle',
    '--ath-color-info': 'Content/Info',                  # #2944CC (era InfoLarge #3B83F4 — 3,26:1)
    '--ath-color-info-light': 'Background/InfoSubtle',
    '--ath-color-danger': 'Content/OnDangerSubtle',      # #B70000 (era #E50000 — 3,36:1 no subtle)
    '--ath-color-danger-light': 'Background/DangerSubtle',
    '--ath-color-warning': 'Content/Warning',            # #6F5D00 (era Vivid #E8CD46)
    '--ath-color-warning-dark': 'Content/Warning',
    '--ath-color-warning-light': 'Background/WarningSubtle',
    '--ath-color-risk': 'Content/Risk',                  # #6B2300 (era Vivid #DF8124 — 2,05:1)
    '--ath-color-risk-light': 'Background/RiskSubtle',
    '--ath-color-light': 'Background/Canvas',
    '--ath-color-white': 'Background/Surface',
    '--ath-icon-color': 'Content/Secondary',
    '--ath-link': 'Content/Brand',
    # Variáveis que o código USA e NUNCA foram declaradas (é o M65 do backlog):
    # `var()` que não resolve invalida a declaração e a cor cai para o valor
    # inicial — PRETO. Foi de onde vinha o #000000 nos cartões da home.
    '--ath-color-primary-200': 'Border/FocusInner',
    '--ath-color-primary-300': 'Background/BrandSubtle',
    '--ath-color-primary-400': 'Background/BrandHover',
    '--ath-color-primary-600': 'Background/BrandHover',
    '--ath-color-primary-800': 'Background/BrandPressed',
    '--ath-color-secondary-100': 'Border/Disabled',
    '--ath-color-secondary-200': 'Border/Subtle',
    '--ath-color-secondary-800': 'Content/Primary',
}

def var_do_token(nome):
    """Nome novo do token: --categoria-papel (kebab)."""
    cat, papel = nome.split('/')
    fora = ''
    for i, ch in enumerate(papel):
        if ch.isupper() and i > 0:
            fora += '-'
        fora += ch.lower()
    return f'--{cat.lower()}-{fora}'

linhas = []
linhas.append('/* GERADO por gerar-tokens-css.py — não edite à mão.')
linhas.append('   O código do EducbankPay entra por alias, read-only. Este arquivo é o único')
linhas.append('   lugar onde as cores do padrão são impostas: ele redeclara as variáveis que os')
linhas.append('   componentes já consomem, então o componente REAL renderiza com a cor NOVA.')
linhas.append('   Carregado DEPOIS de educbank.scss em main.ts. */')
# `:root:root:root` — especificidade tripla, de propósito.
# Cada SFC do produto que importa os temas REINJETA um `:root` com os valores
# originais, e o CSS de SFC entra DEPOIS desta folha (medido: a folha do
# AthTitle.vue é a nº 12, esta é a nº 4). Com um `:root` simples o override
# perde a cascata na hora em que o componente entra na tela. Com especificidade
# tripla ele ganha independentemente da ordem de injeção.
# O ATRIBUTO é o interruptor do switch antes/depois. Com `data-cores="novas"` as
# 78 declarações valem; sem ele, elas somem inteiras e o produto volta aos valores
# originais do próprio `themes/main.scss` — o "antes" não é uma imitação nossa, é
# o produto SEM esta camada, o que faz a comparação honesta.
# O `:where()` no ATRIBUTO: a especificidade tripla do `:root:root:root` é
# intencional (precisa vencer os SFCs que reinjetam `:root`), mas o atributo do
# switch não deve somar nada — ele só liga e desliga. Sem `:where`, o gate
# deslocaria a cascata e regras que dependem de perder para o produto quebram
# (foi o que aconteceu no bloco 7 do override: 66 elementos ficaram pretos).
RAIZ = ":root:root:root:where([data-cores='novas'])"
linhas.append(RAIZ + ' {')
linhas.append('  /* ── 1 · Os nomes do padrão ─────────────────────────────────── */')
for p in paleta:
    linhas.append(f"  {var_do_token(p['nome'])}: {p['hex']};   /* {p['nome']} */")

linhas.append('')
linhas.append('  /* ── 2 · Os nomes que o código já usa, apontando para o TOKEN NOVO ── */')
linhas.append('  /* ALIAS, não hex: `--ath-color-secondary-900: var(--content-primary)`.')
linhas.append('     O comando máximo do Paulo (2026-08-02): ao INSPECIONAR no DevTools, a')
linhas.append('     regra do produto mostra o nome legado (o repo é READ-ONLY, isso não')
linhas.append('     muda) — mas a CADEIA de var() deve exibir o token novo. Com hex cru a')
linhas.append('     cadeia morria no numero; com alias, o DevTools mostra o caminho')
linhas.append('     legado → token novo → valor. A ponte vira documentação inspecionável:')
linhas.append('     cada nome antigo declara PARA QUAL token novo ele foi mapeado. */')
faltando = []
for legado, token in LEGADO_PARA_TOKEN.items():
    if token not in por_nome:
        faltando.append((legado, token)); continue
    alvo = var_do_token(token)
    if legado == alvo:
        # AUTO-REFERÊNCIA MATA A VARIÁVEL. Vários nomes legados coincidem com o
        # nome novo (--content-primary já se chama --content-primary). Emitir
        # `--content-primary: var(--content-primary)` cria um ciclo — e ciclo em
        # custom property é INVÁLIDO: a variável inteira morre e toda cor que
        # dependia dela cai na herança. Medido: o título do modal computou
        # #16171A (o texto da FERRAMENTA) em vez de #002A3A. A parte 1 já declara
        # esses nomes com o valor; aqui é só não redeclarar.
        continue
    linhas.append(f"  {legado}: var({alvo});   /* {token} {por_nome[token]['hex']} */")
linhas.append('  /* usada dentro de rgba(): precisa dos canais, não de hex */')
linhas.append('  --ath-color-primary-rgb: 107, 85, 216;   /* Background/Brand em canais */')
linhas.append('}')
linhas.append('')
linhas.append('/* O tema escuro do produto só redeclara o legado; o par escuro de cada token')
linhas.append('   fica disponível aqui para quando a decisão de produto acontecer. */')
linhas.append(RAIZ + '[data-esquema="escuro"] {')
for p in paleta:
    if p.get('dark'):
        linhas.append(f"  {var_do_token(p['nome'])}: {p['dark']};")
linhas.append('}')

destino = os.path.join(AQUI, 'src/estilo/tokens-padrao.css')
open(destino, 'w', encoding='utf-8').write('\n'.join(linhas) + '\n')
print('gerado:', destino)
print('  tokens do padrão declarados:', len(paleta))
print('  nomes legados redeclarados:', len(LEGADO_PARA_TOKEN) - len(faltando))
if faltando:
    print('  !! token inexistente na paleta:', faltando)
