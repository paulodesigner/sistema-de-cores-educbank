/**
 * Auditoria do ANEL DE FOCO — um elemento focável por vez, todos eles.
 *
 * Por que existe: a auditoria de regras (R2) media o anel de **um** elemento — o
 * que estivesse focado depois de 8 Tabs — e dizia "ok". O Paulo achou o furo
 * olhando a tela: o botão primário roxo, focado por teclado, mostra um anel
 * escuro colado no preenchimento. Está documentado na Parte 2 da spec desde
 * 2026-07-31, com medida: `EdsButton.vue:136-140` usa
 * `outline: 3px solid var(--border-focus)` e `outline-offset: 0px` — #5644AD
 * sobre #6B55D8 = **1,4:1**, e no hover (#5644AD) = **1,00:1, invisível**.
 *
 * A regra do sistema tem TRÊS partes, e a minha correção anterior aplicou uma:
 *   1. vizinhança CLARA        → Border/Focus (#5644AD)
 *   2. vizinhança PREENCHIDA   → Border/Inverse (#F2F2F2) — 4,79:1 no roxo
 *   3. sempre com AFASTAMENTO  → o anel colado no fill se confunde com a borda
 *
 * Aqui cada elemento focável é focado de fato (`el.focus()`), e do anel se mede:
 * existência, cor, contraste contra o fundo EFETIVO do próprio elemento, e o
 * afastamento.
 *
 *   node auditar-foco.cjs [base]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const PAGINAS = fs.readFileSync(path.join(__dirname, 'src/registry/paginas.ts'), 'utf8')
  .match(/id: '([^']+)'/g).map((m) => m.match(/'([^']+)'/)[1])
const COMPONENTES = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))
  .map((c) => c.id)

/* Função REAL, não string: `page.evaluate` com uma string avalia a expressão e
   IGNORA o argumento — o retorno vinha `undefined` e o script quebrava na
   primeira página. Serializada pelo Playwright, ela roda no navegador. */
function medirFoco(raizSel) {
  const hx = (s) => {
    const m = (s || '').match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const v = m[1].split(',').map(Number)
    if ((v[3] ?? 1) < 0.05) return 'transparente'
    return '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
  }
  const lum = (h) => {
    if (!h || h[0] !== '#') return null
    h = h.slice(1)
    const c = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const raz = (a, b) => {
    const x = lum(a), y = lum(b)
    if (x === null || y === null) return null
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }
  /* fundo do PRÓPRIO elemento; se transparente, sobe até achar opaco */
  const fundoDe = (el) => {
    let n = el
    while (n && n !== document.documentElement) {
      const c = hx(getComputedStyle(n).backgroundColor)
      if (c && c !== 'transparente') return c
      n = n.parentElement
    }
    return '#ffffff'
  }

  const raiz = document.querySelector(raizSel)
  if (!raiz) return { total: 0, achados: [] }
  const FOCAVEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  const alvos = [...raiz.querySelectorAll(FOCAVEL)].filter((e) => {
    const r = e.getBoundingClientRect()
    return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'
  })
  const out = []
  const vistos = new Set()
  alvos.slice(0, 60).forEach((el) => {
    el.focus()
    const cs = getComputedStyle(el)
    const larg = parseFloat(cs.outlineWidth) || 0
    const temAnel = cs.outlineStyle !== 'none' && larg > 0
    const sombra = cs.boxShadow && cs.boxShadow !== 'none'
    const fundo = fundoDe(el)
    const lf = lum(fundo)
    /* PREENCHIDO: o fundo do próprio elemento é escuro o bastante para um anel
       escuro se perder nele — é o caso do botão primário roxo. */
    const preenchido = lf !== null && lf < 0.55
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
    const rot = el.tagName.toLowerCase() + cls
    const guarda = (tipo, detalhe) => {
      const k = tipo + '|' + detalhe
      if (vistos.has(k)) return
      vistos.add(k)
      out.push({ tipo, detalhe, onde: rot })
    }
    /* A indicação de foco pode estar no CONTÊINER, não no elemento focável — é o
       padrão dos campos compostos do produto (`AthInputThemeDefault.vue:86-90`
       usa `:focus-within` no wrapper, com borda e anel). A 1ª versão desta
       auditoria olhava só o elemento e reportou 18 campos "sem anel"; eu
       "corrigi" pondo anel no input e o resultado foram DOIS anéis concêntricos,
       que o Paulo viu na tela. Agora a cadeia de ancestrais é consultada. */
    const indicadoNoPai = (() => {
      let n = el.parentElement
      let saltos = 0
      /* 6 níveis, não 4: nos datepickers o wrapper que indica o foco
         (`.ath-base-input`) está no 5º ancestral, e com a janela em 4 eles
         apareciam como "sem anel" — falso positivo. */
      while (n && saltos < 6) {
        const c = getComputedStyle(n)
        const anel = c.outlineStyle !== 'none' && (parseFloat(c.outlineWidth) || 0) > 0
        const sombraPai = c.boxShadow && c.boxShadow !== 'none'
        if (anel || sombraPai) return true
        n = n.parentElement
        saltos++
      }
      return false
    })()
    if (!temAnel && !sombra) {
      if (!indicadoNoPai) guarda('sem-anel', 'nenhum anel nem sombra ao focar, nem no contêiner')
      el.blur(); return
    }
    if (!temAnel && sombra) { guarda('glow', 'só box-shadow difuso, sem anel definido'); el.blur(); return }
    const cor = hx(cs.outlineColor)
    const r = raz(cor, fundo)
    const off = parseFloat(cs.outlineOffset) || 0
    if (r !== null && r < 3) {
      guarda('contraste', `${cor} sobre ${fundo} = ${r.toFixed(2)}:1 (piso 3)`
        + (preenchido ? ' — fundo PREENCHIDO, o anel devia ser claro' : ''))
    }
    if (off < 1) {
      guarda('sem-afastamento', `outline-offset ${off}px — anel colado`
        + (preenchido ? ' no preenchimento' : ''))
    }
    el.blur()
  })
  return { total: alvos.length, achados: out }
}

;(async () => {
  const b = await chromium.launch()
  const tudo = { paginas: {}, componentes: {} }

  console.log('══ 1 · páginas (todos os focáveis, um por um)')
  for (const id of PAGINAS) {
    const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
    await p.goto(`${BASE}/#/pagina/${id}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await p.waitForTimeout(5500)
    await p.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }).catch(() => {})
    const r = await p.evaluate(medirFoco, '.cheia__palco').catch(() => ({ achados: [] }))
    tudo.paginas[id] = r.achados || []
    console.log(`   ${id.padEnd(11)} ${r.total || 0} focáveis · ${(r.achados || []).length || 'nenhum'} achado(s)`)
    ;(r.achados || []).slice(0, 6).forEach((a) => console.log(`      [${a.tipo}] ${a.detalhe} · ${a.onde}`))
    await p.close()
  }

  console.log('\n══ 2 · componentes')
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  for (const id of COMPONENTES) {
    await p.goto(`${BASE}/#/doc/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
    await p.waitForTimeout(650)
    const r = await p.evaluate(medirFoco, '.palco').catch(() => ({ achados: [] }))
    if ((r.achados || []).length) {
      tudo.componentes[id] = r.achados
      console.log(`   ${id}: ${r.achados.length}`)
      r.achados.slice(0, 4).forEach((a) => console.log(`      [${a.tipo}] ${a.detalhe} · ${a.onde}`))
    }
  }
  console.log(`   com achado: ${Object.keys(tudo.componentes).length} de ${COMPONENTES.length}`)
  await p.close()

  const n = (o) => Object.values(o).flat().length
  const porTipo = {}
  ;[...Object.values(tudo.paginas).flat(), ...Object.values(tudo.componentes).flat()]
    .forEach((a) => { porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1 })
  console.log('\n══════ resumo do foco')
  console.log(`   páginas      ${n(tudo.paginas)}`)
  console.log(`   componentes  ${n(tudo.componentes)}`)
  console.log(`   por tipo     ${JSON.stringify(porTipo)}`)
  fs.writeFileSync(path.join(__dirname, 'auditoria-foco.json'), JSON.stringify(tudo, null, 1))
  await b.close()
})()
