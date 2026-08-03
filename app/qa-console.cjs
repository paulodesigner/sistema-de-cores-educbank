/** Garante que nenhum componente quebra a tela: erro de runtime, palco vazio
 *  ou altura zero. Roda nas 108 páginas de componente. */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')
const BASE = process.argv[2] || 'http://localhost:4173'
const reg = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const problemas = []
  for (const c of reg) {
    const erros = []
    const h = (e) => erros.push(String(e.message || e).slice(0, 90))
    p.on('pageerror', h)
    await p.goto(`${BASE}/#/doc/${c.id}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(300)
    const r = await p.evaluate(() => {
      const palco = document.querySelector('.palco')
      const teleport = [...document.querySelectorAll('body > div:not(#app)')].some((d) => d.getBoundingClientRect().height > 30)
      return { altura: Math.round(palco?.getBoundingClientRect().height || 0),
        conteudo: !!palco && (palco.children.length > 0 || teleport),
        titulo: document.querySelector('.ds-panel.on h2')?.textContent }
    })
    p.off('pageerror', h)
    if (!r.conteudo || r.altura < 40 || erros.length) problemas.push({ id: c.id, ...r, erros: [...new Set(erros)].slice(0, 1) })
  }
  console.log(`componentes conferidos: ${reg.length} · com problema: ${problemas.length}`)
  problemas.forEach((x) => console.log(`  ${x.id.padEnd(32)} altura ${x.altura} conteudo ${x.conteudo} ${x.erros.join('')}`))
  await b.close()
})()
