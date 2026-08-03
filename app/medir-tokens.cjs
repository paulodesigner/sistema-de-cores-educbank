/**
 * Mede os tokens que cada componente REALMENTE pinta, e imprime JSON.
 *
 * Alimenta o `gerar-tokens-medidos.py`, que reescreve a lista de tokens do
 * registry. A lista da doc passa a ser derivada da tela, não mantida à mão — foi
 * assim que 94 de 108 listas divergiram do que se vê.
 *
 * Critério de "usado pelo componente":
 *   · fundo, borda e anel próprios;
 *   · `color` só quando o elemento DECLARA a cor. Cor herdada não é escolha do
 *     componente: o palco dá `color: var(--content-primary)` a tudo, e sem esse
 *     filtro Content/Primary entraria em 108 de 108 listas.
 *
 * A herança é detectada comparando com o pai: se a cor computada é a mesma do pai,
 * o elemento não declarou nada próprio. Não é perfeito (um elemento pode declarar
 * exatamente a cor que herdaria), mas erra para o lado seguro — deixa de fora, em
 * vez de inflar a lista.
 *
 *   node medir-tokens.cjs [base] > /tmp/tokens-medidos.json
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const REG = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta
const { medirTokens, medirComEstados } = require('./lib-tokens.cjs')


;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const saida = {}
  for (const c of REG) {
    saida[c.id] = await medirComEstados(p, BASE, c.id, paleta, medirTokens)
  }
  await b.close()
  process.stdout.write(JSON.stringify(saida, null, 1))
})()
