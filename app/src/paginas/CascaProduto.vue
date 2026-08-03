<script setup lang="ts">
  /**
   * A casca genérica para QUALQUER rota do produto — decisão (a) do croqui.
   *
   * O furo que ela fecha: o menu lateral das páginas reais navega para as rotas
   * REAIS do produto (#/atividades, #/captacao, #/relatorios…), e essas telas
   * abriam FORA da casca — sem barra de voltar, sem o switch novas/hoje, e fora
   * do alcance de todos os auditores (que medem `.cheia__palco`). Foi assim que o
   * Paulo caiu na tela de Atividades sem saída.
   *
   * Como funciona: `main.ts` reembrulha cada rota instalada pelo produto — o
   * componente original vira o MIOLO desta casca, dentro do BaseTemplate real
   * (sidebar + top bar), sob a mesma barra da ferramenta das 6 páginas
   * registradas. Com isso, TODA tela alcançável vira superfície auditável.
   *
   * A view pode abrir vazia (muitas dependem de API que o mock não semeia por
   * rota) — vazio aqui é honesto: o que se avalia é o chrome + o que renderizar,
   * e o erro fica no console para a auditoria, nunca na tela.
   */
  import { onErrorCaptured, ref, onMounted } from 'vue'
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import BaseTemplate from '@ebp/components/template/BaseTemplate.vue'
  import { semearUsuario } from '../mock/semear-user'
  import { modoCores } from '../modo-cores'

  const props = defineProps<{
    /** o componente ORIGINAL da rota do produto, preservado pelo reembrulho */
    original: any
    titulo?: string
    /**
     * O `Main.vue` do produto JÁ traz o BaseTemplate (sidebar + top bar) e só
     * renderiza com `userStore.isAuthenticated` — era por isso que as rotas do
     * menu abriam VAZIAS: sem semeadura, o v-if nunca ligava. Quando o miolo é o
     * próprio Main, a casca não adiciona um segundo shell.
     */
    comShell?: boolean
  }>()

  const router = useRouter()
  const rota = useRoute()
  const tituloFinal = computed(() => props.titulo
    || String(rota.name || rota.path).replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()))
  const erro = ref<string | null>(null)
  const pronto = ref(false)

  function voltar() {
    const anterior = (window.history.state && window.history.state.back) || ''
    if (String(anterior).includes('/doc/') || String(anterior).includes('/pagina/')) router.back()
    else router.push('/doc/paginas')
  }

  onErrorCaptured((e) => {
    erro.value = String((e as any)?.message || e)
    console.error('[sistema-de-cores] rota do produto com erro (a casca segue de pé):', e)
    return false
  })

  onMounted(async () => {
    await semearUsuario()
    pronto.value = true
  })
</script>

<template>
  <div class="cheia">
    <div class="cheia__barra">
      <button class="cheia__voltar" @click="voltar">← Voltar ao sistema de cores</button>
      <div class="cheia__switch" role="group" aria-label="Versão das cores">
        <button type="button" class="cheia__switch__b" :class="{ 'is-on': modoCores === 'novas' }"
                :aria-pressed="modoCores === 'novas'" @click="modoCores = 'novas'">Cores novas</button>
        <button type="button" class="cheia__switch__b" :class="{ 'is-on': modoCores === 'hoje' }"
                :aria-pressed="modoCores === 'hoje'" @click="modoCores = 'hoje'">Cores hoje</button>
      </div>
      <div class="cheia__id">
        <b>{{ tituloFinal }}</b>
        <span>rota real do produto ·
          {{ modoCores === 'novas' ? 'tokens do padrão aplicados' : 'como está em produção hoje' }}</span>
      </div>
    </div>
    <div class="cheia__palco">
      <template v-if="pronto">
        <BaseTemplate v-if="props.comShell !== false">
          <component :is="props.original" />
        </BaseTemplate>
        <component v-else :is="props.original" />
      </template>
    </div>
  </div>
</template>

<style scoped>
  /* mesma barra do PaginaCheia — cores da FERRAMENTA, não do produto */
  .cheia__barra {
    position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 20px;
    padding: 10px 20px; background: #16171a; color: #fff;
  }
  .cheia__voltar {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #16171a; background: #fff;
    border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; white-space: nowrap;
  }
  .cheia__voltar:hover { background: #e7e7e3; }
  .cheia__switch { display: flex; flex-shrink: 0; padding: 3px; gap: 3px; background: #2a2c31; border-radius: 9px; }
  .cheia__switch__b {
    font-family: inherit; font-size: 12.5px; font-weight: 600; letter-spacing: .01em;
    color: #a8aeb5; background: none; border: none; border-radius: 7px;
    padding: 6px 12px; cursor: pointer; white-space: nowrap;
    transition: background-color 160ms cubic-bezier(.2,.6,.2,1), color 160ms cubic-bezier(.2,.6,.2,1);
  }
  .cheia__switch__b:hover:not(.is-on) { color: #fff; }
  .cheia__switch__b.is-on { background: #fff; color: #16171a; }
  .cheia__id { display: flex; flex-direction: column; line-height: 1.35; min-width: 0; }
  .cheia__id b { font-size: 13.5px; }
  .cheia__id span { font-size: 11.5px; color: #a8aeb5; }
  .cheia__palco { min-height: calc(100vh - 52px); }
  @media (prefers-reduced-motion: reduce) { .cheia__switch__b { transition: none; } }
</style>
