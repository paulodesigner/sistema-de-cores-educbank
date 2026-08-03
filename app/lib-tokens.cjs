/**
 * A medição de TOKENS USADOS, num só lugar.
 *
 * Dois scripts precisam da mesma resposta: o que gera a lista de tokens do
 * registry (`medir-tokens.cjs`) e o que audita se a doc bate com a tela
 * (`auditar-conformidade.cjs`). Com uma cópia em cada, os dois discordaram — o
 * gerador casava categoria com propriedade, o auditor comparava só por valor, e a
 * conformidade acusava 30 divergências que eram diferença de critério, não de
 * dado. É a mesma lição do `lib-papel.cjs`: um critério, um arquivo.
 *
 * A função roda DENTRO do navegador (serializada pelo Playwright), então tudo
 * entra pelo argumento.
 */
function medir(pal) {
  const porHex = {}
  pal.forEach((t) => {
    const h = String(t.hex).toLowerCase()
    ;(porHex[h] = porHex[h] || []).push(t.nome)
  })
  const hx = (s) => {
    const m = (s || '').match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const v = m[1].split(',').map(Number)
    if ((v[3] ?? 1) < 0.95) return null
    return '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
  }
  /* A vitrine, não o palco: o gatilho de modal e a moldura são da ferramenta. */
  const raiz = document.querySelector('.palco__vitrine') || document.querySelector('.palco')
  if (!raiz) return []
  const alvos = [raiz, ...raiz.querySelectorAll('*')].filter((e) => {
    const r = e.getBoundingClientRect()
    /* `>= 1`, não `> 1`: um divisor (`<hr>`) tem 1px de altura, e o filtro
       anterior o descartava — o `AthHr` pinta Border/Subtle e saía com lista
       vazia. Filete, divisor e trilha fina são exatamente os elementos cuja
       única razão de existir é a cor. */
    return r.width >= 1 && r.height >= 1 && getComputedStyle(e).visibility !== 'hidden'
  })
  /* o que foi teleportado (dropdown/calendário aberto) também é do componente */
  document.querySelectorAll('body > div:not(#app)').forEach((n) => {
    const r = n.getBoundingClientRect()
    if (n.classList.contains('ds-aviso')) return   /* o toast é da ferramenta */
    /* limite baixo de propósito: com `> 20` o popover e o balão de dica ficavam de
       fora (são pequenos), e os dois PINTAM cor — davam lista vazia por filtro, não
       por não terem cor. */
    if (r.width > 4 && r.height > 4) alvos.push(n, ...n.querySelectorAll('*'))
  })

  /**
   * O elemento DECLARA a própria cor de texto, ou apenas herda?
   *
   * Não há como saber comparando valores: um elemento pode declarar exatamente a
   * cor que herdaria. E ler as regras CSS não é opção — `cssRules` lança neste
   * Chromium. Então o teste é FEITO: muda-se a cor do PAI para um valor sentinela
   * e vê-se se o filho acompanha. Acompanhou, herdava; não acompanhou, tem cor
   * própria. A cor do pai é restaurada em seguida.
   *
   * Isto substitui a comparação com a cor padrão do palco, que descartava tudo que
   * coincidisse com ela — no `AthFormTitle`, o título "Dados do responsável" é
   * Content/Primary porque o COMPONENTE decidiu, e ficava de fora só por ser o
   * mesmo tom do texto padrão da página. Foi o furo que o Paulo apontou.
   */
  const SENTINELA = 'rgb(1, 2, 3)'
  const declaraPropriaCor = (el) => {
    const pai = el.parentElement
    if (!pai) return true
    const antes = pai.style.color
    const tinhaAntes = pai.style.getPropertyValue('color')
    pai.style.setProperty('color', SENTINELA, 'important')
    const acompanhou = getComputedStyle(el).color === SENTINELA
    pai.style.removeProperty('color')
    if (tinhaAntes) pai.style.color = antes
    return !acompanhou
  }

  const usados = new Set()
  /**
   * O nome é escolhido pela PROPRIEDADE, não só pelo valor.
   *
   * Um hex pode ter nome em várias categorias — é o padrão de nomeação (1 hex =
   * 1 nome POR categoria de papel). #6B55D8 é Background/Brand, Content/Brand,
   * Border/Brand E Control/Accent ao mesmo tempo. Guardando todos os nomes de
   * cada valor, um único botão roxo trazia os quatro para a lista, e a doc ficava
   * mais longa e menos verdadeira: o `EdsAlertGroup` foi de 2 para 20 tokens.
   * Casando a categoria com a propriedade que a pinta, cada uso entra com o nome
   * do papel que ele realmente cumpre.
   */
  const guardaPor = (h, categoria) => {
    if (!h || !porHex[h]) return
    const doPapel = porHex[h].filter((n) => n.startsWith(categoria + '/'))
    /* sem nome naquela categoria, cai no primeiro nome do valor: é o caso de uma
       cor usada num papel para o qual ela não foi nomeada — e a auditoria de papel
       já reporta isso separadamente. */
    ;(doPapel.length ? doPapel : porHex[h]).forEach((n) => usados.add(n))
  }
  /**
   * PSEUDO-ELEMENTO e SVG também pintam.
   *
   * O `AthTimelineVertical` mostra na tela um círculo roxo e um verde, com ícone
   * branco dentro — e a medição devolvia só dois tokens neutros. Motivo: zero
   * elementos com `background-color` ou borda. Os círculos são desenhados de outra
   * forma, e a leitura ignorava as duas mais comuns:
   *   · `::before` / `::after` — usados para bolinha, filete, marcador, badge;
   *   · `fill` / `stroke` — todo ícone em SVG.
   * Sem isso, componente inteiro de linha do tempo, passo a passo e marcador de
   * status aparecia como se não tivesse cor.
   */
  const lerPseudo = (el, qual) => {
    const cs = getComputedStyle(el, qual)
    if (!cs || cs.content === 'none') return
    guardaPor(hx(cs.backgroundColor), 'Background')
    guardaPor(hx(cs.color), 'Content')
    if (parseFloat(cs.borderTopWidth) > 0) guardaPor(hx(cs.borderTopColor), 'Border')
    if (parseFloat(cs.borderLeftWidth) > 0) guardaPor(hx(cs.borderLeftColor), 'Border')
  }

  alvos.forEach((e) => {
    const cs = getComputedStyle(e)
    guardaPor(hx(cs.backgroundColor), 'Background')
    /* ícone em SVG: `fill` é preenchimento, `stroke` é traço */
    if (cs.fill && cs.fill !== 'none') guardaPor(hx(cs.fill), 'Content')
    if (cs.stroke && cs.stroke !== 'none') guardaPor(hx(cs.stroke), 'Content')
    lerPseudo(e, '::before')
    lerPseudo(e, '::after')
    ;['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach((k, i) => {
      const larg = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'][i]
      if (parseFloat(cs[larg]) > 0) guardaPor(hx(cs[k]), 'Border')
    })
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) guardaPor(hx(cs.outlineColor), 'Border')
    if (cs.accentColor && cs.accentColor !== 'auto') guardaPor(hx(cs.accentColor), 'Control')
    /* Cor de texto: de quem DECLARA a cor e tem texto EM ALGUM LUGAR abaixo dele.
       Exigir texto DIRETO estava errado: no `EdsButton` quem declara a cor é o
       `<button>`, e o texto vive num `<span>` interno que herda — o botão nunca era
       testado e o `Content/OnFill` desapareceu da lista (que era justamente o
       exemplo que o Paulo aprovou). Já um contêiner SEM texto nenhum abaixo é
       descartado: ali a cor existe só para ser herdada por quem ainda não há. */
    const temTextoAbaixo = !!(e.textContent && e.textContent.trim())
    const ehIcone = e.tagName === 'svg' || e.tagName === 'path'
      || /(^|\s)(ph-|icon)/.test(typeof e.className === 'string' ? e.className : '')
    if (temTextoAbaixo || ehIcone) {
      const cor = hx(cs.color)
      if (cor && declaraPropriaCor(e)) guardaPor(cor, 'Content')
    }
  })
  return [...usados]
}

/**
 * O PROCEDIMENTO de coleta, junto da medição.
 *
 * Unificar só a função não bastou: o gerador abria o modal pelo gatilho antes de
 * medir e a auditoria não, então o registry ganhava os tokens do modal ABERTO e a
 * auditoria media o fechado — 101 falsos "declara e não usa". Duas medições só
 * comparam se o estado da página for o mesmo, e o estado faz parte do critério.
 */
async function prepararPagina(page, base, id) {
  await page.goto(`${base}/#/doc/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  /**
   * RECARREGA de verdade, não só troca o hash.
   *
   * Navegar por hash num SPA não limpa o DOM — e a travessia de estados CLICA em
   * coisas. Um dropdown ou modal aberto num componente sobrevivia à navegação e era
   * medido no componente SEGUINTE: o `AthIcon`, que isolado tem 1 token, aparecia
   * com 9 herdados do vizinho. Medição em sequência exige estado limpo entre itens,
   * e "limpo" aqui significa recarregar.
   */
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(900)
  /* Aqui NÃO se clica em nada.
     A versão anterior clicava no gatilho do modal para "abrir antes de medir" — e
     em componentes que já renderizam o modal de saída (o `AthModalCenter` é um), o
     clique FECHAVA: a medição vinha vazia justamente nos modais. Abrir e fechar é
     trabalho da travessia de estados, que mede antes E depois de cada ação. */
}

/**
 * Mede o componente em VÁRIOS ESTADOS e devolve a união dos tokens.
 *
 * Pedido do Paulo: "existem cores que estão em outros estados do componente, como
 * expandido — preciso contemplar aí também". Um acordeão fechado não mostra a cor
 * do corpo; um select fechado não mostra a do item sob o mouse; um botão em repouso
 * não mostra o tom de hover. Medir só o repouso documenta um terço do componente.
 *
 * A ordem é do menos ao mais invasivo, e a união é acumulada: repouso → hover →
 * foco → aberto. Se um passo falhar (não há o que abrir, o clique não acerta), os
 * anteriores continuam valendo.
 */
async function medirComEstados(page, base, id, paleta, medir) {
  await prepararPagina(page, base, id)
  const uniao = new Set()
  const somar = async () => {
    const r = await page.evaluate(medir, paleta).catch(() => [])
    ;(r || []).forEach((n) => uniao.add(n))
  }
  await somar()                                   /* repouso */

  /* HOVER no primeiro alvo interativo de cada tipo */
  for (const sel of ['button', 'a[href]', 'input', '[role="option"]', 'li', 'tr', '.eds-select__field']) {
    const el = await page.$(`.palco__vitrine ${sel}`)
    if (!el) continue
    await el.hover({ timeout: 1200 }).catch(() => {})
    await page.waitForTimeout(160)
    await somar()
  }

  /* FOCO por teclado — onde vivem os anéis e as bordas de foco */
  await page.keyboard.press('Tab').catch(() => {})
  await page.waitForTimeout(140)
  await somar()

  /* ABRIR o que abre. Inclui o gatilho da própria ferramenta (`.palco__gatilho`),
     que é como o modal aparece — e como a união é acumulada, alternar não perde
     nada: o estado anterior já foi somado. */
  for (const sel of ['.palco__gatilho', '.eds-select__field',
    '[class*="accordion"] button', '[class*="accordion"] [class*="head"]',
    '.drop', '[class*="popover"] button', '[class*="popopver-body"]', '[class*="popover-body"]',
    '[class*="tab"]:not([class*="content"])', 'summary', '[aria-expanded="false"]',
    'input[type="checkbox"]', 'input[type="radio"]']) {
    /* o gatilho fica FORA da vitrine (é da ferramenta); o resto, dentro */
    const el = sel.startsWith('.palco__gatilho')
      ? await page.$(sel)
      : await page.$(`.palco__vitrine ${sel}`)
    if (!el) continue
    await el.click({ timeout: 1200 }).catch(() => {})
    await page.waitForTimeout(420)
    await somar()
  }
  return [...uniao]
}

module.exports = { medirTokens: medir, prepararPagina, medirComEstados }
