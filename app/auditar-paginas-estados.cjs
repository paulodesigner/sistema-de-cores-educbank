/* ATENÇÃO: este auditor só pergunta "o hex pertence à paleta?". Foi esse critério
   frouxo que deixou passar a etiqueta com texto no tom Vivid (1,95:1). O auditor
   CANÔNICO é `auditar-papel-total.cjs`, que pergunta se o token é o certo PARA O
   PAPEL e mede contraste. Use este só para conferir pertencimento. */
/** Audita as páginas em ESTADO INTERATIVO — hover de linha, foco por teclado,
 *  dropdown de filtro aberto e modal. A auditoria em repouso não vê nada disso,
 *  e é justamente onde vivem os tokens Hover/Pressed/Focus. */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')
const BASE = process.argv[2] || 'http://localhost:4173'
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta
const IDS = fs.readFileSync(path.join(__dirname, 'src/registry/paginas.ts'), 'utf8')
  .match(/id: '([^']+)'/g).map((m) => m.match(/'([^']+)'/)[1])

async function medir(p, rotulo) {
  return await p.evaluate((pal) => {
    const P = new Set(pal.map((x) => x.hex.toLowerCase()))
    const hexDe = (s) => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null
      const v = m[1].split(',').map(Number); if ((v[3] ?? 1) < 0.95) return null
      return '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('') }
    const fora = {}
    /* inclui o que foi teleportado para o body (dropdown, modal, calendário) */
    const raizes = [document.querySelector('.cheia__palco'), ...document.querySelectorAll('body > div:not(#app)')].filter(Boolean)
    raizes.forEach((raiz) => {
      ;[raiz, ...raiz.querySelectorAll('*')].forEach((el) => {
        const cs = getComputedStyle(el), rr = el.getBoundingClientRect()
        if (rr.width < 1 || rr.height < 1) return
        const ver = (prop, val, exigeTexto) => {
          const h = hexDe(val); if (!h || P.has(h)) return
          if (exigeTexto && !(el.textContent || '').trim() && el.tagName !== 'svg' && el.tagName !== 'path') return
          const k = `${h}(${prop}) em ${el.tagName.toLowerCase()}.${(el.className || '').toString().trim().split(/\s+/)[0] || ''}`
          fora[k] = (fora[k] || 0) + 1
        }
        ver('bg', cs.backgroundColor, false); ver('cor', cs.color, true)
        if (parseFloat(cs.borderTopWidth) > 0) ver('borda', cs.borderTopColor, false)
        if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ver('anel', cs.outlineColor, false)
      })
    })
    return Object.keys(fora)
  }, paleta)
}

;(async () => {
  const b = await chromium.launch()
  for (const id of IDS) {
    const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
    await p.goto(`${BASE}/#/pagina/${id}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await p.waitForTimeout(3800)
    /* Desliga transição e animação: medir no meio de uma transição de cor devolve
       um valor INTERMEDIÁRIO e reporta desvio onde não existe (o anel do
       EdsButton apareceu como #5544ab e #5846ae, indo para o #5644AD correto). */
    await p.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' })
    await p.waitForTimeout(300)
    const achados = {}
    const guardar = (estado, lista) => { if (lista.length) achados[estado] = lista }

    // hover em linha de tabela / cartão
    const alvoHover = await p.$('tbody tr, .kanban-card, .card-navigator, [class*="row"]')
    if (alvoHover) { await alvoHover.hover(); await p.waitForTimeout(500); guardar('hover', await medir(p)) }

    // foco por teclado (3 tabs)
    for (let i = 0; i < 3; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(180) }
    guardar('foco', await medir(p))

    // primeiro botão/filtro clicável que abre algo
    for (const sel of ['button[class*="filter"]', '[class*="drop"] button', 'button', '.form-select']) {
      const el = await p.$(`.cheia__palco ${sel}`)
      if (!el) continue
      await el.click({ timeout: 1500 }).catch(() => {})
      await p.waitForTimeout(900)
      guardar('após clique', await medir(p))
      break
    }

    const total = Object.values(achados).flat()
    console.log(`### ${id.padEnd(11)} ${total.length ? 'FORA DA PALETA' : 'tudo na paleta'}`)
    Object.entries(achados).forEach(([estado, lista]) => {
      if (lista.length) console.log(`   ${estado}: ${[...new Set(lista)].slice(0, 4).join(' | ')}`)
    })
    await p.close()
  }
  await b.close()
})()
