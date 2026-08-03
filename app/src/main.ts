/**
 * Sobe o app da documentação com o AMBIENTE que os componentes reais esperam.
 * Portado do preview.ts do Storybook standalone do DS (base já testada): os
 * provides globais, as diretivas e a ordem dos estilos são as mesmas do app de
 * produção — o que muda é só a ÚLTIMA folha, que impõe as cores do padrão.
 */
import { createApp, h, markRaw } from 'vue'
import { ligarModoCores } from './modo-cores'
import { ligarFoco } from './lib/foco'
import CascaProduto from './paginas/CascaProduto.vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'

// estilos, na mesma ordem do webclient
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.min.js'
import 'sweetalert2/dist/sweetalert2.min.css'
import '@vuepic/vue-datepicker/dist/main.css'
import '@/assets/scss/educbank.scss'
// ...e por último o override: as cores do PADRÃO, por cima dos nomes que o código usa
import './estilo/tokens-padrao.css'
// ...e as cores que não passam por variável (hex em SFC, Bootstrap, Quill).
// A versão `.gated` é DERIVADA do `override-legado.css` (que segue sendo o
// documento legível, com o motivo e o arquivo:linha de cada dívida) por
// `gerar-override-alternavel.py`. Ela é a que entra no app porque cada seletor
// dela está sob `:root[data-cores='novas']` — o interruptor do switch
// antes/depois. Regerar sempre que o override mudar.
import './estilo/override-legado.gated.css'
/* Pacote 1: as 42 utilitárias de cor rescritas na língua nova — a regra VENCEDORA
   no DevTools passa a consumir o token novo. Ver o cabeçalho do arquivo. */
import './estilo/utilidades-legado.css'
import './estilo/casca.css'

import Helper from '@/helpers/helper'
import Format from '@/helpers/format'
import DateHelper from '@/helpers/date'
import { VMoney } from 'v-money'
import { vMaska } from 'maska/vue'
import Emitter from 'tiny-emitter'
import { installProviderMock } from './mock/provider-mock'
import { installFetchMock } from './mock/fetch-mock'
import i18nReal, { t as traduzir, totalChaves } from './lib/i18n-real'

/* Rotas REAIS do produto: o SideBar e o NavBar chamam `router.resolve({ name })`
   para montar cada item do menu, e o vue-router LANÇA se o nome não existe — era
   o que impedia o shell de montar. Registramos as rotas do app (só para
   resolver nomes; a navegação da documentação continua em /doc e /pagina). */
import installRoutesDoProduto from '@ebp/app/router'
import App from './App.vue'
import Doc from './paginas/Doc.vue'
import PaginaCheia from './paginas/PaginaCheia.vue'

// gateways HTTP com dado de exemplo antes de qualquer mount (services leem em call-time)
installProviderMock()
installFetchMock()   // a EdsTable busca por fetch, fora do provider

const clickOutside = {
  beforeMount(el: any, binding: any) {
    el.__h__ = (ev: any) => {
      if (!el.contains(ev.target) && el !== ev.target && ev.target.accessKey != 'v-click-outside') binding.value(ev)
    }
    document.addEventListener('click', el.__h__)
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.__h__)
  },
}
const ebTippy = {
  mounted(el: any, binding: any) {
    if (typeof binding.value === 'string') el.title = binding.value
  },
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/doc/fundamentos' },
    { path: '/doc/:pid', name: 'doc', component: Doc },
    { path: '/pagina/:pid', name: 'pagina', component: PaginaCheia },
    // rotas que as views reais podem tentar resolver com router-link
    { path: '/:qualquer(.*)*', component: { template: '<div />' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

try {
/**
 * Embrulha o `Main.vue` do produto na casca da ferramenta — decisão (a).
 *
 * O produto registra UMA rota-mãe ('/', name 'main', component Main.vue) com
 * todos os módulos como filhos — a 1ª tentativa reembrulhava os FILHOS via
 * removeRoute/addRoute de registros normalizados e quebrou a cadeia inteira
 * (nada renderizava). O ponto certo é a ORIGEM: interceptar o addRoute e trocar
 * o loader do 'main' por um que devolve o Main dentro do CascaProduto.
 * O Main já traz o BaseTemplate e o <router-view> dos filhos, então a casca
 * entra SEM shell próprio — só a barra (voltar + switch) e a semeadura do
 * usuário, que é o que faltava para o `v-if="isAuthenticated"` do Main ligar.
 */
{
  const addRouteOriginal = router.addRoute.bind(router)
  ;(router as any).addRoute = (a: any, b?: any) => {
    const rec = b || a
    if (!b && rec && rec.name === 'main' && typeof rec.component === 'function') {
      const carregarMain = rec.component
      rec.component = async () => {
        const m = await carregarMain()
        const Main = markRaw((m as any).default || m)
        return {
          name: 'CascaMain',
          render: () => h(CascaProduto, { original: Main, comShell: false }),
        }
      }
    }
    return addRouteOriginal(a, b)
  }
  installRoutesDoProduto(router)
  ;(router as any).addRoute = addRouteOriginal
}

/**
 * Filtro na URL não empilha histórico.
 *
 * As views reais do produto empurram o estado dos filtros para a query
 * (`?initialDate=…&page=1&size=50`) usando `push`. Cada mudança vira uma entrada
 * no histórico — então o botão VOLTAR do navegador, dentro de uma página cheia,
 * só removia os parâmetros e a pessoa continuava na mesma tela. Medido: abrir
 * Alunos e voltar deixava em `#/pagina/alunos`, parecendo que o botão não
 * funcionou.
 *
 * Aqui, quando a navegação é para a MESMA página (mesmo path) e só a query mudou,
 * ela é convertida em `replace`: o estado do filtro continua na URL (dá para
 * copiar o link), mas não deixa rastro no histórico. Um `voltar` sai da página,
 * que é o que a pessoa espera.
 *
 * `emCurso` evita laço: o guard reentra na navegação que ele mesmo pediu.
 */
let emCurso = false
router.beforeEach((para, de) => {
  if (emCurso) {
    emCurso = false
    return true
  }
  const mesmaTela = para.path === de.path && de.path !== '/'
  if (mesmaTela && para.fullPath !== de.fullPath) {
    emCurso = true
    return { path: para.path, query: para.query, hash: para.hash, replace: true }
  }
  return true
})
} catch (e) {
  console.warn('[sistema-de-cores] não deu para registrar as rotas do produto:', e)
}

/* O atributo `data-cores` tem de estar no <html> ANTES do primeiro quadro, senão
   a página pisca com as cores antigas e só depois assume as novas. */
ligarModoCores()

const app = createApp(App)

app.provide('helper', Helper)
app.provide('format', Format)
app.provide('date', DateHelper)
app.provide('t', traduzir)   // dicionário real do produto (pt-BR dos locales)
/* Event bus de verdade (tiny-emitter, a mesma lib do app): o AthModal e outros
   abrem escutando um evento pelo nome — com stub vazio eles nunca aparecem. */
const barramento = new Emitter()
export const eventoDoApp = {
  emit: (nome: string, ...args: any[]) => barramento.emit(nome, ...args),
  listen: (nome: string, cb: any) => barramento.on(nome, cb),
  remove: (nome: string) => barramento.off(nome),
}
app.provide('event', eventoDoApp)
app.provide('alert', {
  notify: () => {},
  confirm: () => Promise.resolve({ isConfirmed: true }),
  delete: () => Promise.resolve({ isConfirmed: true }),
})
app.provide('permission', {
  hasPermission: () => true,
  isHost: () => false,
  isAppUser: () => true,          // NavSelectTenant chama este
  forChangeData: () => true,
  isTenantSelectedIsGlobal: () => false,
})
/* O SideBar compara `feature.hasFeature(x) === 'true'` (string!) para decidir
   quais itens do menu existem. Com `false` metade do menu desaparece. */
app.provide('feature', { hasFeature: () => 'true' })
app.provide('setting', { getSetting: () => null })
app.provide('environment', { skipCount: 0, maxResultCount: 50 })
app.provide('preloader', { show: () => {}, hide: () => {} })

app.directive('money', VMoney)
app.directive('maska', vMaska)
app.directive('click-outside', clickOutside)
app.directive('eb-tippy', ebTippy)

console.info('[sistema-de-cores] chaves de tradução carregadas:', totalChaves())
app.use(i18nReal)   // a instância REAL do produto
app.use(createPinia())
app.use(router)
app.mount('#app')

/* Anel de foco por último, e DEPOIS do mount — ver o cabeçalho de lib/foco.ts:
   a folha só vale quando o elemento é criado após os `<style>` dos SFCs. */
ligarFoco(router)
