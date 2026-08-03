<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'

  const route = useRoute()

  /**
   * A chave decide o que é RECRIADO ao navegar — e ela precisa ser diferente por
   * rota, não uma só para todas.
   *
   * `/pagina/:pid` (página de módulo em tela cheia) PRECISA recriar: a view real
   * do produto é montada no `onMounted`, então reusar a instância deixava a tela
   * anterior no lugar ao ir de /pagina/home para /pagina/alunos.
   *
   * `/doc/:pid` (catálogo) NÃO pode recriar. O Doc.vue é todo reativo ao `pid`
   * (computeds + `watch(pid, …)`), então recriar não traz nada — e destrói o
   * `<aside class="ds-side">` junto, que é o elemento que ROLA. Era essa a causa
   * do menu voltar para o topo a cada clique: com 5026px de itens em 844px
   * visíveis, o scroll ia de 600 para 0 e a pessoa perdia o lugar na lista.
   * Medido antes/depois com Playwright.
   */
  const chave = computed(() =>
    route.name === 'pagina' ? route.fullPath : String(route.name || 'rota')
  )
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" :key="chave" />
  </RouterView>
</template>
