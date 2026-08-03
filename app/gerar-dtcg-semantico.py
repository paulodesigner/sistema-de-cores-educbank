#!/usr/bin/env python3
"""
Gera a camada SEMÂNTICA do contrato de tokens (`.claude/references/ds-contract/`).

Por que: o `tokens.dtcg.json` tem só PRIMITIVOS — as escalas `brand.500`,
`neutral.450`, `green.600`… extraídas do código. Com primitivos dá para responder
"esse hex existe no sistema?", que é a pergunta fraca: foi ela que deixou passar a
etiqueta com texto no tom Vivid a 1,95:1 (2026-08-02).

Para uma máquina responder "esse token é o CERTO para esse papel?" ela precisa do
vocabulário de papéis e, em cada papel, de três coisas que este arquivo declara:

  · `ebp.papel`         — em que propriedade CSS o token pode entrar
  · `ebp.fundoPadrao`   — contra o que ele é medido (tinta de família mira o
                          pastel da própria família, não o card)
  · `ebp.contrasteMinimo` — o piso daquele papel, ou null quando é decorativo por
                          desenho (trilha, contorno de tarja)

Sem `fundoPadrao` a verificação de contraste é chute; sem `papel` a de categoria
não existe.

⚠️ Esta camada NÃO é extraída do código: ela vem do PADRÃO (`paleta.json`), que é
   a proposta auditada. Os primitivos continuam sendo a verdade do que está no ar.
   As duas convivem de propósito, e o `$description` de cada um diz qual é qual.

Escreve `tokens-semantic.dtcg.json` ao lado do de primitivos. Idempotente.
"""
import json, pathlib
from lib_cor import contraste

AQUI = pathlib.Path(__file__).parent
PALETA = json.loads((AQUI / 'src/dados/paleta.json').read_text())
SAIDA = AQUI.parent.parent / '.claude/references/ds-contract/tokens-semantic.dtcg.json'

paleta = PALETA['paleta']
por = {t['nome']: t for t in paleta}

# Em que propriedade CSS cada categoria pode entrar. É a regra da pergunta nº 2.
PROPRIEDADES = {
    'Content': ['color', 'fill', 'stroke', 'caret-color', 'text-decoration-color'],
    'Background': ['background', 'background-color'],
    'Border': ['border-color', 'outline-color', 'border-*-color'],
    'Control': ['accent-color'],
    'Overlay': ['background', 'background-color'],
}
PISO_TEXTO, PISO_OBJETO = 4.5, 3.0

# Fundo contra o qual cada token é medido. Só o que FOGE da regra geral entra aqui;
# o resto cai no padrão (tinta e contorno miram a superfície).
FUNDO_ESPECIAL = {
    'Content/OnFill': ('Background/Brand', PISO_TEXTO,
                       'o menor dos 6 preenchimentos — se passa no pior, passa em todos'),
    'Content/OnBrandSubtle': ('Background/BrandSubtle', PISO_TEXTO, None),
    'Content/OnSuccessSubtle': ('Background/SuccessSubtle', PISO_TEXTO, None),
    'Content/OnWarningSubtle': ('Background/WarningSubtle', PISO_TEXTO, None),
    'Content/OnRiskSubtle': ('Background/RiskSubtle', PISO_TEXTO, None),
    'Content/OnInfoSubtle': ('Background/InfoSubtle', PISO_TEXTO, None),
    'Content/OnDangerSubtle': ('Background/DangerSubtle', PISO_TEXTO, None),
    'Content/OnSuccessSubtlePressed': ('Background/SuccessSubtlePressed', PISO_TEXTO, None),
    'Content/OnDangerSubtlePressed': ('Background/DangerSubtlePressed', PISO_TEXTO, None),
    'Content/Success': ('Background/SuccessSubtle', PISO_TEXTO, None),
    'Content/Warning': ('Background/WarningSubtle', PISO_TEXTO, None),
    'Content/Risk': ('Background/RiskSubtle', PISO_TEXTO, None),
    'Content/Info': ('Background/InfoSubtle', PISO_TEXTO, None),
    'Content/Danger': ('Background/Surface', PISO_TEXTO, None),
    'Background/Neutral': ('Background/Track', PISO_OBJETO,
                           'preenchido × vazio: é esse par que diz quanto já foi preenchido'),
    'Border/FocusInner': ('Border/Focus', None, 'anel interno — vive dentro do anel externo'),
}
# Decorativo por desenho: exigir piso deles é inventar requisito. A trilha mede
# 1,61:1 contra o card no claro, e elevá-la a 3:1 custa o par que carrega a
# informação (medido: o preenchimento cai para 1,86:1).
DECORATIVO = {'Background/Track', 'Border/BrandSubtle', 'Border/Subtle', 'Border/Faint',
              'Border/Disabled', 'Background/Hover', 'Background/Canvas', 'Background/Surface',
              'Background/BrandSelected', 'Background/Inverse'}
ISENTO = {'Content/Disabled'}     # WCAG 1.4.3 isenta controle inativo

grupos = {}
for t in paleta:
    cat, papel = t['nome'].split('/')
    chave = ''.join(('-' + c.lower() if c.isupper() and i else c.lower())
                    for i, c in enumerate(papel))
    ext = {
        'ebp.nome': t['nome'],
        'ebp.papel': cat.lower(),
        'ebp.propriedadesPermitidas': PROPRIEDADES[cat],
        'ebp.cssVar': t['cssVar'],
        'ebp.esquemaEscuro': t.get('dark'),
        'ebp.situacaoNoCodigo': t.get('situacao'),
    }
    if t['nome'] in ISENTO:
        ext['ebp.contrasteMinimo'] = None
        ext['ebp.motivoIsencao'] = 'WCAG 1.4.3 isenta componente inativo'
    elif t['nome'] in DECORATIVO:
        ext['ebp.contrasteMinimo'] = None
        ext['ebp.motivoIsencao'] = 'decorativo por desenho — não carrega informação'
    else:
        fundo, piso, nota = FUNDO_ESPECIAL.get(
            t['nome'], ('Background/Surface', PISO_TEXTO if cat == 'Content' else PISO_OBJETO, None))
        ext['ebp.fundoPadrao'] = fundo
        ext['ebp.contrasteMinimo'] = piso
        # Overlay/Scrim é rgba() com alpha: contraste dele não é um par fixo — o
        # resultado depende do que está embaixo. Fica sem medida, de propósito.
        ehHex = t['hex'].startswith('#') and (not por.get(fundo) or por[fundo]['hex'].startswith('#'))
        if piso and por.get(fundo) and ehHex:
            ext['ebp.contrasteMedido'] = {
                'claro': round(contraste(t['hex'], por[fundo]['hex']), 2),
                'escuro': (round(contraste(t['dark'], por[fundo]['dark']), 2)
                           if t.get('dark') and por[fundo].get('dark') else None),
            }
        if nota:
            ext['ebp.observacao'] = nota
    grupos.setdefault(cat.lower(), {})[chave] = {
        '$value': t['hex'],
        '$description': t['nota'],
        '$extensions': ext,
    }

doc = {
    '$description': (
        'EducbankPay DS — camada SEMÂNTICA (papéis de cor). Complementa tokens.dtcg.json, que tem os '
        'PRIMITIVOS extraídos do código. Aqui estão os 78 papéis do padrão auditado: é esta camada que '
        'permite verificar se um token está no papel CERTO, não apenas se o valor existe. '
        'Cada token declara em que propriedades CSS pode entrar (ebp.propriedadesPermitidas), contra o '
        'que é medido (ebp.fundoPadrao) e o piso do papel (ebp.contrasteMinimo — null quando é '
        'decorativo por desenho). '
        'ATENÇÃO: esta camada vem do PADRÃO (proposta auditada), não do que está em produção hoje; '
        'ebp.situacaoNoCodigo diz o estado de cada um ("já existe" / "declarar" / "trocar valor"). '
        'Gerada por sistema-de-cores/app/gerar-dtcg-semantico.py — não editar à mão.'),
    '$type': 'color',
    'geradoEm': '2026-08-02',
    'fonte': 'sistema-de-cores/app/src/dados/paleta.json',
    'regraDeVerificacao': {
        'pergunta1_valor': 'o hex existe entre os 78 papéis ou nos primitivos?',
        'pergunta2_papel': ('a propriedade CSS em que o valor está aparece em '
                            'ebp.propriedadesPermitidas do token que tem esse valor? '
                            'Exceções: (a) elemento sem texto com menor dimensão ≤8px é um TRAÇO e pode '
                            'usar Border/* como preenchimento; (b) borda da mesma cor do próprio fundo é '
                            'redundância de código, não decisão de cor.'),
        'pergunta3_contraste': ('o par tinta × fundo EFETIVO (compondo alpha subindo a árvore) atinge '
                                'ebp.contrasteMinimo? Piso 3,0 para ícone e texto grande (≥18,66px, ou '
                                '≥14px em peso ≥700).'),
        'implementacaoDeReferencia': 'sistema-de-cores/app/lib-papel.cjs',
    },
    **grupos,
}
SAIDA.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
print(f'gerado: {SAIDA}')
for g, itens in grupos.items():
    print(f'  {g:12} {len(itens)} papéis')
print(f'  total        {sum(len(i) for i in grupos.values())}')
