/**
 * Mede as pontas das setas da página Nomenclatura e grava `nomen-coords.json`.
 *
 * Cada alvo tem um marcador invisível (`<s class="mk" data-mk="…">`) DENTRO do
 * plano 3D; o navegador o projeta junto com a rotação e aqui lemos o centro do
 * retângulo projetado, relativo ao palco. O RÓTULO declara qual marcador aponta
 * (`data-para`) — com 5 palcos e ~30 setas, o mapa por ordem de DOM viraria
 * fonte de erro: um rótulo inserido no meio desalinharia os seguintes em silêncio.
 *
 * Faz parte do build da página: gera.py (1ª vez) → este medidor → gera.py de novo.
 *
 *   node medir-nomen.cjs
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const HTML = 'file://' + path.join(__dirname, '..', 'index.html') + '#nomenclatura'

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1500, height: 1200 } })
  await p.goto(HTML, { waitUntil: 'load' })
  await p.waitForTimeout(900)
  const coords = await p.evaluate(() => {
    const out = {}
    document.querySelectorAll('.nomen-stage').forEach((stage) => {
      const rs = stage.getBoundingClientRect()
      stage.querySelectorAll(':scope > .nomen-lab[data-para]').forEach((lab) => {
        const id = lab.dataset.para
        const mk = stage.querySelector(`.mk[data-mk="${id}"]`)
        if (!mk) return
        const rm = mk.getBoundingClientRect()
        const rl = lab.getBoundingClientRect()
        /* a curva sai do lado do rótulo que OLHA para o alvo */
        const doLadoEsquerdo = rl.left - rs.left > rs.width / 2
        out[id] = {
          sx: Math.round((doLadoEsquerdo ? rl.left - 10 : rl.right + 10) - rs.left),
          sy: Math.round(rl.top + 10 - rs.top),
          tx: Math.round(rm.left + rm.width / 2 - rs.left),
          ty: Math.round(rm.top + rm.height / 2 - rs.top),
        }
      })
    })
    return out
  })
  fs.writeFileSync(path.join(__dirname, 'nomen-coords.json'), JSON.stringify(coords, null, 1))
  console.log('nomen-coords.json:', Object.keys(coords).length, 'setas medidas')
  Object.entries(coords).forEach(([k, c]) => console.log(`  ${k.padEnd(10)} rótulo(${c.sx},${c.sy}) → alvo(${c.tx},${c.ty})`))
  await b.close()
})()
