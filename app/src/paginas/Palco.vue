<script setup lang="ts">
  /**
   * Monta um componente REAL do produto e, se ele não subir, mostra o motivo em
   * vez de deixar a página branca. Um componente que precisa de mock aparece
   * como pendência explícita — a lista nunca mente sobre cobertura.
   */
  import { computed, defineAsyncComponent, nextTick, onErrorCaptured, ref, shallowRef, watch } from 'vue'
  import { eventoDoApp } from '../main'
  import { semearUsuario } from '../mock/semear-user'
  import { COMPONENTES } from '../registry/componentes-imports'

  const props = defineProps<{
    /** id do componente no registry (a chave do import explícito) */
    id: string
    arquivo: string | null
    props?: Record<string, any>
    slot?: string
    /**
     * Slots NOMEADOS, como `{ header: 'Responsável', body: 'Ana Souza' }`.
     * Metade do catálogo se compõe por dentro — `AthAccordion` tem header/left/
     * center/right, `AthDropButton` tem title/header/footer, `AthPopover` tem
     * body. Sem eles o componente monta como uma casca vazia: o AthDropButton
     * aparecia como um retângulo de 20×16 com uma setinha.
     */
    slots?: Record<string, string>
    /**
     * FILHOS-COMPONENTE para o slot default (M87). Slot de composição não aceita
     * texto: o `AthTabs` espera `<AthTab>` filhos (comunicação por
     * provide/inject) e, recebendo uma string, renderizava o texto cru
     * "Dados · Faturas · Contrato" no lugar das abas. Cada filho aponta para um
     * componente DO REGISTRY (mesmo import explícito do palco), com props e
     * texto próprios.
     */
    filhos?: { id: string; props?: Record<string, any>; texto?: string }[]
    /** Componente que só aparece quando recebe um evento pelo nome (modais). */
    abrirEvento?: string
    /** Eventos com carga, disparados antes do de abertura (ex.: dados do modal). */
    eventosAntes?: { nome: string; dados?: any }[]
    /** Modal controlado por PROP (v-model/show) em vez de evento. */
    gatilhoProp?: string
    /**
     * Largura que o componente tem NO PRODUTO. Um campo de formulário nunca
     * aparece com 766px de largura: ele vive numa coluna de grid. Renderizado
     * esticado, ele perde a forma — o texto fica perdido no meio de uma faixa
     * larga e o componente não parece com o que a pessoa vê no app.
     *   campo (360px)  · campo de formulário, select, datepicker
     *   meio  (560px)  · cartão, painel, bloco de conteúdo
     *   cheia (100%)   · tabela, formulário completo, abas, régua de meses
     * Default por grupo, sobrescrito no registry quando o componente fugir da regra.
     */
    largura?: 'campo' | 'meio' | 'cheia'
    /** Grupo do registry — decide o default de largura. */
    grupo?: string
  }>()

  /* Campos são a maioria dos casos esticados; o resto do catálogo é naturalmente
     largo ou pequeno o bastante para não sofrer. */
  const LARGURA_POR_GRUPO: Record<string, 'campo' | 'meio' | 'cheia'> = {
    'Campos de formulário': 'campo',
    Textos: 'meio',
    Dados: 'cheia',
    Layout: 'cheia',
    Navegação: 'cheia',
    Feedback: 'meio',
    Botões: 'meio',
    Ícones: 'meio',
  }
  const larguraFinal = () => props.largura || LARGURA_POR_GRUPO[props.grupo || ''] || 'cheia'

  const erro = ref<string | null>(null)
  /** Estado do modal controlado por prop — começa fechado para não cobrir a tela. */
  const aberto = ref(false)
  const propsFinais = () => ({
    ...(props.props || {}),
    ...(props.gatilhoProp ? { [props.gatilhoProp]: aberto.value } : {}),
  })
  const comp = shallowRef<any>(null)

  function resolver(id: string) {
    const carregar = COMPONENTES[id]
    if (!carregar) return null
    return defineAsyncComponent({
      loader: carregar,
      onError(e, retry, fail) {
        erro.value = String(e?.message || e)
        fail()
      },
    })
  }

  /**
   * Filhos RESOLVIDOS UMA VEZ, via computed — nunca `resolver()` no template.
   * A 1ª versão chamava `resolver(fi.id)` direto no template: cada render criava
   * um `defineAsyncComponent` NOVO, o Vue via outra identidade, fazia patch,
   * re-renderizava… medido: 1.616 abas na tela, "DadosDadosDados…". O computed
   * fixa a identidade enquanto `props.filhos` não mudar.
   */
  const filhosResolvidos = computed(() =>
    (props.filhos || []).map((fi) => ({ ...fi, comp: resolver(fi.id) }))
  )

  /* Semeia o usuário antes de qualquer componente montar: vários leem o
     userStore direto (NavSelectTenant, NavBar, NavNotifications) e, sem dado,
     mostram estado vazio como se estivessem quebrados. */
  semearUsuario().catch(() => {})

  watch(
    () => props.id,
    (id) => {
      erro.value = null
      comp.value = id ? resolver(id) : null
      if (id && !comp.value) erro.value = props.arquivo ? 'import não registrado: ' + props.arquivo : 'sem arquivo no repositório'
    },
    { immediate: true }
  )

  /* Modal abre por AÇÃO, não sozinho: ele vive num Teleport para o <body> e,
     abrindo automaticamente, cobria a tela inteira a cada navegação. O palco
     mostra o gatilho — que é como o modal aparece no produto também. */
  async function abrirModal() {
    ;(props.eventosAntes || []).forEach((e) => eventoDoApp.emit(e.nome, e.dados))
    await nextTick()
    eventoDoApp.emit(props.abrirEvento as string)
  }

  onErrorCaptured((e) => {
    erro.value = String((e as any)?.message || e)
    return false
  })
</script>

<template>
  <div class="palco">
    <!-- Sem "achados" na tela: se algo não montar, o registro fica na auditoria
         (node auditar-cores.cjs / qa-componentes.cjs), não na documentação. -->
    <div v-if="erro" class="palco__erro" :data-erro="erro"></div>
    <button v-if="comp && props.abrirEvento" type="button" class="palco__gatilho" @click="abrirModal">
      Abrir {{ props.abrirEvento.replace(/^open|Modal|Event$/g, '') || 'o modal' }}
    </button>
    <button v-if="comp && props.gatilhoProp" type="button" class="palco__gatilho" @click="aberto = !aberto">
      {{ aberto ? 'Fechar' : 'Abrir' }} o modal
    </button>
    <div class="palco__vitrine" :data-largura="larguraFinal()">
      <component v-if="comp" :is="comp" v-bind="propsFinais()">
        <template v-if="props.slot">{{ props.slot }}</template>
        <template v-for="(texto, nome) in props.slots || {}" #[nome] :key="nome">{{ texto }}</template>
        <template v-if="filhosResolvidos.length" #default>
          <component v-for="(fi, i) in filhosResolvidos" :key="i" :is="fi.comp" v-bind="fi.props || {}">
            {{ fi.texto }}
          </component>
        </template>
      </component>
    </div>
  </div>
</template>

<style scoped>
  .palco {
    background: var(--background-surface, #fff);
    border: 1px solid var(--border-disabled, #e5e5e5);
    border-radius: 14px;
    padding: 32px;
    min-height: 96px;
    display: flex;
    flex-direction: column;
    /* Alinhado ao início, não centralizado: no produto o componente começa na
       margem esquerda da coluna. Centralizar dava a impressão de que um campo de
       busca tem o texto no meio. */
    align-items: flex-start;
    gap: 16px;
  }
  /* A vitrine dá ao componente a largura que ele tem no app. Sem ela, tudo que
     traz `width:100%` (todo campo de formulário do produto) ocupava os 766px do
     palco e perdia a forma. */
  .palco__vitrine { width: 100%; }
  .palco__vitrine[data-largura='campo'] { max-width: 360px; }
  .palco__vitrine[data-largura='meio'] { max-width: 560px; }
  /* Componente que precisa de mais espaço que a coluna de campo mas cabe no palco
     não é forçado a encolher: o max-width é teto, não largura fixa. */
  .palco__erro { display: none; }
  .palco__gatilho {
    font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    color: var(--content-on-brand-subtle); background: var(--background-brand-subtle);
    border: 1px solid var(--border-brand); border-radius: 8px; padding: 9px 16px;
  }
  .palco__gatilho:hover { background: var(--background-brand); color: var(--content-on-fill); }
</style>
