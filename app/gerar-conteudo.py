#!/usr/bin/env python3
"""Extrai do artefato estático o HTML das 4 páginas de conteúdo (Fundamentos,
Paleta, Papéis, Regras) para o app Vue injetar. Uma fonte só de conteúdo: o que
muda no estático aparece aqui na próxima geração."""
import json, os, re
AQUI = os.path.dirname(os.path.abspath(__file__))
fonte = open(os.path.join(AQUI, '../index.html'), encoding='utf-8').read()
paginas = {}
for pid in ['fundamentos', 'paleta', 'papeis', 'nomenclatura', 'instrucoes-ia']:
    m = re.search(r'<section class="ds-panel" data-p="%s"[^>]*>(.*?)</section>\s*(?=<section class="ds-panel"|</main>)' % pid, fonte, re.S)
    if not m:
        print('  !! não achei', pid); continue
    html = m.group(1)
    html = html.replace('<h2>', '<h2 class="ds-titulo">')       # o h2 vem da casca do app
    paginas[pid] = html
destino = os.path.join(AQUI, 'src/dados/paginas-doc.json')
json.dump(paginas, open(destino, 'w', encoding='utf-8'), ensure_ascii=False)
print('gerado:', destino, '| páginas:', list(paginas), '| chars:', {k: len(v) for k, v in paginas.items()})
