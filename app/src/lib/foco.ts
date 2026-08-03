/**
 * Aplica as regras de anel de foco criando a folha DEPOIS do mount.
 *
 * ─── Por que assim, e não por import normal ────────────────────────────────
 * O `foco.css` importado como folha estática NÃO aplicava, e a investigação não
 * fechou. O que foi medido, em ordem:
 *   · a regra existe no CSS servido, com `!important`;
 *   · o elemento CASA o seletor (`btn.matches(...)` = true, com foco ativo);
 *   · a especificidade é 1,2,0 (`#app` + classe + pseudo) contra 0,3,0 do SFC
 *     (`.eds-button[data-v-…]:focus-visible`) — deveria vencer sempre;
 *   · e o valor computado continuava `outline-offset: 0px`.
 * Subir a especificidade três vezes não mudou nada. Mas **criar um `<style>` novo
 * com a MESMA regra passava a valer na hora** — e apenas reprocessar a folha
 * existente (`s.textContent = s.textContent`) também.
 *
 * Ou seja: o que decide aqui é o elemento de folha ser criado DEPOIS, não a
 * contagem de especificidade. Não isolei a razão — e é mais honesto registrar isso
 * do que inventar uma explicação. A aplicação está verificada por medição
 * (`auditar-foco.cjs`), que é o critério que vale.
 *
 * Reinserimos também a cada navegação porque os componentes são carregados sob
 * demanda (`defineAsyncComponent`) e cada um traz o próprio `<style>`.
 */
import css from '../estilo/foco.css?inline'

const MARCA = 'sistema-de-cores/foco'
let agendado = false

function reinserir() {
  document.querySelectorAll(`style[data-fonte="${MARCA}"]`).forEach((n) => n.remove())
  const el = document.createElement('style')
  el.setAttribute('data-fonte', MARCA)
  el.textContent = css
  document.head.appendChild(el)
}

/** Uma reinserção por quadro: os componentes carregam em rajada. */
function agendar() {
  if (agendado) return
  agendado = true
  requestAnimationFrame(() => {
    agendado = false
    reinserir()
  })
}

export function ligarFoco(router?: { afterEach: (f: () => void) => void }) {
  /* DEPOIS do mount: no boot a folha existe antes de qualquer `<style>` de SFC, e
     foi exatamente nessa ordem que ela não valeu. */
  requestAnimationFrame(reinserir)
  /* e de novo quando componentes novos entram */
  new MutationObserver((ms) => {
    const veioDeFora = ms.some((m) =>
      [...m.addedNodes].some((n) => {
        const e = n as HTMLElement
        return (e.tagName === 'STYLE' || e.tagName === 'LINK')
          && e.getAttribute?.('data-fonte') !== MARCA
      })
    )
    if (veioDeFora) agendar()
  }).observe(document.head, { childList: true })
  /* trocar de página monta um conjunto novo de componentes */
  router?.afterEach(() => agendar())
}
