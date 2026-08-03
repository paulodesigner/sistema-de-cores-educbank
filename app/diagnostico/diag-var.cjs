const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
  await p.goto('http://localhost:5180/#/pagina/alunos', { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(4000)
  console.log(await p.evaluate(() => {
    const el = document.querySelector('.border-badge')
    const noRoot = getComputedStyle(document.documentElement).getPropertyValue('--ath-color-risk').trim()
    const noEl = el ? getComputedStyle(el).getPropertyValue('--ath-color-risk').trim() : 'sem elemento'
    const borderColor = el ? getComputedStyle(el).getPropertyValue('--border-color').trim() : ''
    return JSON.stringify({ noRoot, noEl, borderColor, bg: el ? getComputedStyle(el).backgroundColor : '', styleInline: el?.getAttribute('style') }, null, 1)
  }))
  await b.close()
})()
