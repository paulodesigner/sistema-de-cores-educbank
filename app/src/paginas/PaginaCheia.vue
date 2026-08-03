<script setup lang="ts">
  /**
   * A página do produto em tela inteira: a view REAL do módulo, montada com o
   * mesmo ambiente do app (provides, store, i18n) e com os tokens do padrão.
   * Não é miniatura nem screenshot — é a tela, navegável no que ela permitir.
   */
  import { defineAsyncComponent, onErrorCaptured, ref, shallowRef, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { PAGINAS } from '../registry/paginas'
  /* O SHELL REAL do produto: sidebar + top bar + área de conteúdo. É o mesmo
     componente que o app usa em volta de toda rota (`Main.vue` → BaseTemplate),
     então o menu, os ícones e a barra de cima são os de verdade — e é neles que
     as cores novas precisam ser vistas. */
  import BaseTemplate from '@ebp/components/template/BaseTemplate.vue'
  import { semearUsuario } from '../mock/semear-user'
  import { modoCores } from '../modo-cores'

  const route = useRoute()
  const router = useRouter()
  const pagina = PAGINAS.find((p) => p.id === String(route.params.pid))
  const erro = ref<string | null>(null)
  /** A tela do produto pode rolar por DENTRO (o funil rola na horizontal). A
   *  roda vertical do mouse não move container horizontal, então a barra da
   *  ferramenta avisa — a barra é nossa, não do produto. */
  const dicaScroll = ref<string | null>(null)
  const comp = shallowRef<any>(null)
  const pronto = ref(false)

  /** Volta recarregando, pelo mesmo motivo da ida: o unmount da view real
   *  aborta a troca de árvore. */
  /**
   * Volta para o catálogo NAVEGANDO, sem recarregar.
   *
   * `router.back()` quando existe uma entrada anterior nossa: assim a pessoa cai
   * exatamente onde estava — inclusive na posição de scroll do menu, que o
   * navegador restaura sozinho no histórico. Se a página foi aberta direto pela
   * URL (não há de onde voltar), vai para o índice de Páginas.
   */
  function voltar() {
    const anterior = (window.history.state && window.history.state.back) || ''
    if (String(anterior).includes('/doc/')) router.back()
    else router.push('/doc/paginas')
  }

  onErrorCaptured((e: any) => {
    erro.value = String(e?.message || e)
    /* o stack vai para o console: a auditoria lê de lá, a tela não mostra */
    console.error('[sistema-de-cores] a página não montou:', e?.stack || e)
    return false
  })

  onMounted(async () => {
    /* O NavBar mostra nome, escola e iniciais: sem semear o userStore a barra
       monta vazia e não dá para avaliar a cor dela. A semeadura vive em
       `mock/semear-user.ts` porque o palco de componente precisa da mesma coisa
       (o NavSelectTenant lê `allTenants`). */
    await semearUsuario()

    if (!pagina) {
      erro.value = 'página não registrada'
      return
    }
    try {
      if (pagina.preparar) await pagina.preparar()
      /* E de novo DEPOIS que a view montar: a view real chama o próprio
         `carregar()` no onMounted, a chamada de API falha e ela seta
         `hasError` — apagando o que semeamos antes. Três tentativas curtas
         cobrem o tempo de resposta sem prender a tela. */
      if (pagina.preparar) {
        for (const atraso of [500, 1200, 2200]) {
          setTimeout(() => pagina.preparar?.(), atraso)
        }
      }
      comp.value = defineAsyncComponent(pagina.carregar)
      pronto.value = true
      setTimeout(() => {
        const palco = document.querySelector('.cheia__palco')
        if (!palco) return
        const horizontal = [...palco.querySelectorAll('*')].some(
          (el) => el.scrollWidth > el.clientWidth + 20 && /auto|scroll/.test(getComputedStyle(el).overflowX)
        )
        if (horizontal) dicaScroll.value = 'esta tela rola para o lado — use o trackpad na horizontal, ou arraste'
      }, 1200)
    } catch (e: any) {
      erro.value = String(e?.message || e)
      console.error('[sistema-de-cores] falha ao preparar a página:', e?.stack || e)
    }
  })
</script>

<template>
  <div class="cheia">
    <div class="cheia__barra">
      <button class="cheia__voltar" @click="voltar">← Voltar ao sistema de cores</button>
      <!-- Switch antes/depois. `role="group"` com dois botões `aria-pressed` em vez
           de um checkbox: são dois estados NOMEADOS, não um "ligado/desligado" —
           quem usa leitor de tela ouve qual das duas versões está vendo. -->
      <div class="cheia__switch" role="group" aria-label="Versão das cores">
        <button type="button" class="cheia__switch__b" :class="{ 'is-on': modoCores === 'novas' }"
                :aria-pressed="modoCores === 'novas'" @click="modoCores = 'novas'">Cores novas</button>
        <button type="button" class="cheia__switch__b" :class="{ 'is-on': modoCores === 'hoje' }"
                :aria-pressed="modoCores === 'hoje'" @click="modoCores = 'hoje'">Cores hoje</button>
      </div>
      <div class="cheia__id">
        <b>{{ pagina?.titulo || 'Página' }}</b>
        <span>{{ pagina?.modulo }} · código real ·
          {{ modoCores === 'novas' ? 'tokens do padrão aplicados' : 'como está em produção hoje' }}</span>
      </div>
      <span v-if="dicaScroll" class="cheia__dica">↔ {{ dicaScroll }}</span>
      <code class="cheia__arquivo">{{ pagina?.arquivo }}</code>
    </div>

    <div class="cheia__palco">
      <!-- Erro capturado NÃO esconde a página. Antes, qualquer erro secundário
           (um getter de store consultado por um filho, por exemplo) jogava a
           tela inteira fora — e a página montava direitinho por baixo. O
           registro vai para o console; a documentação não mostra achado. -->
      <div v-if="erro && !pronto" class="cheia__erro">
        <b>Montando a página…</b>
      </div>
      <!-- container ESTÁVEL: o aviso de carregamento fica sobreposto em vez de
           trocar a árvore. Trocar o nó no meio do mount de uma view que usa
           Teleport (modais) dispara erro de unmount no runtime do Vue. -->
      <!-- a view real DENTRO do shell real: menu à esquerda, top bar em cima -->
      <BaseTemplate v-if="pronto && comp">
        <component :is="comp" />
      </BaseTemplate>
    </div>
  </div>
</template>

<style scoped>
  .cheia { min-height: 100vh; background: var(--background-canvas, #f8f8f8); }
  /* A barra é da FERRAMENTA, não do produto: fica fora da área da página, com a
     cara da documentação, para ninguém confundir com a interface real. */
  .cheia__barra {
    position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 20px;
    padding: 10px 20px; background: #16171a; color: #fff;
  }
  .cheia__voltar {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #16171a; background: #fff;
    border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; white-space: nowrap;
  }
  .cheia__voltar:hover { background: #e7e7e3; }
  /* O switch é da FERRAMENTA, então usa a paleta editorial da barra (cinza
     escuro), não os tokens do produto: se ele mudasse de cor junto com o
     conteúdo, viraria parte daquilo que está sendo comparado. */
  .cheia__switch {
    display: flex; flex-shrink: 0; padding: 3px; gap: 3px;
    background: #2a2c31; border-radius: 9px;
  }
  .cheia__switch__b {
    font-family: inherit; font-size: 12.5px; font-weight: 600; letter-spacing: .01em;
    color: #a8aeb5; background: none; border: none; border-radius: 7px;
    padding: 6px 12px; cursor: pointer; white-space: nowrap;
    transition: background-color 160ms cubic-bezier(.2,.6,.2,1),
                color 160ms cubic-bezier(.2,.6,.2,1);
  }
  .cheia__switch__b:hover:not(.is-on) { color: #fff; }
  .cheia__switch__b.is-on { background: #fff; color: #16171a; }
  @media (prefers-reduced-motion: reduce) { .cheia__switch__b { transition: none; } }

  .cheia__id { display: flex; flex-direction: column; line-height: 1.35; min-width: 0; }
  .cheia__id b { font-size: 13.5px; }
  .cheia__id span { font-size: 11.5px; color: #a8aeb5; }
  .cheia__dica { font-size: 11.5px; color: #f0d68a; white-space: nowrap; }
  .cheia__arquivo { margin-left: auto; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #a8aeb5; }
  .cheia__palco { min-height: calc(100vh - 52px); }
  .cheia__erro { max-width: 640px; margin: 80px auto; display: flex; flex-direction: column; gap: 8px; text-align: center; font-size: 14px; color: #575e6a; }
  .cheia__erro b { color: #6f5d00; font-size: 16px; }
  .cheia__erro span { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #666; word-break: break-word; }
  @media (max-width: 720px) { .cheia__arquivo { display: none; } }
</style>
