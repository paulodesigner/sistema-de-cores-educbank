/**
 * Auditoria de PAPEL ponta a ponta — os quatro eixos, um só critério.
 *
 *   1 · páginas em repouso
 *   2 · páginas em interação (hover de linha, foco por teclado, filtro aberto)
 *   3 · os 108 componentes reais, um por um
 *   4 · componentes que só mostram cor quando ABERTOS (calendário, select, popover)
 *
 * O critério mora em lib-papel.cjs. Antes cada auditor tinha o seu, e o mais
 * frouxo (só "o hex está na paleta?") deixou passar a etiqueta com texto no tom
 * Vivid a 1,95:1.
 *
 *   node auditar-papel-total.cjs [base] [eixo]
 *   eixo: paginas | interacao | componentes | abertos | (vazio = todos)
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')
const { medirPapeis } = require('./lib-papel.cjs')

const BASE = process.argv[2] || 'http://localhost:4173'
const EIXO = process.argv[3] || ''
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta
const PAGINAS = fs.readFileSync(path.join(__dirname, 'src/registry/paginas.ts'), 'utf8')
  .match(/id: '([^']+)'/g).map((m) => m.match(/'([^']+)'/)[1])
const COMPONENTES = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))
  .map((c) => c.id)
/* Raízes: o palco + o que o Teleport joga no body (dropdown, modal, calendário
   vivem fora da árvore do componente e escapariam da varredura). */
const RAIZES = ['.cheia__palco', '.palco', 'body > div:not(#app)']
const SEM_TRANSICAO = '*,*::before,*::after{transition:none!important;animation:none!important}'

const achados = { paginas: {}, interacao: {}, componentes: {}, abertos: {} }
const conta = (o) => Object.values(o).flat().length

async function medir(p) {
  return await p.evaluate(medirPapeis, { paleta, raizes: RAIZES })
}

;(async () => {
  const b = await chromium.launch()
  const roda = (e) => !EIXO || EIXO === e

  // ── 1 · páginas em repouso
  if (roda('paginas')) {
    console.log('\n══ 1 · páginas em repouso')
    for (const id of PAGINAS) {
      const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
      await p.goto(`${BASE}/#/pagina/${id}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
      await p.waitForTimeout(5000)
      await p.addStyleTag({ content: SEM_TRANSICAO })
      const r = await medir(p)
      achados.paginas[id] = r
      console.log(`   ${id.padEnd(12)} ${r.length ? r.length + ' achado(s)' : 'ok'}`)
      r.slice(0, 6).forEach((x) => console.log(`      [${x.tipo}] ${x.detalhe} · ${x.onde}`))
      await p.close()
    }
  }

  // ── 2 · páginas em interação
  if (roda('interacao')) {
    console.log('\n══ 2 · páginas em interação')
    for (const id of PAGINAS) {
      const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
      await p.goto(`${BASE}/#/pagina/${id}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
      await p.waitForTimeout(5000)
      await p.addStyleTag({ content: SEM_TRANSICAO })
      const juntos = []
      /* hover em linha de tabela, cartão e botão */
      for (const sel of ['.cheia__palco tbody tr', '.cheia__palco .tabulator-row', '.cheia__palco .funnel-card',
        '.cheia__palco button:not([disabled])', '.cheia__palco a[href]']) {
        try {
          const el = await p.$(sel)
          if (!el) continue
          await el.hover({ timeout: 1500 })
          await p.waitForTimeout(250)
          juntos.push(...await medir(p))
        } catch {}
      }
      /* foco por teclado — onde vivem os anéis */
      for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(90) }
      juntos.push(...await medir(p))
      /* abre o primeiro filtro/menu da página */
      for (const sel of ['.cheia__palco .filter-button', '.cheia__palco .eds-select__field',
        '.cheia__palco [class*="drop"] button', '.cheia__palco .btn-filter']) {
        try {
          const el = await p.$(sel)
          if (!el) continue
          await el.click({ timeout: 1500 })
          await p.waitForTimeout(700)
          juntos.push(...await medir(p))
          break
        } catch {}
      }
      const unico = [...new Map(juntos.map((x) => [x.tipo + x.detalhe, x])).values()]
      achados.interacao[id] = unico
      console.log(`   ${id.padEnd(12)} ${unico.length ? unico.length + ' achado(s)' : 'ok'}`)
      unico.slice(0, 6).forEach((x) => console.log(`      [${x.tipo}] ${x.detalhe} · ${x.onde}`))
      await p.close()
    }
  }

  // ── 3 · os 108 componentes
  if (roda('componentes')) {
    console.log(`\n══ 3 · componentes (${COMPONENTES.length})`)
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    for (const id of COMPONENTES) {
      await p.goto(`${BASE}/#/doc/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
      await p.waitForTimeout(700)
      await p.addStyleTag({ content: SEM_TRANSICAO }).catch(() => {})
      const r = await medir(p).catch(() => [])
      if (r.length) {
        achados.componentes[id] = r
        console.log(`   ${id}: ${r.length}`)
        r.slice(0, 4).forEach((x) => console.log(`      [${x.tipo}] ${x.detalhe} · ${x.onde}`))
      }
    }
    console.log(`   com achado: ${Object.keys(achados.componentes).length} de ${COMPONENTES.length}`)
    await p.close()
  }

  // ── 4 · estados abertos
  if (roda('abertos')) {
    console.log('\n══ 4 · estados abertos')
    const CASOS = [
      ['athinputdatepicker', 'input'], ['athinputyearpicker', 'input'],
      ['athinputmonthyearpicker', 'input'], ['athinputrangepicker', 'input'],
      ['edsinputselect', '.eds-select__field'], ['athpopover', 'button'],
      ['athdropbutton', 'button'], ['navsearch', 'input'],
      ['athmodal', 'button'], ['athmodalcenter', 'button'],
    ]
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    for (const [id, gatilho] of CASOS) {
      await p.goto(`${BASE}/#/doc/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
      await p.waitForTimeout(700)
      try { await p.click(`.palco ${gatilho}`, { timeout: 1800 }) } catch {}
      await p.waitForTimeout(900)
      await p.addStyleTag({ content: SEM_TRANSICAO }).catch(() => {})
      const r = await medir(p).catch(() => [])
      if (r.length) {
        achados.abertos[id] = r
        console.log(`   ${id}: ${r.length}`)
        r.slice(0, 5).forEach((x) => console.log(`      [${x.tipo}] ${x.detalhe} · ${x.onde}`))
      } else console.log(`   ${id}: ok`)
    }
    await p.close()
  }

  fs.writeFileSync(path.join(__dirname, 'auditoria-papel-total.json'), JSON.stringify(achados, null, 1))
  console.log('\n══════ resumo')
  Object.entries(achados).forEach(([k, v]) => console.log(`   ${k.padEnd(13)} ${conta(v)}`))
  console.log(`   TOTAL         ${Object.values(achados).map(conta).reduce((a, x) => a + x, 0)}`)
  await b.close()
})()
