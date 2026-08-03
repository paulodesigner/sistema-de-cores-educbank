/**
 * Aviso passageiro no topo da tela (toast).
 *
 * Por que existe: ao copiar um token, o código trocava o `textContent` do próprio
 * botão por "copiado". Duas coisas erradas nisso —
 *   1. o botão se transforma em outra coisa por 1,3s, o que lê como se a
 *      interface tivesse mudado de estado (e não é isso que aconteceu: a ação foi
 *      no clipboard, não no botão);
 *   2. nos chips de token o botão contém um SWATCH (`<span class="tok-chip__sw">`)
 *      além do texto. Sobrescrever o `textContent` APAGAVA o quadradinho de cor —
 *      e a restauração devolvia só a string, então o swatch nunca voltava. O chip
 *      ficava permanentemente sem a cor.
 *
 * O aviso resolve os dois: a confirmação aparece onde a pessoa olha depois de uma
 * ação global (o topo), e o componente não é tocado.
 *
 * `role="status"` + `aria-live="polite"` porque o aviso É a confirmação: sem isso,
 * quem usa leitor de tela clica e não recebe retorno nenhum.
 */
let caixa: HTMLElement | null = null
let sumir: number | undefined

function garantirCaixa(): HTMLElement {
  if (caixa && document.body.contains(caixa)) return caixa
  caixa = document.createElement('div')
  caixa.className = 'ds-aviso'
  caixa.setAttribute('role', 'status')
  caixa.setAttribute('aria-live', 'polite')
  document.body.appendChild(caixa)
  return caixa
}

/**
 * @param texto  a mensagem
 * @param eco    o valor copiado, mostrado em fonte de código ao lado (opcional)
 */
export function avisar(texto: string, eco?: string) {
  const el = garantirCaixa()
  el.innerHTML = ''
  const msg = document.createElement('span')
  msg.className = 'ds-aviso__t'
  msg.textContent = texto
  el.appendChild(msg)
  if (eco) {
    const cod = document.createElement('code')
    cod.className = 'ds-aviso__c'
    /* O eco é truncado: copiar um LINK de página produz uma string de 90+
       caracteres, e o aviso virava uma faixa atravessando a tela. 44 caracteres
       bastam para reconhecer o que foi copiado — que é a função do eco; ler o valor
       inteiro não é (ele já está no clipboard). */
    cod.textContent = eco.length > 44 ? eco.slice(0, 44) + '…' : eco
    cod.title = eco
    el.appendChild(cod)
  }
  /* remove e recoloca a classe para a animação reiniciar quando se copia duas
     vezes seguidas — sem isso o segundo clique não dá retorno visível nenhum */
  el.classList.remove('is-on')
  void el.offsetWidth
  el.classList.add('is-on')
  window.clearTimeout(sumir)
  sumir = window.setTimeout(() => el.classList.remove('is-on'), 2200)
}
