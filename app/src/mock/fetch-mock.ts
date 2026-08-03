/** Mock do fetch para as tabelas.
 *  A EdsTable busca por `dataUrl` usando fetch; o provider-mock só cobre axios.
 *  Sem isso a chamada cai no index.html e a tabela mostra "erro"/vazia. */
const LINHAS = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  name: ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Elisa Prado', 'Felipe Nunes', 'Gabriela Melo', 'Heitor Alves'][i],
  studentName: ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Elisa Prado', 'Felipe Nunes', 'Gabriela Melo', 'Heitor Alves'][i],
  displayName: 'Colégio Horizonte',
  schoolName: 'Colégio Horizonte',
  courseName: ['1º ano', '2º ano', '3º ano', '5º ano', '6º ano', '7º ano', '8º ano', '9º ano'][i],
  grade: ['1º ano', '2º ano', '3º ano', '5º ano', '6º ano', '7º ano', '8º ano', '9º ano'][i],
  status: ['Ativa', 'Ativa', 'Pendente', 'Ativa', 'Ativa', 'Vencida', 'Ativa', 'Cancelada'][i],
  statusDescription: ['Ativa', 'Ativa', 'Pendente', 'Ativa', 'Ativa', 'Vencida', 'Ativa', 'Cancelada'][i],
  value: 1250 + i * 37,
  totalValue: 1250 + i * 37,
  dueDate: '2026-08-10',
  referenceDate: '2026-08-01',
  creationTime: '2026-08-01T10:00:00',
  enrollmentType: i % 3 === 0 ? 'reenrollment' : 'new',
  registrationCompleted: i % 2 === 0,
  /* Nomes de campo usados pelas colunas das tabelas do produto. Um mock genérico
     precisa cobrir vários apelidos: cada tela nomeia o mesmo dado de um jeito. */
  financialResponsibleName: 'Responsável ' + ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor'][i],
  responsibleName: 'Responsável ' + ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor'][i],
  guardianName: 'Responsável ' + ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor'][i],
  /* LISTA, não string: o formatter da coluna de nome em
     `modules/student-area/views/StudentAreaList.vue:60-61` faz
     `cell.getData().guardians.find(...)` de cara. Sem a lista, o formatter lança
     e o Tabulator entrega a célula VAZIA — a coluna "Nome do aluno" saía em
     branco e parecia problema de dado, não de contrato.
     `isVerified` alternado de propósito: é ele que revela o selo azul
     (`ph-shield-check`, pintado com --ath-color-info) em metade das linhas. */
  guardians: [
    {
      name: 'Responsável ' + ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor'][i],
      isVerified: i % 2 === 0,
      isFinancial: true,
    },
  ],
  /* ─── Campos das colunas que estavam saindo VAZIAS ───────────────────────
     Levantados coluna por coluna, comparando o cabeçalho renderizado com o
     `field` declarado no código. Nove colunas em quatro páginas não pintavam
     nada — e coluna que não renderiza é cor que a auditoria não vê. Duas delas
     ("Status Fatura", "Tipo de cobertura") são justamente ETIQUETA COLORIDA.
       faturas  · FiltersAndTableInvoiceList.vue:89,113,150,171
       turmas   · AcademicClassList.vue:60,63
       repasses · FiltersAndTableListRepasse.vue:48,84
       alunos   · StudentAreaList.vue:170
     `state` varia de propósito entre as famílias, pra que a auditoria encontre
     verde, amarelo, vermelho e azul na mesma tabela. `isOverdue` tem precedência
     no formatter (:116) e força o estado Overdue. */
  subTotalCents: (1250 + i * 37) * 100,
  state: ['Paid', 'Open', 'Pending', 'Paid', 'Canceled', 'Open', 'Created', 'Paid'][i],
  isOverdue: i === 5,
  /* Só a fatura PAGA tem data e método — nos mesmos índices em que `state` é
     'Paid' (0, 3, 7). O formatter da coluna Pagamento só monta o bloco quando o
     estado é Paid (:153) e devolve `undefined` nos outros; aí a tabela cai no
     valor bruto do campo e a data aparecia crua numa fatura pendente. */
  paidDate: [0, 3, 7].includes(i) ? '2026-07-28' : null,
  /* `paidMethod` em snake_case: `getPaymentMethod` (utils-invoice.ts:27) casa a
     chave em minúsculo com `pix`/`bank_slip`/`credit_card`… e cai em 'null'
     (ícone genérico ⓘ) se não reconhecer. Variar os métodos é o que faz a coluna
     Pagamento mostrar ícone e rótulo de verdade em vez do ⓘ. */
  paidMethod: ['pix', null, null, 'bank_slip', null, null, null, 'school'][i],
  /* A fatura AGRUPA itens por aluno: o formatter da coluna Aluno
     (FiltersAndTableInvoiceList.vue:45-56) lê `cell.getData().items` e monta a
     lista a partir de `item.studentName` — o campo `studentName` da raiz nem é
     usado ali. Sem `items`, a coluna inteira saía '---'. */
  /* `payer` é OBJETO e o formatter acessa `.name` sem proteção
     (FiltersAndTableInvoiceList.vue:66). Sem ele o formatter lança DEPOIS de já
     ter montado o nome do aluno — e a célula sai vazia em vez de '---', que é
     como o problema se disfarça de "dado faltando". */
  payer: { name: 'Responsável ' + ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor'][i], document: '000.000.000-00' },
  companyName: 'Colégio Horizonte',
  items: [
    {
      studentName: ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Elisa Prado', 'Felipe Nunes', 'Gabriela Melo', 'Heitor Alves'][i],
      subTotalCents: (1250 + i * 37) * 100,
      academicProgram: ['1º ano', '2º ano', '3º ano', '5º ano', '6º ano', '7º ano', '8º ano', '9º ano'][i],
    },
  ],
  ebpayPlan: i % 3 === 0 ? 'ZeroDefault' : 'Gateway',
  schoolYear: 2026,
  enrolled: [28, 31, 24, 30, 27, 33, 22, 29][i],
  competence: '2026-08-01',
  transferType: i % 3 === 0 ? 'ZeroDefault' : 'Gateway',
  action: ['View', 'GenerateInvoices', 'View', 'Enroll', 'View', 'GenerateInvoices', 'View', 'View'][i],
  invoiceCode: 'FAT-2026-' + String(i + 1).padStart(4, '0'),
  code: 'FAT-2026-' + String(i + 1).padStart(4, '0'),
  amount: 1250 + i * 37,
  originalValue: 1250 + i * 37,
  paidValue: i % 2 === 0 ? 1250 + i * 37 : 0,
  paymentMethod: i % 2 === 0 ? 'Boleto' : 'Pix',
  coverageType: i % 3 === 0 ? 'Educbank' : 'Escola',
  invoiceStatus: ['Paid', 'Issued', 'NotIssued', 'Paid', 'Issued', 'Overdue', 'Paid', 'Canceled'][i],
  className: ['1º ano A', '2º ano B', '3º ano A', '5º ano C', '6º ano A', '7º ano B', '8º ano A', '9º ano B'][i],
  enrolledCount: 20 + i,
  year: 2026,
  academicYear: 2026,
  /* Campos das colunas de StudentAreaList: sem eles a célula mostra spinner
     eterno (o formatter cai no else) e a ETIQUETA de status — que é justamente
     onde a cor da família aparece — nunca renderiza. */
  academicProgram: ['1º ano', '2º ano', '3º ano', '5º ano', '6º ano', '7º ano', '8º ano', '9º ano'][i],
  financialStatus: ['Regular', 'Regular', 'Pending', 'Regular', 'Regular', 'Overdue', 'Regular', 'Regular'][i],
  enrollmentStatus: ['Active', 'Active', 'InProgress', 'Active', 'Active', 'AtRisk', 'Active', 'Evaded'][i],
}))

const CORPO = {
  items: LINHAS, result: LINHAS, data: LINHAS, totalCount: LINHAS.length,
  total: LINHAS.length, count: LINHAS.length, last_page: 1, current_page: 1,
}

export function installFetchMock() {
  const original = window.fetch.bind(window)
  window.fetch = async (entrada: any, init?: any) => {
    const url = typeof entrada === 'string' ? entrada : entrada?.url || ''
    /* só intercepta chamada de API; asset e módulo do Vite passam direto */
    const ehApi = /\/api\/|\/app\/|localhost:\d+\/(?!assets|src|node_modules|phosphor)/.test(url) && !/\.(js|css|png|svg|woff2?|json)$/.test(url)
    if (!ehApi) return original(entrada, init)
    return new Response(JSON.stringify(CORPO), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}
