#!/usr/bin/env python3
"""Lê as props declaradas de cada componente que não montou (ou montou vazio) e
sugere um valor de exemplo por nome/tipo. A verdade vem do defineProps do
próprio arquivo — nada aqui é chutado sem olhar o código."""
import json, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
HUB = os.path.abspath(os.path.join(AQUI, '../..'))
EBP = os.path.join(HUB, 'EducbankPay/webclient/src')
reg = {c['id']: c for c in json.load(open(os.path.join(AQUI, 'src/registry/componentes.json')))}
alvos = sys.argv[1:]

def caminho(item):
    return item['arquivo'].replace('@ebp', EBP) if item['arquivo'] else None

for cid in alvos:
    item = reg.get(cid)
    if not item or not caminho(item):
        print(f'\n### {cid}: sem arquivo'); continue
    src = open(caminho(item), encoding='utf-8').read()
    print(f'\n### {cid}  ({item["arquivo"]})')
    m = re.search(r'defineProps<\{(.*?)\}>\(', src, re.S) or re.search(r'defineProps\(\{(.*?)\n\s*\}\)', src, re.S)
    if not m:
        m2 = re.search(r'withDefaults\(defineProps<\{(.*?)\}>\(\)', src, re.S)
        m = m2
    if not m:
        print('  (sem defineProps explícito)')
    else:
        for linha in m.group(1).split('\n'):
            l = linha.strip().rstrip(',')
            if l and not l.startswith('//') and not l.startswith('/*'):
                print('  prop:', l[:110])
    for inj in set(re.findall(r"inject\(['\"]([a-z]+)['\"]", src)):
        print('  inject:', inj)
    for uso in set(re.findall(r"(permission|setting|feature|helper|format|date)\.([a-zA-Z]+)\(", src)):
        print('  usa:', '.'.join(uso) + '()')
