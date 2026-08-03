/** Usa o CDP para dizer QUAL regra CSS pinta um elemento — a única forma de
 *  achar a origem quando a cor não vem de variável nem de style inline. */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const [pagina, seletor, prop] = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
  await p.goto(`http://localhost:4173/#/pagina/${pagina}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(4000)
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: seletor })
  if (!nodeId) { console.log('não achei', seletor); await b.close(); return }
  const m = await cdp.send('CSS.getMatchedStylesForNode', { nodeId })
  const relevantes = []
  ;(m.matchedCSSRules || []).forEach((r) => {
    const decl = (r.rule.style?.cssProperties || []).filter((x) => x.name === prop || x.name === 'color')
    if (decl.length) relevantes.push({ seletor: r.rule.selectorList.text, valores: decl.map((d) => `${d.name}: ${d.value}`), origem: r.rule.origin })
  })
  if (m.inlineStyle) {
    const d = (m.inlineStyle.cssProperties || []).filter((x) => x.name === prop)
    if (d.length) relevantes.push({ seletor: '(style inline)', valores: d.map((x) => `${x.name}: ${x.value}`) })
  }
  console.log(`### ${seletor} (${prop})`)
  relevantes.slice(-8).forEach((r) => console.log('  ', r.seletor, '→', r.valores.join('; ')))
  const herdado = (m.inherited || []).flatMap((h) => (h.matchedCSSRules || []).map((r) => ({ s: r.rule.selectorList.text, v: (r.rule.style?.cssProperties || []).filter((x) => x.name === 'color').map((x) => x.value) }))).filter((x) => x.v.length)
  if (herdado.length) console.log('   herdado de:', herdado.slice(-4).map((h) => `${h.s} → ${h.v.join(',')}`).join(' | '))
  await b.close()
})()
