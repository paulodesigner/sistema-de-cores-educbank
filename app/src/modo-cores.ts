/**
 * O interruptor antes/depois.
 *
 * `novas` — o atributo `data-cores="novas"` está no <html>, e com ele valem as 78
 *           declarações do padrão (`tokens-padrao.css`) e os 29 blocos de
 *           correção (`override-legado.gated.css`).
 * `hoje`  — o atributo sai. As duas folhas deixam de casar e o produto renderiza
 *           com o próprio CSS, exatamente como está em produção.
 *
 * O "hoje" não é uma reconstrução nossa do estado antigo: é o produto **sem** a
 * nossa camada. Isso é o que torna a comparação honesta — não há nada nosso no
 * meio para mascarar diferença nenhuma.
 *
 * A escolha é lembrada porque o uso real é abrir várias páginas e comparar todas
 * no mesmo modo; reconfigurar a cada aba anularia a comparação.
 */
import { ref, watchEffect } from 'vue'

export type ModoCores = 'novas' | 'hoje'

const CHAVE = 'sistema-de-cores:modo'

function inicial(): ModoCores {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'hoje' || salvo === 'novas') return salvo
  } catch {
    /* navegação privada / storage bloqueado: cai no padrão, sem quebrar */
  }
  return 'novas'
}

export const modoCores = ref<ModoCores>(inicial())

/** Aplica no <html> e persiste. Roda uma vez no boot e a cada troca. */
export function ligarModoCores() {
  watchEffect(() => {
    const el = document.documentElement
    if (modoCores.value === 'novas') el.setAttribute('data-cores', 'novas')
    else el.removeAttribute('data-cores')
    try {
      localStorage.setItem(CHAVE, modoCores.value)
    } catch {
      /* idem */
    }
  })
}

export function alternarModoCores() {
  modoCores.value = modoCores.value === 'novas' ? 'hoje' : 'novas'
}
