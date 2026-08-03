#!/usr/bin/env python3
"""
Deriva `override-legado.gated.css` a partir de `override-legado.css`.

Por que derivar em vez de editar: o `override-legado.css` é escrito à mão e é, ao
mesmo tempo, **a lista de tarefas de implementação** — cada um dos 29 blocos tem o
motivo, a medida e o `arquivo:linha` do produto. Enfiar um prefixo de seletor em
40 regras ali destruiria a legibilidade do documento que o dev vai ler.

O que este script faz: prefixa cada seletor com `:root[data-cores='novas']`, que é
o interruptor do switch antes/depois. Com o atributo, os overrides valem; sem ele,
somem — e o produto volta ao próprio CSS, sem nada nosso no meio.

Dois cuidados que o processamento precisa ter:
  · o `:root:root:root` do bloco 6 (variáveis `--dp-*` do calendário) recebe o
    atributo NO PRÓPRIO seletor, senão vira `:root … :root`, que não casa com nada;
  · a especificidade sobe uniformemente (+0,1,0 em tudo), então a ordem relativa
    entre as MINHAS regras não muda. O que muda é a relação com as regras do
    produto — e a favor, que é o que queremos.

Comentários são preservados: o arquivo gerado continua auditável lado a lado.

  python3 gerar-override-alternavel.py
"""
import pathlib, re

AQUI = pathlib.Path(__file__).parent
FONTE = AQUI / 'src/estilo/override-legado.css'
SAIDA = AQUI / 'src/estilo/override-legado.gated.css'
# `:where(...)` tem especificidade ZERO — e isso é o ponto central do gate.
#
# A 1ª versão usava `:root[data-cores='novas']` cru, que soma +0,1,0 a cada uma
# das 107 regras. Parecia inofensivo ("sobe tudo junto"), mas basta uma regra que
# DEPENDA de perder para o produto para quebrar: o bloco 7 tem
# `button { color: inherit }` seguido de `.eds-button { color: revert-layer }`,
# e com a especificidade deslocada o `revert-layer` passou a ganhar e reverteu
# para o `color: buttontext` do NAVEGADOR — 66 elementos ficaram com texto preto,
# inclusive sobre o roxo da marca (3,92:1).
# Com `:where()` a cascata fica IDÊNTICA à de antes do gate: o atributo só liga e
# desliga, nunca reordena. Um interruptor não deve mudar a instalação.
GATE = ":where(:root[data-cores='novas'])"

texto = FONTE.read_text()

# Comentários viram placeholders ANTES de qualquer análise.
#
# Motivo: o `override-legado.css` tem comentário DENTRO de lista de seletores —
#     .palco,
#     .cheia__palco,
#     /* teleportados: nascem como filhos do <body> … */
#     .dp--menu-wrapper,
# Fatiar o arquivo por comentário quebrava a lista em duas, e a primeira metade
# (sem `{`) passava sem receber o gate. Foram 7 seletores silenciosamente
# ignorados na 1ª versão — incluindo `.palco`, que é o mais importante de todos.
guardados = []


def guardar(m):
    guardados.append(m.group(0))
    return f'\x00{len(guardados) - 1}\x00'


mascarado = re.sub(r'/\*.*?\*/', guardar, texto, flags=re.S)

regras, seletores = 0, 0


def prefixar(bruto):
    """Prefixa cada seletor da lista, preservando os comentários que estejam
    entre eles (voltam para o lugar, antes do seletor a que precedem)."""
    global seletores
    saida = []
    for sel in bruto.split(','):
        # separa os placeholders de comentário do texto do seletor
        marcas = re.findall(r'\x00\d+\x00', sel)
        limpo = re.sub(r'\x00\d+\x00', '', sel).strip()
        prefixo = ''.join('\n' + m for m in marcas)
        if not limpo:
            saida.append(prefixo)
            continue
        seletores += 1
        if limpo.startswith(':root'):
            # `:root:root:root` recebe o atributo NO PRÓPRIO seletor: prefixar
            # daria `:root … :root`, que não casa com nada.
            novo = limpo if '[data-cores' in limpo else limpo + ":where([data-cores='novas'])"
        else:
            novo = f'{GATE} {limpo}'
        saida.append(prefixo + ('\n' if prefixo else '') + novo)
    return ',\n'.join(s for s in saida if s.strip())


def uma_regra(m):
    global regras
    regras += 1
    return prefixar(m.group(1)) + ' {' + m.group(2) + '}'


processado = re.sub(r'([^{}]+)\{([^{}]*)\}', uma_regra, mascarado, flags=re.S)

# devolve os comentários
for i, c in enumerate(guardados):
    processado = processado.replace(f'\x00{i}\x00', c)

conteudo = (
    '/* GERADO por gerar-override-alternavel.py — não edite à mão.\n'
    '   Fonte: override-legado.css (esse é o documento legível, com o motivo, a\n'
    "   medida e o arquivo:linha de cada dívida). Aqui cada seletor recebeu\n"
    f"   `{GATE}`, que é o interruptor do switch antes/depois:\n"
    '   com o atributo os overrides valem; sem ele, o produto renderiza com o\n'
    '   próprio CSS, sem nada nosso no meio. */\n\n'
    + processado.lstrip('\n')
)
SAIDA.write_text(conteudo)
print(f'gerado: {SAIDA.name}')
print(f'  regras processadas: {regras} · seletores prefixados: {seletores}')

# ── conferência: o gerado tem de ter as mesmas declarações da fonte ──────────
def declaracoes(css):
    sem = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    return sorted(d.strip() for d in re.findall(r'\{([^{}]*)\}', sem) for d in d.split(';') if d.strip())

a, b = declaracoes(texto), declaracoes(conteudo)
print(f'  declarações — fonte {len(a)} · gerado {len(b)} · '
      + ('iguais ✓' if a == b else 'DIFERENTES ✗'))
if a != b:
    raise SystemExit('o gerado perdeu ou inventou declaração — não use')
# Conferência do gate: analisa o CSS SEM comentários e olha seletor por seletor.
# A 1ª versão desta checagem casava o regex contra o arquivo COM comentários e
# reportava trechos de comentário como "seletor sem gate" — um verificador que
# mente é pior que nenhum.
sem_com = re.sub(r'/\*.*?\*/', '', conteudo, flags=re.S)
todos = [s.strip() for bloco in re.findall(r'([^{}]+)\{', sem_com) for s in bloco.split(',') if s.strip()]
sem_gate = [s for s in todos if 'data-cores' not in s]
print(f'  seletores no arquivo: {len(todos)} · com gate: {len(todos) - len(sem_gate)}')
if sem_gate:
    print(f'  ✗ SEM GATE ({len(sem_gate)}): {sem_gate}')
    raise SystemExit('todo seletor precisa do gate, senão o override vaza para o modo "hoje"')
print('  ✓ todo seletor tem o gate')
