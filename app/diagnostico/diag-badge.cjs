const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
  await p.goto('http://localhost:5180/#/pagina/alunos', { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(4000)
  console.log(await p.evaluate(() => JSON.stringify([...document.querySelectorAll('.border-badge')].map((el) => ({
    inline: el.getAttribute('style'), bg: getComputedStyle(el).backgroundColor,
    pai: el.parentElement?.className?.toString().slice(0, 40),
  })), null, 1)))
  await b.close()
})()
