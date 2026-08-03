/**
 * "De onde vem essa cor?" — sem CDP.
 *
 * Varre as CSSRules do documento e devolve, para cada elemento pedido, as regras
 * que casam com ele e declaram a propriedade. Substitui o diag-regra (o
 * DOM.getDocument do CDP passou a devolver nodeId inválido nesta versão).
 *
 *   node diagnostico/diag-origem.cjs <pagina> "<seletor>|<prop>" ["<seletor>|<prop>" …]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const pagina = process.argv[2]
const alvos = process.argv.slice(3).map((a) => {
  const [seletor, prop] = a.split('|')
  return { seletor, prop: prop || 'color' }
})
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
  await p.goto(`http://localhost:4173/#/pagina/${pagina}`, { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForTimeout(5000)
  const saida = await p.evaluate((alvos) => {
    const regras = []
    for (const ss of document.styleSheets) {
      let rs
      try { rs = ss.cssRules } catch { continue }
      const anda = (lista, media) => {
        for (const r of lista) {
          if (r.cssRules) { anda(r.cssRules, r.conditionText || media); continue }
          if (r.selectorText) regras.push({ sel: r.selectorText, style: r.style, media, href: ss.href || '(inline)' })
        }
      }
      anda(rs, '')
    }
    return alvos.map(({ seletor, prop }) => {
      const el = document.querySelector('.cheia__palco ' + seletor) || document.querySelector(seletor)
      if (!el) return { seletor, prop, erro: 'elemento não encontrado' }
      const casam = []
      for (const r of regras) {
        let bate = false
        for (const parte of r.sel.split(',')) {
          try { if (el.matches(parte.trim().replace(/::?(before|after|hover|focus|active)[^\s]*/g, ''))) { bate = true; break } } catch {}
        }
        if (!bate) continue
        const v = r.style.getPropertyValue(prop)
        if (v) casam.push({ sel: r.sel, valor: v + (r.style.getPropertyPriority(prop) ? ' !important' : ''), arquivo: (r.href || '').split('/').pop(), media: r.media })
      }
      const inline = el.style.getPropertyValue(prop)
      return {
        seletor, prop,
        computado: getComputedStyle(el)[prop === 'background-color' ? 'backgroundColor' : prop === 'border-top-color' ? 'borderTopColor' : prop],
        inline: inline || null,
        classes: el.className,
        pai: el.parentElement ? el.parentElement.tagName.toLowerCase() + '.' + String(el.parentElement.className).slice(0, 40) : '',
        regras: casam.slice(-6),
      }
    })
  }, alvos)
  saida.forEach((s) => {
    console.log(`\n### ${s.seletor}  {${s.prop}}  → ${s.computado || s.erro || ''}`)
    if (s.classes) console.log(`   classes: ${s.classes}`)
    if (s.pai) console.log(`   pai: ${s.pai}`)
    if (s.inline) console.log(`   INLINE: ${s.inline}`)
    ;(s.regras || []).forEach((r) => console.log(`   ${r.arquivo || ''} ${r.media ? '@' + r.media : ''}  ${r.sel}  →  ${r.valor}`))
  })
  await b.close()
})()
