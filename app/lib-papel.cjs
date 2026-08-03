/**
 * A regra de PAPEL, num só lugar.
 *
 * Todos os auditores (páginas em repouso, páginas em interação, os 108
 * componentes, estados abertos) importam esta função e injetam no navegador, pra
 * não existir um critério diferente por auditor — foi assim que a etiqueta
 * "Matriculado" passou: o auditor de páginas só checava se o hex pertencia à
 * paleta.
 *
 * A função roda DENTRO do navegador (é serializada pelo Playwright), então não
 * pode usar nada de fora: tudo entra pelo argumento.
 */

/** @param {{paleta: Array, raizes: string[]}} arg */
function medirPapeis(arg) {
  const { paleta, raizes: seletoresRaiz } = arg

  const porHex = {}
  paleta.forEach((t) => {
    const h = String(t.hex).toLowerCase()
    ;(porHex[h] = porHex[h] || []).push(t.nome)
  })

  const rgb = (s) => {
    const m = (s || '').match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const v = m[1].split(',').map((x) => parseFloat(x.trim()))
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }
  }
  const hex = (c) => '#' + [c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
  const lum = (c) => {
    const f = [c.r, c.g, c.b].map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]
  }
  const contraste = (a, b) => {
    const la = lum(a), lb = lum(b)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }
  /* Fundo EFETIVO: sobe a árvore compondo alpha até achar opaco. Sem isso, um
     texto sobre um pastel semitransparente é medido contra o pastel e não contra
     o que se vê. */
  const fundoEfetivo = (el) => {
    let n = el, acc = null
    while (n && n !== document.documentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor)
      if (c && c.a > 0) {
        if (!acc) acc = { ...c }
        else if (acc.a < 1) {
          const a = acc.a
          acc = {
            r: acc.r * a + c.r * (1 - a),
            g: acc.g * a + c.g * (1 - a),
            b: acc.b * a + c.b * (1 - a),
            a: a + c.a * (1 - a),
          }
        }
        if (acc.a >= 0.99) return acc
      }
      n = n.parentElement
    }
    return acc && acc.a >= 0.5 ? acc : { r: 255, g: 255, b: 255, a: 1 }
  }
  const nomes = (h) => porHex[h] || []
  const temCat = (h, cat) => nomes(h).some((n) => n.startsWith(cat + '/'))
  const rotulo = (el) => {
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : ''
    return el.tagName.toLowerCase() + cls
  }

  const out = []
  const vistos = new Set()
  const registra = (tipo, detalhe, el) => {
    const k = tipo + '|' + detalhe
    if (vistos.has(k)) return
    vistos.add(k)
    out.push({ tipo, detalhe, onde: rotulo(el) })
  }

  const raizes = []
  seletoresRaiz.forEach((s) => document.querySelectorAll(s).forEach((n) => raizes.push(n)))
  const alvos = new Set()
  raizes.forEach((raiz) => {
    alvos.add(raiz)
    raiz.querySelectorAll('*').forEach((n) => alvos.add(n))
  })

  alvos.forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.opacity === '0') return

    const textoDireto = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())
    const ehIcone = el.tagName === 'svg' || el.tagName === 'path'
      || /(^|\s)(ph-|icon)/.test(typeof el.className === 'string' ? el.className : '')
    /* Um traço não é uma superfície: filete indicador, divisor, bolinha de
       carrossel. Sem texto e com a menor dimensão até 8px, o elemento desenha
       uma LINHA com um bloco — papel de borda. Acima de 8px é superfície e
       exige Background (foi por isso que a trilha de 16px da barra de progresso
       ganhou Background/Track em vez de seguir no Border/Subtle). */
    const ehTraco = !el.textContent.trim() && Math.min(r.width, r.height) <= 8

    // ── fundo
    const bg = rgb(cs.backgroundColor)
    if (bg && bg.a >= 0.95) {
      const h = hex(bg)
      if (!nomes(h).length) registra('fora-da-paleta', `${h} em fundo`, el)
      else if (!temCat(h, 'Background') && !temCat(h, 'Overlay') && !(ehTraco && temCat(h, 'Border'))) {
        registra('papel-errado', `${h} (${nomes(h).join('/')}) como FUNDO`, el)
      }
    }

    // ── texto e ícone
    if (textoDireto || ehIcone) {
      const fg = rgb(cs.color)
      if (fg && fg.a >= 0.95) {
        const h = hex(fg)
        if (!nomes(h).length) registra('fora-da-paleta', `${h} em texto/ícone`, el)
        else if (!temCat(h, 'Content') && !temCat(h, 'Control') && !(ehIcone && temCat(h, 'Border'))) {
          registra('papel-errado', `${h} (${nomes(h).join('/')}) como ${ehIcone ? 'ÍCONE' : 'TEXTO'}`, el)
        }
        const alvo = fundoEfetivo(el)
        const razao = contraste(fg, alvo)
        const px = parseFloat(cs.fontSize)
        const grande = px >= 18.66 || (px >= 14 && parseInt(cs.fontWeight, 10) >= 700)
        const piso = ehIcone || grande ? 3 : 4.5
        /* Duas exceções, as duas previstas na norma:
           · `disabled` — WCAG 1.4.3 isenta controle inativo (é o que o token
             Content/Disabled existe para servir);
           · ORNAMENTO — decoração pura, marcada com `--ornamento: 1` no override
             (ex.: o ícone-sombra atrás do ícone de status). Precisa ser
             DECLARADA: deduzir "está atrás de outro elemento" a partir do DOM
             erraria em qualquer sobreposição legítima. */
        const inativo = el.disabled || el.closest('[disabled], .disabled, [aria-disabled="true"]')
        const ornamento = cs.getPropertyValue('--ornamento').trim() === '1'
        if (razao < piso && !inativo && !ornamento) {
          registra('contraste', `${h} sobre ${hex(alvo)} = ${razao.toFixed(2)}:1 (piso ${piso})`, el)
        }
      }
    }

    // ── borda e anel de foco
    ;[['borderTopColor', 'borderTopWidth'], ['borderLeftColor', 'borderLeftWidth'],
      ['borderBottomColor', 'borderBottomWidth'], ['borderRightColor', 'borderRightWidth'],
      ['outlineColor', 'outlineWidth']].forEach(([cor, larg]) => {
      if (parseFloat(cs[larg]) <= 0) return
      if (cor === 'outlineColor' && cs.outlineStyle === 'none') return
      const bc = rgb(cs[cor])
      if (!bc || bc.a < 0.95) return
      const h = hex(bc)
      /* Borda da MESMA cor do próprio fundo não desenha contorno nenhum — é
         redundância de código, não decisão de cor. O círculo do passo pendente
         da linha do tempo é assim (`TimelineRepasse.vue:130-131`: fundo e borda
         na mesma variável). Exigir token de Border ali obrigaria a inventar um
         contorno que ninguém vê. */
      if (bg && bg.a >= 0.95 && hex(bg) === h) return
      if (!nomes(h).length) registra('fora-da-paleta', `${h} em borda/anel`, el)
      else if (!temCat(h, 'Border')) registra('papel-errado', `${h} (${nomes(h).join('/')}) como BORDA`, el)
    })
  })
  return out
}

module.exports = { medirPapeis }
