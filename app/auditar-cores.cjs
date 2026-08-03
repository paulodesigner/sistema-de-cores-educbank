/* ATENÇÃO: este auditor só pergunta "o hex pertence à paleta?". Foi esse critério
   frouxo que deixou passar a etiqueta com texto no tom Vivid (1,95:1). O auditor
   CANÔNICO é `auditar-papel-total.cjs`, que pergunta se o token é o certo PARA O
   PAPEL e mede contraste. Use este só para conferir pertencimento. */
/**
 * Auditoria de cor dos COMPONENTES REAIS renderizados.
 *
 * Percorre cada componente do registry no app vivo, lê a cor efetiva de todo
 * elemento (getComputedStyle) e classifica contra a paleta do padrão. O que
 * sobra fora da paleta é falta de aplicação — e o relatório diz onde.
 *
 *   node auditar-cores.cjs [http://localhost:5180]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.argv[2] || 'http://localhost:5180'
const reg = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(`${BASE}/#/doc/fundamentos`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(1500)
  await p.evaluate((pal) => {
    window.__PALETA = new Set(pal.map((x) => x.hex.toLowerCase()))
    window.__NOME = Object.fromEntries(pal.map((x) => [x.hex.toLowerCase(), x.nome]))
  }, paleta)

  const achados = []
  for (const c of reg) {
    if (!c.arquivo) continue
    await p.goto(`${BASE}/#/doc/${c.id}`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(320)
    const r = await p.evaluate((id) => {
      const palco = document.querySelector('.palco')
      if (!palco || palco.querySelector('.palco__erro')) return null
      const hexDe = (s) => {
        if (!s) return null
        const m = s.match(/rgba?\(([^)]+)\)/)
        if (!m) return null
        const v = m[1].split(',').map((x) => parseFloat(x.trim()))
        const a = v.length > 3 ? v[3] : 1
        if (a === 0) return null
        if (a < 0.95) return { alpha: true, valor: s }
        return { alpha: false, valor: '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('') }
      }
      const fora = []
      const dentro = new Set()
      const alvos = [palco, ...palco.querySelectorAll('*')]
      alvos.forEach((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) return
        const prop = (nome, valor, exigeTexto) => {
          const h = hexDe(valor)
          if (!h || h.alpha) return
          if (exigeTexto && !(el.textContent || '').trim() && !['svg', 'use', 'path'].includes(el.tagName.toLowerCase())) return
          if (window.__PALETA.has(h.valor)) { dentro.add(h.valor); return }
          fora.push({
            hex: h.valor,
            prop: nome,
            el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
          })
        }
        prop('background', cs.backgroundColor, false)
        prop('color', cs.color, true)
        if (parseFloat(cs.borderTopWidth) > 0) prop('border', cs.borderTopColor, false)
        if (parseFloat(cs.borderLeftWidth) > 0) prop('border', cs.borderLeftColor, false)
        if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) prop('outline', cs.outlineColor, false)
        if (cs.accentColor && cs.accentColor !== 'auto') prop('accent', cs.accentColor, false)
      })
      return { fora, dentro: [...dentro] }
    }, c.id)
    if (!r) continue
    achados.push({ id: c.id, titulo: c.titulo, grupo: c.grupo, fora: r.fora, dentro: r.dentro })
  }

  // ── agrega ────────────────────────────────────────────────────────────────
  const porHex = {}
  achados.forEach((a) =>
    a.fora.forEach((f) => {
      const k = f.hex
      porHex[k] = porHex[k] || { hex: k, ocorrencias: 0, componentes: new Set(), props: new Set(), exemplos: new Set() }
      porHex[k].ocorrencias++
      porHex[k].componentes.add(a.titulo)
      porHex[k].props.add(f.prop)
      if (porHex[k].exemplos.size < 3) porHex[k].exemplos.add(f.el)
    })
  )
  const lista = Object.values(porHex)
    .map((x) => ({ ...x, componentes: [...x.componentes], props: [...x.props], exemplos: [...x.exemplos] }))
    .sort((a, b) => b.componentes.length - a.componentes.length)

  const limpos = achados.filter((a) => !a.fora.length)
  console.log(`componentes auditados: ${achados.length}`)
  console.log(`100% na paleta: ${limpos.length}  ·  com cor fora da paleta: ${achados.length - limpos.length}`)
  console.log(`\nvalores fora da paleta (${lista.length}):`)
  lista.forEach((x) => {
    console.log(
      `  ${x.hex}  em ${String(x.componentes.length).padStart(3)} componentes  [${x.props.join(',')}]  ex: ${x.exemplos.join(' ')}`
    )
  })
  console.log('\ncomponentes com mais valores fora:')
  achados
    .slice()
    .sort((a, b) => b.fora.length - a.fora.length)
    .slice(0, 12)
    .forEach((a) => console.log(`  ${a.titulo.padEnd(34)} ${a.fora.length} ocorrências · ${[...new Set(a.fora.map((f) => f.hex))].join(' ')}`))

  fs.writeFileSync(path.join(__dirname, 'auditoria-cores.json'), JSON.stringify({ achados, lista }, null, 1))
  await b.close()
})()
