<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import conteudo from '../dados/paginas-doc.json'
  import registry from '../registry/componentes.json'
  import paletaJson from '../dados/paleta.json'
  import { PAGINAS } from '../registry/paginas'
  import { enriquecer, ligarCopiar, ligarVisaoPaleta, restaurarVisaoPaleta } from '../lib/enriquecer'
  import Palco from './Palco.vue'

  const route = useRoute()
  const router = useRouter()

  type Comp = {
    id: string; titulo: string; grupo: string; arquivo: string | null
    tokens: string[]; nota?: string; props?: Record<string, any>; slot?: string; slots?: Record<string, string>; filhos?: { id: string; props?: Record<string, any>; texto?: string }[]; abrirEvento?: string; eventosAntes?: { nome: string; dados?: any }[]; gatilhoProp?: string
    /** largura que o componente tem no produto — ver Palco.vue */
    largura?: 'campo' | 'meio' | 'cheia'
  }
  const componentes = registry as Comp[]
  const paleta = (paletaJson as any).paleta as { nome: string; hex: string; cssVar: string }[]
  const porToken = Object.fromEntries(paleta.map((p) => [p.nome, p]))

  const DOC = [
    { id: 'fundamentos', titulo: 'Fundamentos' },
    { id: 'paleta', titulo: 'Paleta' },
    { id: 'papeis', titulo: 'Papéis de cor' },
    { id: 'nomenclatura', titulo: 'Nomenclatura' },
    { id: 'instrucoes-ia', titulo: 'Instruções para IA' },
    { id: 'paginas', titulo: 'Páginas' },
  ]

  const busca = ref('')
  /* 'regras' virou 'instrucoes-ia' (2026-08-02): link antigo não pode morrer —
     favoritos e mensagens do time apontam para o id velho. */
  const APELIDOS_PAGINA: Record<string, string> = { regras: 'instrucoes-ia' }
  const pid = computed(() => {
    const bruto = String(route.params.pid || 'fundamentos')
    return APELIDOS_PAGINA[bruto] || bruto
  })
  const compAtual = computed(() => componentes.find((c) => c.id === pid.value) || null)
  const ehDoc = computed(() => DOC.some((d) => d.id === pid.value))
  const htmlConteudo = computed(() => (conteudo as any)[pid.value] || '')

  const grupos = computed(() => {
    const q = busca.value.trim().toLowerCase()
    const mapa = new Map<string, Comp[]>()
    componentes
      .filter((c) => !q || c.titulo.toLowerCase().includes(q))
      .forEach((c) => {
        if (!mapa.has(c.grupo)) mapa.set(c.grupo, [])
        mapa.get(c.grupo)!.push(c)
      })
    return [...mapa.entries()]
  })

  const caixaConteudo = ref<HTMLElement | null>(null)
  const tema = ref<'claro' | 'escuro'>((localStorage.getItem('ds.tema') as any) || 'claro')
  watch(tema, (t) => {
    document.documentElement.setAttribute('data-t', t)
    localStorage.setItem('ds.tema', t)
  })

  async function pintarConteudo() {
    await nextTick()
    if (caixaConteudo.value) enriquecer(caixaConteudo.value)
    /* a visão salva tem de ser reaplicada a cada troca de página: o HTML da
       paleta é reinjetado e volta ao padrão do gerador (cartões) */
    restaurarVisaoPaleta()
  }
  watch(pid, pintarConteudo)

  /**
   * Traz o item selecionado para a área visível do menu — SÓ ao abrir a página.
   *
   * Um link direto para `/doc/athtag` deixava o menu no topo, com o item ativo
   * uns 3000px abaixo: a pessoa não tinha como saber onde estava na lista.
   *
   * Roda uma vez, no mount. De propósito NÃO roda a cada navegação: depois que a
   * pessoa está usando o menu, mexer no scroll dela é briga por controle — e como
   * o item clicado já está visível (ela acabou de clicar nele), não haveria ganho.
   *
   * `scrollTo({behavior:'smooth'})` em vez de `scroll-behavior: smooth` no CSS:
   * a propriedade global faz qualquer `scrollTop` virar animação, e leitura
   * imediata devolve valor intermediário — foi assim que uma auditoria minha deu
   * falso negativo antes.
   */
  function revelarItemAtivo() {
    const menu = document.querySelector<HTMLElement>('.ds-side')
    const ativo = menu?.querySelector<HTMLElement>('.ds-nav__i.is-on')
    if (!menu || !ativo) return
    const r = ativo.getBoundingClientRect()
    const rm = menu.getBoundingClientRect()
    /* já visível com folga? não toca em nada */
    if (r.top >= rm.top + 24 && r.bottom <= rm.bottom - 24) return
    /* deixa o item a ~1/3 da altura, não encostado na borda: dá contexto do que
       vem antes e depois dele na lista */
    const destino = menu.scrollTop + (r.top - rm.top) - menu.clientHeight / 3
    menu.scrollTo({ top: Math.max(0, destino), behavior: 'smooth' })
  }

  onMounted(() => {
    document.documentElement.setAttribute('data-t', tema.value)
    ligarCopiar(document)
    ligarVisaoPaleta(document)
    pintarConteudo()
    nextTick(revelarItemAtivo)
  })

  const totalReais = componentes.filter((c) => c.arquivo).length

  /**
   * Abre a página em tela cheia NAVEGANDO na mesma aba.
   *
   * Passou por três formas, e vale registrar por quê:
   *   1. `router.push` — a view real do produto lança no unmount (um Teleport já
   *      removeu o nó), o Vue abortava a troca e a tela anterior ficava no lugar;
   *   2. trocar o hash e `reload()` — resolvia, mas cada abertura recarregava o
   *      app inteiro e o catálogo se perdia;
   *   3. aba nova — resolvia os dois, e o Paulo pediu para voltar a navegar na
   *      mesma aba: abrir aba a cada clique atrapalha mais que ajuda.
   *
   * Volta a ser `router.push`, e agora funciona por causa da chave por rota no
   * `App.vue`: `/pagina/:pid` recria o componente a cada navegação, então a tela
   * anterior não sobrevive à troca. O erro de unmount continua acontecendo, mas
   * cai no `onErrorCaptured` do PaginaCheia e não impede a navegação.
   */
  function abrirPagina(id: string) {
    router.push(`/pagina/${id}`)
  }
</script>

<template>
  <div>
    <header class="ds-top">
      <div class="ds-top__in">
        <div class="ds-top__brand">
          <!-- Logo OFICIAL, servida pelo publicDir (que aponta para o `public/` do
               webclient): `/img/logo-primary.png`, a mesma que o produto usa. Não
               foi copiada para cá de propósito — asset duplicado é asset que
               envelhece sozinho. `alt` vazio com o nome do produto ao lado seria
               redundante para leitor de tela, então o alt carrega o nome e o texto
               visível fica só com o subtítulo. -->
          <img class="ds-top__logo" src="/img/logo-primary.png" alt="Educbank" />
          <span class="ds-top__nome"><em>Sistema de Cores</em></span>
        </div>
        <div class="ds-top__acts">
          <span class="ds-top__meta">{{ paleta.length }} tokens · {{ totalReais }} componentes do código</span>
          <button class="ds-top__btn" :aria-label="tema === 'escuro' ? 'Mudar para claro' : 'Mudar para escuro'"
                  @click="tema = tema === 'escuro' ? 'claro' : 'escuro'">
            {{ tema === 'escuro' ? '☾' : '☀' }}
          </button>
        </div>
      </div>
    </header>

    <div class="ds-shell">
      <aside class="ds-side">
        <div class="ds-side__busca">
          <input v-model="busca" type="search" placeholder="Buscar" aria-label="Buscar componente" />
        </div>
        <nav class="ds-nav">
          <RouterLink v-for="d in DOC" :key="d.id" class="ds-nav__i" :class="{ 'is-on': pid === d.id }"
                      :to="`/doc/${d.id}`">{{ d.titulo }}</RouterLink>
          <template v-for="[grupo, itens] in grupos" :key="grupo">
            <div class="ds-nav__g">{{ grupo }}</div>
            <RouterLink v-for="c in itens" :key="c.id" class="ds-nav__i" :class="{ 'is-on': pid === c.id }"
                        :to="`/doc/${c.id}`">{{ c.titulo }}</RouterLink>
          </template>
        </nav>
      </aside>

      <main class="ds-main">
        <!-- páginas de conteúdo: o HTML vem do artefato estático, uma fonte só -->
        <section v-if="ehDoc && pid !== 'paginas'" ref="caixaConteudo" class="ds-panel on" v-html="htmlConteudo" />

        <!-- índice das páginas reais de módulo -->
        <section v-else-if="pid === 'paginas'" class="ds-panel on">
          <h2>Páginas</h2>
          <p class="ds-lead">
            As telas do produto, renderizadas a partir do código real, com os tokens do padrão aplicados. Abrem em
            tela inteira — não é miniatura, é a página.
          </p>
          <div class="pag-grid">
            <article v-for="p in PAGINAS" :key="p.id" class="pag">
              <div class="pag__modulo">{{ p.modulo }}</div>
              <h3 class="pag__titulo">{{ p.titulo }}</h3>
              <p class="pag__resumo">{{ p.resumo }}</p>
              <code class="pag__arquivo">{{ p.arquivo }}</code>
              <button class="pag__abrir" @click="abrirPagina(p.id)">Abrir a página inteira</button>
            </article>
          </div>
        </section>

        <!-- componente real -->
        <section v-else-if="compAtual" class="ds-panel on">
          <h2>{{ compAtual.titulo }}</h2>
          <p v-if="compAtual.nota" class="ds-lead">{{ compAtual.nota }}</p>
          <h3 class="ds-h3">Componente</h3>
          <p class="ds-p">
            Renderizado do arquivo real: <code>{{ compAtual.arquivo || 'sem arquivo no repositório' }}</code>
          </p>
          <Palco class="mt" :id="compAtual.id" :arquivo="compAtual.arquivo" :props="compAtual.props"
                 :slot="compAtual.slot" :slots="compAtual.slots" :filhos="compAtual.filhos" :abrir-evento="compAtual.abrirEvento" :eventos-antes="compAtual.eventosAntes" :gatilho-prop="compAtual.gatilhoProp"
                 :grupo="compAtual.grupo" :largura="compAtual.largura" />
          <h3 class="ds-h3">Tokens</h3>
          <div class="tok-chips">
            <button v-for="t in compAtual.tokens" :key="t" class="tok-chip"
                    :data-copy="`var(${porToken[t]?.cssVar || ''})`" :title="`Copiar var(${porToken[t]?.cssVar || ''})`">
              <span class="tok-chip__sw" :style="{ background: porToken[t]?.hex }"></span>{{ t }}
            </button>
            <span v-if="!compAtual.tokens.length" class="ds-p">Sem cor própria: herda os tokens de quem o compõe.</span>
          </div>
        </section>

        <section v-else class="ds-panel on"><h2>Não encontrei esta página</h2></section>
      </main>
    </div>
  </div>
</template>

<style scoped>
  .ds-nav__i { text-decoration: none; display: block; }
  .ds-nav__i.is-on { background: var(--ac-sf); color: var(--ac); font-weight: 600; }
  .mt { margin-top: 12px; }
  .pag-grid { margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .pag { border: 1px solid var(--ln); border-radius: 14px; padding: 24px; background: var(--sf); display: flex; flex-direction: column; gap: 8px; }
  .pag__modulo { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx3); }
  .pag__titulo { font-size: 17px; font-weight: 700; color: var(--tx); }
  .pag__resumo { font-size: 13.5px; line-height: 1.6; color: var(--tx2); }
  .pag__arquivo { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--tx3); word-break: break-all; }
  .pag__abrir { align-self: flex-start; margin-top: 8px; font-family: inherit; font-size: 13px; font-weight: 600;
    background: var(--ac); color: var(--on-ac); border: none; border-radius: 9px; padding: 9px 16px; cursor: pointer; }
  .pag__abrir:hover { filter: brightness(1.08); }
</style>
