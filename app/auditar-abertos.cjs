/* ATENÇÃO: este auditor só pergunta "o hex pertence à paleta?". Foi esse critério
   frouxo que deixou passar a etiqueta com texto no tom Vivid (1,95:1). O auditor
   CANÔNICO é `auditar-papel-total.cjs`, que pergunta se o token é o certo PARA O
   PAPEL e mede contraste. Use este só para conferir pertencimento. */
/** Audita os componentes que só mostram sua cor quando ABERTOS: calendário,
 *  dropdown de select, popover, árvore. O estado fechado não revela nada. */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')
const BASE = process.argv[2] || 'http://localhost:5180'
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta
const CASOS = [
  ['athinputdatepicker', '.palco input, .palco .dp__input_wrap, .palco .box'],
  ['athinputyearpicker', '.palco input, .palco .box'],
  ['athinputmonthyearpicker', '.palco input, .palco .box'],
  ['athinputrangepicker', '.palco input, .palco .box'],
  ['edsinputselect', '.palco .eds-select__field, .palco .box, .palco input'],
  ['athpopover', '.palco button, .palco .drop__container'],
  ['athdropbutton', '.palco button'],
  ['navsearch', '.palco input'],
]
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(`${BASE}/#/doc/fundamentos`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.evaluate((pal) => { window.__P = new Set(pal.map((x) => x.hex.toLowerCase())) }, paleta)
  for (const [id, gatilho] of CASOS) {
    await p.goto(`${BASE}/#/doc/${id}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(600)
    try { await p.click(gatilho.split(',')[0].trim(), { timeout: 1500 }) } catch { try { await p.click(gatilho.split(',')[1]?.trim() || 'x', { timeout: 1000 }) } catch {} }
    await p.waitForTimeout(900)
    const r = await p.evaluate(() => {
      const hexDe = (s) => { const m = (s||'').match(/rgba?\(([^)]+)\)/); if (!m) return null
        const v = m[1].split(',').map(Number); if ((v[3] ?? 1) < 0.95) return null
        return '#' + v.slice(0,3).map(x => Math.round(x).toString(16).padStart(2,'0')).join('') }
      const fora = {}
      let abertos = 0
      document.querySelectorAll('.dp__menu, .dp__outer_menu_wrap, .drop__container.active, .popover-simple-drop-box.active, .multiselect-dropdown, [class*="menu"]:not([hidden])').forEach((menu) => {
        const r0 = menu.getBoundingClientRect(); if (r0.width < 30 || r0.height < 30) return
        abertos++
        ;[menu, ...menu.querySelectorAll('*')].forEach((el) => {
          const cs = getComputedStyle(el); const rr = el.getBoundingClientRect()
          if (rr.width < 1 || rr.height < 1) return
          ;[['background', cs.backgroundColor], ['color', cs.color], ['border', parseFloat(cs.borderTopWidth) > 0 ? cs.borderTopColor : null]].forEach(([prop, val]) => {
            const h = hexDe(val); if (!h || window.__P.has(h)) return
            const k = h + ' ' + prop
            fora[k] = (fora[k] || 0) + 1
          })
        })
      })
      return { abertos, fora }
    })
    console.log(`${id.padEnd(26)} menus abertos: ${r.abertos}  fora da paleta: ${Object.keys(r.fora).length ? JSON.stringify(r.fora) : 'nenhum'}`)
  }
  await b.close()
})()
