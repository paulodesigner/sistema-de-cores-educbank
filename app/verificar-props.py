#!/usr/bin/env python3
"""
Confere as props do registry contra o que o CÓDIGO declara.

Por que existe: em 2026-08-02, ao preencher as props dos componentes que
renderizavam vazios, eu inventei o nome dos campos em **5 de 8 objetos** —
`{title}` onde o tipo pedia `{step, label}`, `{label}` onde pedia `{text}`,
`{msgError}` onde pedia `message`, `{date, description}` onde pedia
`{eventDate, details}`. Nenhum desses erros dá exceção: o Vue ignora prop
desconhecida e o componente simplesmente renderiza vazio. O sintoma é idêntico ao
de "componente sem props" — e foi por isso que consertei o mesmo componente duas
vezes.

O que este script faz:
  1. lê o `defineProps` do arquivo real e acusa prop que NÃO existe;
  2. quando a prop é lista/objeto tipada (`PropType<Algo[]>`,
     `Array as () => Algo[]`), procura a `interface Algo` no repositório e compara
     as CHAVES dos meus objetos com os campos dela;
  3. acusa campo obrigatório do tipo que eu não passei.

Não substitui olhar a tela — mas pega em segundos o erro que só aparece depois de
build + print.

  python3 verificar-props.py
"""
import json, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
EBP = os.path.abspath(os.path.join(AQUI, '../../EducbankPay/webclient/src'))
reg = json.load(open(os.path.join(AQUI, 'src/registry/componentes.json')))


def caminho_de(item):
    return item['arquivo'].replace('@ebp', EBP) if item.get('arquivo') else None


def props_declaradas(src):
    """Nomes de prop no defineProps. Aceita as duas formas do repo: objeto de
    opções (`nome: { type: … }`) e genérico (`defineProps<{ nome: tipo }>`)."""
    nomes, tipos = set(), {}
    m = re.search(r'defineProps\s*(?:<([^>]*)>\s*\(\s*\)|\(\s*\{(.*?)\n\s*\}\s*\))', src, re.S)
    if not m:
        return nomes, tipos
    corpo = m.group(1) or m.group(2) or ''
    for linha in corpo.split('\n'):
        mm = re.match(r"\s*(\w+)\s*[?:]", linha)
        if not mm:
            continue
        nomes.add(mm.group(1))
        # tipo do item da lista: PropType<X[]> · Array as () => X[] · X[]
        mt = re.search(r'(?:PropType<\s*(\w+)\s*\[\]|Array as \(\)\s*=>\s*(\w+)\s*\[\]|:\s*(\w+)\s*\[\])', linha)
        if mt:
            tipos[mm.group(1)] = next(g for g in mt.groups() if g)
    return nomes, tipos


def campos_do_tipo(nome_tipo):
    """Acha `interface X {…}` ou `type X = {…}` no repositório e devolve
    (campos, obrigatórios). Procura primeiro nos arquivos de tipo, que é onde o
    repo costuma declarar."""
    padrao = re.compile(r'(?:interface|type)\s+' + re.escape(nome_tipo) + r'\s*=?\s*\{(.*?)\n\s*\}', re.S)
    for raiz, _, arquivos in os.walk(EBP):
        if 'node_modules' in raiz:
            continue
        for a in arquivos:
            if not a.endswith(('.ts', '.vue', '.d.ts')):
                continue
            try:
                src = open(os.path.join(raiz, a), encoding='utf-8').read()
            except Exception:
                continue
            m = padrao.search(src)
            if not m:
                continue
            campos, obrig = set(), set()
            for linha in m.group(1).split('\n'):
                mm = re.match(r"\s*(\w+)(\??)\s*:", linha)
                if mm:
                    campos.add(mm.group(1))
                    if not mm.group(2):
                        obrig.add(mm.group(1))
            return campos, obrig, os.path.relpath(os.path.join(raiz, a), EBP)
    return None, None, None


problemas = []
for item in reg:
    if not item.get('props') and not item.get('gatilhoProp'):
        continue
    cam = caminho_de(item)
    if not cam or not os.path.exists(cam):
        continue
    src = open(cam, encoding='utf-8').read()
    declaradas, tipos = props_declaradas(src)
    if not declaradas:
        continue
    # O `gatilhoProp` é o nome da prop que ABRE o componente (modal). Se estiver
    # errado, o palco alterna uma prop que não existe e o modal nunca abre — foi o
    # caso do AthModalCenter, que recebe `show` e estava registrado como
    # `modelValue`. O sintoma é indireto: a medição de tokens vem VAZIA, e não há
    # erro nenhum no console. Por isso entra na verificação.
    gat = item.get('gatilhoProp')
    if gat and gat not in declaradas:
        problemas.append(f"{item['id']}: `gatilhoProp: {gat}` NÃO existe no defineProps "
                         f"(candidatas: {', '.join(sorted(n for n in declaradas if 'show' in n or 'open' in n or 'model' in n)) or '—'})")

    for nome, valor in item['props'].items():
        if nome not in declaradas:
            problemas.append(f"{item['id']}: a prop `{nome}` NÃO existe no defineProps "
                             f"(declaradas: {', '.join(sorted(declaradas))})")
            continue
        # lista de objetos tipada: compara as chaves
        if isinstance(valor, list) and valor and isinstance(valor[0], dict) and nome in tipos:
            campos, obrig, onde = campos_do_tipo(tipos[nome])
            if campos is None:
                continue
            for i, obj in enumerate(valor):
                invalidas = set(obj) - campos
                if invalidas:
                    problemas.append(
                        f"{item['id']}: em `{nome}[{i}]`, campo inexistente em "
                        f"{tipos[nome]} ({onde}): {sorted(invalidas)} — o tipo tem {sorted(campos)}")
                faltando = obrig - set(obj)
                if faltando:
                    problemas.append(
                        f"{item['id']}: em `{nome}[{i}]`, falta campo OBRIGATÓRIO de "
                        f"{tipos[nome]}: {sorted(faltando)}")
        # objeto único tipado
        if isinstance(valor, dict) and nome in tipos:
            campos, obrig, onde = campos_do_tipo(tipos[nome])
            if campos:
                invalidas = set(valor) - campos
                if invalidas:
                    problemas.append(f"{item['id']}: em `{nome}`, campo inexistente em "
                                     f"{tipos[nome]} ({onde}): {sorted(invalidas)}")

print(f'componentes com props: {sum(1 for c in reg if c.get("props"))}')
if problemas:
    print(f'\n✗ {len(problemas)} problema(s):')
    for p in problemas:
        print(f'   {p}')
    sys.exit(1)
print('✓ toda prop passada existe no defineProps, e todo campo de objeto existe no tipo')
