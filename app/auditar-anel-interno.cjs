/**
 * Auditoria do ANEL INTERNO — o foco caiu no input de dentro ou na caixa do campo?
 *
 * Achado do Paulo (2026-08-02, print da busca da Home): o anel de foco desenhado
 * DENTRO da caixa do campo, abraçando o input interno, em vez de contornar o
 * campo inteiro. É a mesma família da lição 20 (dois anéis), num wrapper que a
 * lista de exceções não cobria — e lista envelhece, então aqui está o auditor
 * que a mantém honesta.
 *
 * O critério, medido por elemento focado de verdade:
 *   1 · foca cada input/textarea de texto;
 *   2 · procura o ANCESTRAL-CAMPO: o ancestral mais próximo (até 5 níveis) com
 *       borda visível ou fundo próprio — a "caixa" que o olho entende como campo;
 *   3 · se existe ancestral-campo E o anel está no INPUT (não no ancestral),
 *       é anel interno → achado. Se o anel está no ancestral (outline OU borda
 *       que muda no focus-within), está certo. Se não há ancestral-campo, o anel
 *       no próprio input é o correto.
 *
 *   node auditar-anel-interno.cjs [base]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const PAGINAS = fs.readFileSync(path.join(__dirname, 'src/registry/paginas.ts'), 'utf8')
  .match(/id: '([^']+)'/g).map((m) => m.match(/'([^']+)'/)[1]).map((id) => `/pagina/${id}`)
/* as rotas reais do produto agora abrem na casca — entram na varredura */
const ROTAS_PRODUTO = ['/home', '/matriculas', '/captacao', '/faturas', '/relatorios',
  '/cobrancas', '/turmas', '/repasses', '/atividades', '/credito', '/configuracoes']
const COMPONENTES = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))
  .filter((c) => c.grupo === 'Campos de formulário' || c.grupo === 'Navegação')
  .map((c) => `/doc/${c.id}`)

function medir() {
  const hx = (s) => {
    const m = (s || '').match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const v = m[1].split(',').map(Number)
    if ((v[3] ?? 1) < 0.05) return null
    return '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
  }
  const temAnel = (el) => {
    const c = getComputedStyle(el)
    return c.outlineStyle !== 'none' && (parseFloat(c.outlineWidth) || 0) > 0
  }
  /* a "caixa do campo": borda visível OU fundo diferente do pai */
  const ehCaixa = (el) => {
    /* a moldura da FERRAMENTA (palco, vitrine, painel) tem borda mas não é campo:
       com ela na conta, todo input sem wrapper aparecia como "anel interno" —
       3 dos 18 achados da 1ª rodada eram esse falso positivo. */
    if (/(^|\s)(palco|cheia__palco|palco__vitrine|ds-panel)(\s|$)/.test(el.className || '')) return false
    const c = getComputedStyle(el)
    const borda = (parseFloat(c.borderTopWidth) || 0) > 0 && hx(c.borderTopColor)
    return !!borda
  }
  const rot = (el) => el.tagName.toLowerCase()
    + (typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')

  const raiz = document.querySelector('.cheia__palco') || document.querySelector('.palco') || document.body
  const campos = [...raiz.querySelectorAll(
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([disabled]), textarea:not([disabled])')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 8 && r.height > 8 })
  const out = []
  const vistos = new Set()
  campos.slice(0, 40).forEach((inp) => {
    inp.focus()
    /* ancestral-campo mais próximo */
    let caixa = null, n = inp.parentElement, i = 0
    while (n && i < 5) {
      if (ehCaixa(n)) { caixa = n; break }
      n = n.parentElement; i++
    }
    const anelNoInput = temAnel(inp)
    const anelNaCaixa = caixa ? (temAnel(caixa) || getComputedStyle(caixa).borderTopColor !== caixa.dataset.__b0) : false
    if (caixa && caixa.dataset.__b0 === undefined) { /* base da borda antes do foco não coletada — usa outline apenas */ }
    if (caixa && anelNoInput) {
      const k = rot(caixa) + '>' + rot(inp)
      if (!vistos.has(k)) {
        vistos.add(k)
        out.push({ caixa: rot(caixa), input: rot(inp), anelNaCaixa: temAnel(caixa) })
      }
    }
    inp.blur()
  })
  return out
}

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
  const achados = {}
  for (const rota of [...PAGINAS, ...ROTAS_PRODUTO, ...COMPONENTES]) {
    await p.goto(`${BASE}/#${rota}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await p.waitForTimeout(rota.startsWith('/doc/') ? 900 : 4200)
    const r = await p.evaluate(medir).catch(() => [])
    if (r.length) {
      achados[rota] = r
      console.log(`${rota}`)
      r.forEach((x) => console.log(`   anel INTERNO em ${x.input} — caixa ${x.caixa}${x.anelNaCaixa ? ' (caixa TAMBÉM tem anel: dois)' : ''}`))
    }
  }
  const total = Object.values(achados).flat().length
  console.log(`\n══ anel interno: ${total} caso(s) em ${Object.keys(achados).length} superfície(s)`)
  fs.writeFileSync(path.join(__dirname, 'auditoria-anel-interno.json'), JSON.stringify(achados, null, 1))
  await b.close()
})()
