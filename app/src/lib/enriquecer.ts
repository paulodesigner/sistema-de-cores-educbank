import { avisar } from './aviso'
/** Contraste MEDIDO (nunca escrito) + copiar + filtro, para o HTML de conteúdo
 *  que vem do artefato estático. Mesmas regras da versão estática. */

export function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function contraste(a: string, b: string): number {
  const la = luminancia(a), lb = luminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
export function pastilhaHTML(a: string, b: string): string {
  const r = contraste(a, b)
  const cls = r >= 4.5 ? 'ok' : r >= 3 ? 'meio' : 'nao'
  const sinal = r >= 4.5 ? '✓' : r >= 3 ? '◐' : '✕'
  const titulo =
    r >= 4.5 ? 'Passa para texto de qualquer tamanho'
    : r >= 3 ? 'Passa para borda, ícone e texto grande'
    : 'Abaixo do mínimo'
  return `<span class="cr cr--${cls}" title="${titulo}">${r.toFixed(2).replace('.', ',')}:1 ${sinal}</span>`
}

/** Roda depois de injetar o HTML: mede os pares, liga os controles. */
export function enriquecer(raiz: HTMLElement) {
  raiz.querySelectorAll<HTMLElement>('[data-cr]').forEach((el) => {
    const [a, b] = (el.dataset.cr || '').split('|')
    if (a && b) el.innerHTML = pastilhaHTML(a, b)
  })

  const medirFamilias = () => {
    const escuro = !!raiz.querySelector('.ds-esq button[data-esq="escuro"][aria-pressed="true"]')
    raiz.querySelectorAll<HTMLElement>('.fam').forEach((fam) => {
      const bandas = fam.querySelectorAll<HTMLElement>('.fam__band')
      if (bandas.length < 4) return
      const v = (el: HTMLElement) => (escuro ? el.dataset.d : el.dataset.l) as string
      const p = (el: HTMLElement) => (escuro ? el.dataset.dp : el.dataset.lp) as string
      bandas.forEach((bd) => {
        bd.style.background = v(bd)
        bd.style.color = p(bd)
      })
      const linha = (i: number, rot: string) =>
        `<div>${rot} ${v(bandas[i]).toUpperCase()} + ${p(bandas[i]).toUpperCase()} ${pastilhaHTML(v(bandas[i]), p(bandas[i]))}</div>`
      const alvo = fam.querySelector('[data-pares]')
      if (alvo) alvo.innerHTML = linha(0, 'preenchimento') + linha(2, 'contêiner')
    })
  }
  const esq = raiz.querySelector('.ds-esq')
  if (esq) {
    esq.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button[data-esq]')
      if (!b) return
      esq.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
      medirFamilias()
    })
    medirFamilias()
  }

  const busca = raiz.querySelector<HTMLInputElement>('#buscaToken')
  if (busca) {
    const conta = raiz.querySelector('#buscaConta')
    const toks = Array.from(raiz.querySelectorAll<HTMLElement>('.tok'))
    busca.addEventListener('input', () => {
      const q = busca.value.trim().toLowerCase()
      let vis = 0
      toks.forEach((t) => {
        const bate = !q || (t.textContent || '').toLowerCase().includes(q)
        t.style.display = bate ? '' : 'none'
        if (bate) vis++
      })
      raiz.querySelectorAll<HTMLElement>('.tok-grid').forEach((g) => {
        const algum = Array.from(g.querySelectorAll<HTMLElement>('.tok')).some((t) => t.style.display !== 'none')
        g.style.display = algum ? '' : 'none'
        const tit = g.previousElementSibling as HTMLElement | null
        if (tit?.classList.contains('ds-h3')) tit.style.display = algum ? '' : 'none'
      })
      if (conta) conta.textContent = q ? `${vis} de ${toks.length}` : ''
    })
  }
}

/** Copiar, por delegação — serve o conteúdo injetado e o do app. */
export function ligarCopiar(raiz: HTMLElement | Document = document) {
  raiz.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]')
    if (!b) return
    e.preventDefault()
    const txt = b.dataset.copy || ''
    /**
     * O botão NÃO é alterado. A versão anterior fazia `b.textContent = 'copiado'`
     * e restaurava depois — o que destruía o conteúdo dele. Nos chips de token o
     * botão tem um SWATCH dentro (`<span class="tok-chip__sw">`), e sobrescrever o
     * texto apagava o quadradinho de cor de vez: a restauração só devolvia a
     * string. Além do dano, a leitura estava errada — a ação aconteceu no
     * clipboard, não no botão.
     * Agora: aviso no topo (a confirmação global) + uma classe no botão para o
     * pulso de retorno local, que não toca no conteúdo.
     */
    const ok = () => {
      avisar('Copiado', txt)
      b.classList.remove('copiou')
      void b.offsetWidth
      b.classList.add('copiou')
      setTimeout(() => b.classList.remove('copiou'), 700)
    }
    const manual = () => {
      const ta = document.createElement('textarea')
      ta.value = txt
      ta.style.position = 'fixed'
      ta.style.top = '-1000px'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy'); ok() } catch {}
      document.body.removeChild(ta)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(ok, manual)
    else manual()
  })
}


/**
 * Alternador de visão da Paleta (cartões ↔ lista).
 *
 * Delegação no `document` porque o HTML da paleta é INJETADO (`v-html`) e trocado
 * a cada navegação: um listener por elemento morreria na primeira troca de página.
 *
 * A escolha é lembrada — as duas visões servem tarefas diferentes (cartões
 * respondem "como é esta cor?", a lista responde "como os tokens se comparam?"),
 * e voltar para os cartões a cada navegação anularia o motivo de ter as duas.
 */
const CHAVE_VISAO = 'sistema-de-cores:visao-paleta'

export function aplicarVisaoPaleta(qual: 'cartoes' | 'lista') {
  const corpo = document.querySelector<HTMLElement>('.pal-corpo')
  if (!corpo) return
  corpo.setAttribute('data-visao', qual)
  document.querySelectorAll<HTMLElement>('.pal-visao [data-visao]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.visao === qual))
  })
  try { localStorage.setItem(CHAVE_VISAO, qual) } catch { /* storage bloqueado */ }
}

/** Restaura a visão salva. Chamar DEPOIS de o conteúdo ser injetado. */
export function restaurarVisaoPaleta() {
  let salva: string | null = null
  try { salva = localStorage.getItem(CHAVE_VISAO) } catch { /* idem */ }
  if (salva === 'lista' || salva === 'cartoes') aplicarVisaoPaleta(salva)
}

export function ligarVisaoPaleta(raiz: HTMLElement | Document = document) {
  raiz.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.pal-visao [data-visao]')
    if (!b) return
    aplicarVisaoPaleta(b.dataset.visao as 'cartoes' | 'lista')
  })
}
