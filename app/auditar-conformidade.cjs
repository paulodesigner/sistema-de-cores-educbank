/**
 * Auditoria de CONFORMIDADE — a documentação diz a verdade sobre o componente?
 *
 * Pedido do Paulo: "analisar se todos os componentes que estão nas páginas estão
 * espelhando 100% o que está na nossa documentação de cada um dos componentes e
 * das cores".
 *
 * Cada componente do catálogo declara, na página de doc dele, a lista de tokens
 * que ele usa (o campo `tokens` do registry, mostrado como os chips de token).
 * Esta auditoria compara essa DECLARAÇÃO com o que o componente REALMENTE pinta
 * quando renderizado, e reporta as duas direções:
 *
 *   DECLARADO E NÃO USADO — a doc promete um token que não aparece na tela. Faz o
 *     leitor procurar uma cor que não existe ali, e infla a percepção de cobertura.
 *   USADO E NÃO DECLARADO — o componente pinta um token que a doc não menciona.
 *     Pior dos dois: quem lê a doc para saber o que muda ao trocar um token não
 *     encontra este componente na lista de afetados.
 *
 * Um lembrete de método: só o que RENDERIZA é medido. Por isso esta auditoria só
 * passou a ser possível depois de as props e slots serem preenchidos — antes,
 * metade do catálogo mostrava casca vazia e qualquer comparação diria "conforme"
 * por falta de conteúdo.
 *
 *   node auditar-conformidade.cjs [base]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const REG = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta

/* A MESMA medição que gera a lista do registry — ver lib-tokens.cjs.
   Antes havia uma cópia aqui, com critério diferente (comparava só por valor, sem
   casar categoria com propriedade), e a auditoria acusava 30 divergências que eram
   discordância entre os dois scripts, não erro na doc. */
const { medirTokens, medirComEstados } = require('./lib-tokens.cjs')

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const achados = []
  let conformes = 0

  for (const c of REG) {
    /* A MESMA travessia de estados que gera a lista do registry — repouso, hover,
       foco e aberto. Medir só o repouso aqui faria a auditoria acusar como "declara
       e não usa" justamente os tokens que só aparecem em estado. */
    const usados = new Set(await medirComEstados(p, BASE, c.id, paleta, medirTokens))
    const declarados = new Set(c.tokens || [])

    /* Comparação por NOME. Os dois lados agora usam a mesma medição, que já
       escolhe o nome pela propriedade — então "Background/Brand" de um lado e
       "Content/Brand" do outro são divergência de verdade, não ambiguidade do
       valor compartilhado. */
    const declaradoNaoUsado = [...declarados].filter((n) => !usados.has(n))
    const novos = [...usados].filter((n) => !declarados.has(n))

    /* O palco mostra UMA instância; a doc lista o repertório do componente
       inteiro. Um botão que tem variantes danger/success declara os tokens delas e
       renderiza só a primary — isso não é doc mentindo, é amostra parcial. Só conta
       como achado quando o componente NÃO tem variante declarada nas props. */
    const temVariante = !!(c.props && (c.props.variant || c.props.type || c.props.color || c.props.status))
    if (!novos.length && (!declaradoNaoUsado.length || temVariante)) { conformes++; continue }
    achados.push({ id: c.id, titulo: c.titulo, declaradoNaoUsado, usadoNaoDeclarado: novos,
      amostraParcial: temVariante })
  }

  console.log(`\n══ conformidade doc ↔ componente: ${conformes} de ${REG.length} conformes\n`)
  const soFalta = achados.filter((a) => a.declaradoNaoUsado.length && !a.usadoNaoDeclarado.length)
  const soSobra = achados.filter((a) => !a.declaradoNaoUsado.length && a.usadoNaoDeclarado.length)
  const ambos = achados.filter((a) => a.declaradoNaoUsado.length && a.usadoNaoDeclarado.length)
  console.log(`   declara e não usa .......... ${soFalta.length}`)
  console.log(`   usa e não declara ......... ${soSobra.length}`)
  console.log(`   as duas coisas ............ ${ambos.length}\n`)
  achados.slice(0, 26).forEach((a) => {
    console.log(`${a.titulo} [${a.id}]`)
    if (a.declaradoNaoUsado.length) console.log(`   declarado e NÃO usado: ${a.declaradoNaoUsado.join(', ')}`)
    if (a.usadoNaoDeclarado.length) console.log(`   usado e NÃO declarado: ${a.usadoNaoDeclarado.join(', ')}`)
  })
  if (achados.length > 26) console.log(`… e mais ${achados.length - 26}`)
  fs.writeFileSync(path.join(__dirname, 'auditoria-conformidade.json'), JSON.stringify(achados, null, 1))
  await b.close()
})()
