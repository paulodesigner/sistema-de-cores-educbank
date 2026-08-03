const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const BASE = 'http://localhost:4173'
const IDS = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  for (const id of IDS) {
    await p.goto(`${BASE}/#/doc/${id}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(500)
    const r = await p.evaluate(() => {
      const palco = document.querySelector('.palco')
      const teleport = [...document.querySelectorAll('body > div')].filter((d) => !d.id && d.getBoundingClientRect().height > 30)
      return {
        htmlDoPalco: (palco?.innerHTML || '').replace(/\s+/g, ' ').slice(0, 220),
        alturaPalco: Math.round(palco?.getBoundingClientRect().height || 0),
        filhosVisiveis: [...(palco?.children || [])].filter((c) => c.getBoundingClientRect().height > 2).length,
        teleportados: teleport.map((d) => d.className.slice(0, 40) + ' h=' + Math.round(d.getBoundingClientRect().height)),
      }
    })
    console.log(`\n### ${id}  (altura ${r.alturaPalco}, ${r.filhosVisiveis} filhos visíveis)`)
    console.log('  html:', r.htmlDoPalco || '(vazio)')
    if (r.teleportados.length) console.log('  teleportado no body:', r.teleportados.join(' | '))
  }
  await b.close()
})()
