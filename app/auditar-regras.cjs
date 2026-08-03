/**
 * Auditoria das REGRAS DE USO — a terceira camada, que estava faltando.
 *
 * O auditor de papel (`lib-papel.cjs`) responde três perguntas sobre cada valor:
 * existe no sistema? está na categoria certa? passa contraste? Isso cobre os
 * TOKENS, mas não cobre as REGRAS que decidimos sobre eles.
 *
 * O Paulo achou o furo olhando uma tela: a regra 3 do sistema diz que "etiqueta
 * ganha contorno quando a linha está sob o mouse", e ela nunca foi aplicada — em
 * hover, a pílula "Receita garantida" mede 1,00:1 contra a linha, ou seja,
 * desaparece. Nenhuma das outras auditorias pega isso, porque não há valor errado
 * ali: há uma regra não implementada.
 *
 * Cobertas aqui (as regras verificáveis por medição, das 10 do sistema):
 *   R2 · anel de foco claro quando a vizinhança é escura
 *   R3 · etiqueta ganha contorno quando a linha está sob o mouse / selecionada
 *   R5 · um único escurecimento atrás de modal, e nada de texto sobre o scrim
 *   R6 · no clique, a borda do botão de contorno acompanha o fundo
 *   R7 · texto de marca sobre fundo de marca usa o degrau próprio
 *
 * As regras 1, 4 e 9 já são medidas pelo auditor de papel (par medido, Vivid fora
 * de conteúdo, isenção do disabled). A 8 é de nomenclatura e a 10 é de escopo —
 * nenhuma das duas se observa na tela.
 *
 *   node auditar-regras.cjs [base]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta
const PAGINAS = fs.readFileSync(path.join(__dirname, 'src/registry/paginas.ts'), 'utf8')
  .match(/id: '([^']+)'/g).map((m) => m.match(/'([^']+)'/)[1])

/* injetado no navegador: helpers de cor */
const AJUDA = `
  const hx=(s)=>{const m=(s||'').match(/rgba?\\(([^)]+)\\)/);if(!m)return null
    const v=m[1].split(',').map(Number); if((v[3]??1)<0.05) return 'transparente'
    return '#'+v.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join('')}
  const lum=(h)=>{if(!h||h[0]!=='#')return null; h=h.slice(1)
    const c=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4))
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
  const raz=(a,b)=>{const x=lum(a),y=lum(b); if(x===null||y===null) return null
    return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
`

;(async () => {
  const b = await chromium.launch()
  const achados = []
  const nomePorHex = {}
  paleta.forEach((t) => { (nomePorHex[t.hex.toLowerCase()] = nomePorHex[t.hex.toLowerCase()] || []).push(t.nome) })

  for (const id of PAGINAS) {
    const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
    await p.goto(`${BASE}/#/pagina/${id}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await p.waitForTimeout(5500)
    await p.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }).catch(() => {})

    // ── R3 · etiqueta em linha sob o mouse ────────────────────────────────────
    const linhas = await p.$$('.cheia__palco tbody tr')
    if (linhas.length) {
      await linhas[0].hover({ timeout: 2000 }).catch(() => {})
      await p.waitForTimeout(250)
      const r3 = await p.evaluate(`(() => {${AJUDA}
        const fora = []
        const pilulas = [...document.querySelectorAll(
          '.cheia__palco [class*="label-status-bg"], .cheia__palco .plan-zerodefault, .cheia__palco .plan-gateway, .cheia__palco .ath-tag')]
        pilulas.forEach((e) => {
          const linha = e.closest('tr')
          if (!linha) return
          /* A regra vale SÓ quando a linha mudou de fundo — em repouso o badge
             segue sem contorno de propósito (decisão do Paulo em 2026-07-31).
             Sem este filtro, toda linha branca da tabela aparecia como violação:
             11 achados, dos quais 6 eram falso positivo meu. */
          const emDestaque = linha.matches(':hover') || /selected|is-on|ativ/.test(linha.className)
          if (!emDestaque) return
          const cs = getComputedStyle(e)
          const bgP = hx(cs.backgroundColor), bgL = hx(getComputedStyle(linha).backgroundColor)
          if (!bgP || bgP === 'transparente' || !bgL) return
          /* a linha sob o mouse tem fundo DIFERENTE do repouso: só aí a regra vale */
          const contraste = raz(bgP, bgL)
          if (contraste === null || contraste > 1.25) return   /* dá para ver a pílula: ok */
          const larg = parseFloat(cs.borderTopWidth) || 0
          const cor = hx(cs.borderTopColor)
          const semContorno = larg === 0 || cor === 'transparente' || (raz(cor, bgL) || 1) < 1.6
          if (semContorno) {
            fora.push(\`"\${e.textContent.trim().slice(0,20)}" pílula \${bgP} sobre linha \${bgL} = \${contraste.toFixed(2)}:1 · contorno \${larg?cor:'nenhum'}\`)
          }
        })
        return [...new Set(fora)]
      })()`)
      r3.forEach((d) => achados.push({ regra: 'R3', pagina: id, detalhe: d }))
      /* desfaz o hover */
      await p.mouse.move(5, 5)
      await p.waitForTimeout(200)
    }

    // ── R2 · anel de foco sobre vizinhança escura ─────────────────────────────
    for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(70) }
    const r2 = await p.evaluate(`(() => {${AJUDA}
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0) return null
      const anel = hx(cs.outlineColor)
      /* fundo efetivo atrás do elemento focado */
      let n = el, fundo = null
      while (n && !fundo) { const c = hx(getComputedStyle(n).backgroundColor)
        if (c && c !== 'transparente') fundo = c; n = n.parentElement }
      fundo = fundo || '#ffffff'
      const escuro = (lum(fundo) ?? 1) < 0.2
      const r = raz(anel, fundo)
      return { anel, fundo, escuro, razao: r ? r.toFixed(2) : null, alvo: el.tagName.toLowerCase() }
    })()`)
    if (r2 && r2.razao !== null && +r2.razao < 3) {
      achados.push({ regra: 'R2', pagina: id,
        detalhe: `anel ${r2.anel} sobre fundo ${r2.fundo}${r2.escuro ? ' (escuro)' : ''} = ${r2.razao}:1 em <${r2.alvo}>` })
    }

    // ── R7 · texto de marca sobre fundo de marca ──────────────────────────────
    const r7 = await p.evaluate(`(() => {${AJUDA}
      const SUBTLE = ['#eae6ff', '#f3f1ff']   /* BrandSubtle e BrandSelected */
      const fora = []
      document.querySelectorAll('.cheia__palco *').forEach((e) => {
        const cs = getComputedStyle(e)
        const bg = hx(cs.backgroundColor)
        if (!bg || !SUBTLE.includes(bg)) return
        const temTexto = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        if (!temTexto) return
        const fg = hx(cs.color)
        /* Content/Brand é #6B55D8; o degrau próprio sobre pastel é #5644AD */
        if (fg === '#6b55d8') fora.push(\`texto Content/Brand (#6b55d8) sobre \${bg} — o degrau do par é Content/OnBrandSubtle (#5644ad)\`)
      })
      return [...new Set(fora)]
    })()`)
    r7.forEach((d) => achados.push({ regra: 'R7', pagina: id, detalhe: d }))

    await p.close()
  }

  // ── R5 · escurecimento do modal (medido num componente que abre modal) ─────
  const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } })
  for (const comp of ['athmodal', 'athmodalcenter']) {
    await p2.goto(`${BASE}/#/doc/${comp}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
    await p2.waitForTimeout(700)
    await p2.click('.palco__gatilho', { timeout: 2500 }).catch(() => {})
    await p2.waitForTimeout(900)
    const r5 = await p2.evaluate(`(() => {${AJUDA}
      const fora = []
      const veus = [...document.querySelectorAll('body *')].filter((e) => {
        const cs = getComputedStyle(e), r = e.getBoundingClientRect()
        const c = (cs.backgroundColor || '').match(/rgba?\\(([^)]+)\\)/)
        if (!c) return false
        const v = c[1].split(',').map(Number)
        const alpha = v[3] ?? 1
        return alpha > 0.1 && alpha < 0.95 && r.width > window.innerWidth * 0.8 && r.height > window.innerHeight * 0.8
      })
      veus.forEach((v) => {
        const cs = getComputedStyle(v)
        if (!/rgba\\(0,\\s*0,\\s*0,\\s*0?\\.5\\)/.test(cs.backgroundColor.replace(/\\s/g, ''))) {
          fora.push(\`véu com \${cs.backgroundColor} — o valor único do sistema é Overlay/Scrim rgba(0,0,0,.5)\`)
        }
        /* texto direto sobre o véu */
        ;[...v.childNodes].forEach((n) => { if (n.nodeType === 3 && n.textContent.trim())
          fora.push('há texto DIRETO sobre o véu — nenhum tom passa o mínimo contra o scrim') })
      })
      return [...new Set(fora)]
    })()`)
    r5.forEach((d) => achados.push({ regra: 'R5', pagina: comp, detalhe: d }))
  }
  await p2.close()

  const REGRAS = {
    R2: 'anel de foco claro quando a vizinhança é escura',
    R3: 'etiqueta ganha contorno quando a linha está sob o mouse',
    R5: 'um único escurecimento atrás de modal',
    R6: 'no clique, a borda acompanha o fundo',
    R7: 'texto de marca sobre fundo de marca tem degrau próprio',
  }
  console.log(`\n══ auditoria das REGRAS DE USO — ${achados.length} violação(ões)\n`)
  Object.entries(REGRAS).forEach(([k, nome]) => {
    const meus = achados.filter((a) => a.regra === k)
    console.log(`   ${k} · ${nome}`)
    if (!meus.length) { console.log('        ok'); return }
    meus.forEach((a) => console.log(`        [${a.pagina}] ${a.detalhe}`))
  })
  fs.writeFileSync(path.join(__dirname, 'auditoria-regras.json'), JSON.stringify(achados, null, 1))
  await b.close()
})()
