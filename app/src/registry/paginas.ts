/**
 * Páginas de módulo REAIS do produto, exibidas em tela inteira.
 * `arquivo` é a view do repositório (read-only, via alias). `preparar` semeia a
 * store com dado de exemplo quando a view depende de API — sem isso a tela
 * abriria vazia e não mostraria cor nenhuma.
 */
export type PaginaReal = {
  id: string
  titulo: string
  modulo: string
  arquivo: string
  /** import explícito — sem glob, pelo mesmo motivo do registry de componentes */
  carregar: () => Promise<any>
  resumo: string
  preparar?: () => Promise<void> | void
}

export const PAGINAS: PaginaReal[] = [
  {
    id: 'matricula',
    titulo: 'Funil de matrículas',
    modulo: 'Matrícula',
    arquivo: '@ebp/modules/student-area/views/EnrollmentFunnelView.vue',
    carregar: () => import('@ebp/modules/student-area/views/EnrollmentFunnelView.vue'),
    resumo:
      'A tela do funil, com as colunas por etapa, os cartões de aluno, os filtros do topo e as etiquetas de situação. É onde mais cores da paleta aparecem juntas.',
    async preparar() {
      const { useEnrollmentFunnelStore } = await import('@ebp/modules/student-area/store/enrollment-funnel-store')
      const store: any = useEnrollmentFunnelStore()
      /* $patch em vez de atribuição solta: garante que TODO o state existe antes
         de qualquer getter rodar (o `activeBoardSchools` faz .filter e lança). */
      store.$patch({ boardSchools: [], academicPrograms: [], cards: [], stages: [], totals: {} })
      console.info('[sistema-de-cores] store do funil semeada; chaves:',
        Object.keys(store.$state || {}).join(','), '| boardSchools:', JSON.stringify(store.boardSchools))
      const { CARDS_EXEMPLO, ETAPAS_EXEMPLO, TOTAIS_EXEMPLO } = await import('./dados-matricula')
      /* Nomes de state conferidos na interface `State` da própria store. */
      store.stages = ETAPAS_EXEMPLO
      store.cards = CARDS_EXEMPLO
      store.totals = TOTAIS_EXEMPLO
      store.loading = false
      store.loaded = true
      store.hasError = false
      store.boardConfigured = true
      store.contractEnabled = true
      /* campos do State que os getters percorrem (`activeBoardSchools` faz
         `.filter`): sem eles o getter lança e a página não monta */
      store.boardSchools = [{ id: 1, name: 'Colégio Horizonte', schoolId: 1, active: true, enabled: true }]
      store.academicPrograms = [{ label: '1º ano', value: '1' }, { label: '2º ano', value: '2' }]
      store.contractSchoolSigns = false
      store.contractSchoolSigner = null
      store.contractAdditionalSigners = []
    },
  },
  {
    id: 'home',
    titulo: 'Início',
    modulo: 'Home',
    arquivo: '@ebp/modules/home/views/HomeView.vue',
    carregar: () => import('@ebp/modules/home/views/HomeView.vue'),
    resumo:
      'A primeira tela depois do login: os cartões de atalho, o guia de matrícula e os avisos. Mostra a marca em preenchimento e os fundos claros de família.',
  },
  {
    id: 'faturas',
    titulo: 'Lista de faturas',
    modulo: 'Faturas',
    arquivo: '@ebp/modules/invoice/views/InvoiceList.vue',
    carregar: () => import('@ebp/modules/invoice/views/InvoiceList.vue'),
    resumo:
      'A tabela de faturas com filtros e etiquetas de situação. É a tela com mais uso das famílias sucesso, alerta e erro ao mesmo tempo.',
  },
  {
    id: 'repasses',
    titulo: 'Repasses',
    modulo: 'Repasses',
    arquivo: '@ebp/modules/repasses/views/RepasseManagement.vue',
    carregar: () => import('@ebp/modules/repasses/views/RepasseManagement.vue'),
    resumo: 'A gestão de repasses, com as abas do topo e a tabela de valores por escola.',
  },
  {
    id: 'turmas',
    titulo: 'Turmas',
    modulo: 'Turmas',
    arquivo: '@ebp/modules/academicClass/views/AcademicClassList.vue',
    carregar: () => import('@ebp/modules/academicClass/views/AcademicClassList.vue'),
    resumo: 'A lista de turmas do ciclo letivo, com filtro de escola e ano.',
  },
  {
    id: 'alunos',
    titulo: 'Alunos',
    modulo: 'Alunos',
    arquivo: '@ebp/modules/student-area/views/StudentAreaList.vue',
    carregar: () => import('@ebp/modules/student-area/views/StudentAreaList.vue'),
    resumo:
      'A lista de alunos com filtro avançado, seleção de linhas e ações em lote. Mostra hover, linha selecionada e etiqueta dentro de tabela.',
  },
]
