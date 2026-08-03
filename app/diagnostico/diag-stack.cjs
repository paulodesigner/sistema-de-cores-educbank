const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
  // roda em DEV para ter stack legível com nome de arquivo
  p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 700)) })
  p.on('pageerror', (e) => console.log('PAGEERROR:', (e.stack || '').split('\n').slice(0, 6).join('\n')))
  await p.goto('http://localhost:5180/#/pagina/home', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{})
  await p.waitForTimeout(4000)
  await b.close()
})()
