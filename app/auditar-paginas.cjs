/* ATENÇÃO: este auditor só pergunta "o hex pertence à paleta?". Foi esse critério
   frouxo que deixou passar a etiqueta com texto no tom Vivid (1,95:1). O auditor
   CANÔNICO é `auditar-papel-total.cjs`, que pergunta se o token é o certo PARA O
   PAPEL e mede contraste. Use este só para conferir pertencimento. */
/** Roda o ciclo em TODAS as páginas registradas: monta, mede cor, reporta. */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')
const BASE = process.argv[2] || 'http://localhost:4173'
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta
const IDS = fs.readFileSync(path.join(__dirname, 'src/registry/paginas.ts'), 'utf8')
  .match(/id: '([^']+)'/g).map((m) => m.match(/'([^']+)'/)[1])
;(async () => {
  const b = await chromium.launch()
  for (const id of IDS) {
    const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message.slice(0, 110)))
    await p.goto(`${BASE}/#/pagina/${id}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await p.waitForTimeout(4000)
    const r = await p.evaluate((pal) => {
      const P = new Set(pal.map((x) => x.hex.toLowerCase()))
      const hexDe = (s) => { const m = (s||'').match(/rgba?\(([^)]+)\)/); if (!m) return null
        const v = m[1].split(',').map(Number); if ((v[3] ?? 1) < 0.95) return null
        return '#' + v.slice(0,3).map(x => Math.round(x).toString(16).padStart(2,'0')).join('') }
      /* Inclui o SHELL: a sidebar e a top bar são o que mais aparece na tela e
         têm cores próprias — auditar só o conteúdo deixava metade de fora. */
      const palco = document.querySelector('.cheia__palco')
      const erroVisivel = document.querySelector('.cheia__erro')
      const fora = {}
      let elementos = 0
      ;[palco, ...(palco?.querySelectorAll('*') || [])].forEach((el) => {
        if (!el) return
        const cs = getComputedStyle(el), rr = el.getBoundingClientRect()
        if (rr.width < 1 || rr.height < 1) return
        elementos++
        const ver = (prop, val, exigeTexto) => {
          const h = hexDe(val); if (!h || P.has(h)) return
          if (exigeTexto && !(el.textContent || '').trim() && el.tagName !== 'svg' && el.tagName !== 'path') return
          const k = `${h}(${prop})`
          fora[k] = fora[k] || { n: 0, ex: new Set() }
          fora[k].n++
          if (fora[k].ex.size < 2) fora[k].ex.add(el.tagName.toLowerCase() + '.' + (el.className||'').toString().trim().split(/\s+/).slice(0,2).join('.'))
        }
        ver('bg', cs.backgroundColor, false); ver('cor', cs.color, true)
        if (parseFloat(cs.borderTopWidth) > 0) ver('borda', cs.borderTopColor, false)
        if (parseFloat(cs.borderLeftWidth) > 0) ver('borda', cs.borderLeftColor, false)
      })
      return { elementos, erroVisivel: erroVisivel ? (erroVisivel.textContent || '').trim().slice(0, 120) : null,
        texto: (palco?.innerText || '').replace(/\s+/g, ' ').slice(0, 90),
        fora: Object.entries(fora).map(([k, v]) => `${k} ${v.n}x [${[...v.ex].join(' ')}]`) }
    }, paleta)
    const status = r.erroVisivel ? 'NÃO MONTOU' : r.elementos > 40 ? 'ok' : 'quase vazia'
    console.log(`\n### ${id}  ${status}  (${r.elementos} elementos)`)
    if (r.erroVisivel) console.log('   erro:', r.erroVisivel)
    else console.log('   conteúdo:', r.texto)
    console.log('   fora da paleta:', r.fora.length ? r.fora.join(' | ') : 'nenhum')
    if (erros.length) console.log('   console:', [...new Set(erros)].slice(0, 2).join(' | '))
    await p.close()
  }
  await b.close()
})()
