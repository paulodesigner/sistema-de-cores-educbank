const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const id = process.argv[2]
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
  p.on('pageerror', (e) => console.log('  PAGEERROR:', (e.stack || e.message).split('\n').slice(0, 3).join(' | ')))
  p.on('console', (m) => { if (m.type() === 'error') console.log('  CONSOLE:', m.text().slice(0, 200)) })
  await p.goto(`http://localhost:5180/#/pagina/${id}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('  goto:', e.message.slice(0,80)))
  await p.waitForTimeout(4500)
  const r = await p.evaluate(() => ({
    palcoHTML: (document.querySelector('.cheia__palco')?.innerHTML || '').replace(/\s+/g, ' ').slice(0, 300),
    erro: document.querySelector('.cheia__erro')?.textContent?.trim().slice(0, 200) || null,
  }))
  console.log('  palco:', r.palcoHTML || '(vazio)')
  console.log('  erro:', r.erro || 'nenhum')
  await b.close()
})()
