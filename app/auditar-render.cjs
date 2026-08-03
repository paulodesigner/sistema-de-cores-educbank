/**
 * Auditoria de RENDERIZAÇÃO — o componente está mostrando a forma dele?
 *
 * A auditoria de cor já fecha em zero, e ainda assim as páginas de componente
 * podem estar ruins: um `AthDropButton` que aparece como um retângulo vazio com
 * uma setinha, um `NavSelectTenant` dizendo "Nenhuma rede encontrada", um campo
 * de busca esticado a 1500px com o texto no meio. Cor certa, forma errada.
 *
 * Nada disso é medido por contraste — então aqui as perguntas são outras:
 *
 *   VAZIO       o palco tem quase nada dentro (poucos nós, quase nenhum texto)
 *   ESTICADO    o componente ocupa ~toda a largura do palco, perdendo a forma
 *               natural (um campo de busca não tem 1500px no produto)
 *   OCO         área grande com pouquíssimo conteúdo — a "caixa alta e vazia"
 *   SEM TEXTO   nenhum caractere visível: falta rótulo, placeholder ou opção
 *   CENTRADO    conteúdo centralizado onde o componente é naturalmente à esquerda
 *   ESTADO VAZIO o componente montou mas está dizendo que não tem dados
 *
 *   node auditar-render.cjs [base]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const REG = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))

/* Frases de estado vazio do produto. Se aparecem no palco, o componente montou
   mas não recebeu dado — é pendência de mock, não de componente. */
const VAZIO_FRASES = ['nenhuma rede encontrada', 'nenhum resultado', 'nada encontrado',
  'nenhuma opção', 'sem dados', 'nenhum registro', 'não há', 'nenhuma informação',
  'nenhum item', 'lista vazia', 'nenhuma fatura', 'nenhum aluno']

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const achados = []
  const naturais = []

  for (const c of REG) {
    await p.goto(`${BASE}/#/doc/${c.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
    await p.waitForTimeout(620)
    const m = await p.evaluate((frases) => {
      const palco = document.querySelector('.palco')
      if (!palco) return { semPalco: true }
      const rp = palco.getBoundingClientRect()
      /* o conteúdo do componente é tudo menos o gatilho de modal, que é da ferramenta */
      const filhos = [...palco.children].filter((e) => !e.classList.contains('palco__gatilho')
        && !e.classList.contains('palco__erro'))
      const visiveis = [...palco.querySelectorAll('*')].filter((e) => {
        if (e.closest('.palco__gatilho')) return false
        const r = e.getBoundingClientRect()
        const cs = getComputedStyle(e)
        return r.width >= 1 && r.height >= 1 && cs.visibility !== 'hidden' && cs.opacity !== '0'
      })
      const textoTodo = filhos.map((e) => e.textContent || '').join(' ').replace(/\s+/g, ' ').trim()
      /* campos não têm textContent — o valor visível está em value/placeholder */
      const campos = [...palco.querySelectorAll('input, textarea, select')]
      const textoCampos = campos.map((e) => `${e.value || ''} ${e.placeholder || ''}`).join(' ').trim()
      const raiz = filhos[0]
      const rr = raiz ? raiz.getBoundingClientRect() : null
      /* área somada dos nós FOLHA (sem contar contêineres, que inflariam) */
      let areaConteudo = 0
      visiveis.forEach((e) => {
        if (e.children.length === 0) {
          const r = e.getBoundingClientRect()
          areaConteudo += r.width * r.height
        }
      })
      const vitrine = palco.querySelector('.palco__vitrine')
      /* A referência de "esticado" é o PALCO, não a vitrine. Medir contra a
         vitrine foi um erro meu de critério: um campo preencher os 360px da
         coluna dele é o comportamento CERTO — o defeito era ocupar os 766px do
         palco inteiro. Contra a vitrine, 25 campos corretos apareceram como
         defeito. */
      const larguraUtil = rp.width - 64   /* padding do palco: 32px de cada lado */
      return {
        palco: { w: Math.round(rp.width), h: Math.round(rp.height), util: Math.round(larguraUtil) },
        raiz: rr ? { w: Math.round(rr.width), h: Math.round(rr.height) } : null,
        nos: visiveis.length,
        texto: (textoTodo + ' ' + textoCampos).trim().slice(0, 90),
        nChars: (textoTodo + textoCampos).replace(/\s/g, '').length,
        nCampos: campos.length,
        temSvgOuIcone: !!palco.querySelector('svg, em[class*="ph-"], i[class*="ph-"], [class*="icon"]'),
        /* Modal e loader de tela cheia vivem num Teleport para o <body>: o palco
           fica com 0 nós POR DESENHO, e mostra só o gatilho. Medir o palco deles
           e chamar de "não renderizou" é ler o lugar errado. */
        temTeleport: [...document.querySelectorAll('body > div:not(#app)')].some((n) => {
          const r = n.getBoundingClientRect()
          return r.width > 30 && r.height > 30
        }) || !!palco.querySelector('.palco__gatilho') || !!document.querySelector('.palco__gatilho'),
        areaConteudo: Math.round(areaConteudo),
        preenchimento: rp.width * rp.height ? +(areaConteudo / (rp.width * rp.height)).toFixed(3) : 0,
        larguraRel: rr && larguraUtil ? +(rr.width / larguraUtil).toFixed(2) : null,
        alinhamento: raiz ? getComputedStyle(raiz).textAlign : null,
        larguraDeclarada: vitrine ? vitrine.getAttribute('data-largura') : null,
        estadoVazio: frases.find((f) => (textoTodo || '').toLowerCase().includes(f)) || null,
      }
    }, VAZIO_FRASES)

    const problemas = []
    /* Forma correta DECLARADA no registry (`formaEsperada`), com o motivo:
       esqueleto de carregamento, divisor, barra de progresso e sobreposição de
       tela cheia não têm texto; um editor de texto rico é alto e quase vazio.
       Declarar é melhor que silenciar no auditor — evita que alguém "conserte"
       pondo um rótulo inventado, e o motivo fica junto do componente. */
    if (c.formaEsperada) {
      naturais.push(`${c.id}: ${c.formaEsperada}`)
      continue
    }
    if (m.semPalco) problemas.push('sem palco')
    else {
      /* "poucos nós" NÃO é defeito: uma etiqueta com 46×32 e a palavra "Ativa"
         está com a forma certa, e a 1ª versão desta auditoria acusava 28
         componentes assim. Tamanho pequeno é a forma natural de tag, pastilha,
         contador, ícone, divisor, chave liga/desliga e spinner. O que é defeito
         é não renderizar NADA, ou renderizar só contorno. */
      if (m.nos === 0 && !m.temTeleport) problemas.push('NÃO RENDERIZOU (0 nós)')
      else if (m.nChars === 0 && m.nCampos === 0 && !m.temSvgOuIcone && !m.temTeleport) {
        problemas.push('SÓ CONTORNO (nem texto, nem campo, nem ícone)')
      } else if (m.nChars === 0 && m.nCampos > 0) {
        problemas.push('CAMPO SEM VALOR nem placeholder')
      }
      /* Ocupar toda a largura só é defeito para quem tem largura natural MENOR.
         Tabela, árvore de seleção e formulário completo ocupam a coluna inteira
         no produto — acusá-los era ler o critério fora de contexto. A vitrine do
         palco (`data-largura`) é a declaração de qual é a forma esperada. */
      const esperaEstreito = m.larguraDeclarada === 'campo' || m.larguraDeclarada === 'meio'
      if (esperaEstreito && m.larguraRel !== null && m.larguraRel >= 0.9 && m.nCampos > 0) {
        problemas.push(`ESTICADO (${Math.round(m.larguraRel * 100)}% de ${m.larguraDeclarada})`)
      }
      if (m.preenchimento < 0.02 && m.palco.h > 140) problemas.push(`OCO (${(m.preenchimento * 100).toFixed(1)}% preenchido, ${m.palco.h}px de altura)`)
      if (m.estadoVazio) problemas.push(`ESTADO VAZIO ("${m.estadoVazio}")`)
    }
    if (problemas.length) {
      achados.push({ id: c.id, titulo: c.titulo, grupo: c.grupo, problemas, m,
        temProps: !!c.props, temSlot: !!c.slot })
    }
  }

  /* agrupa por tipo pra dar ordem de ataque */
  const porTipo = {}
  achados.forEach((a) => a.problemas.forEach((pr) => {
    const t = pr.split(' ')[0]
    ;(porTipo[t] = porTipo[t] || []).push(a.id)
  }))

  console.log(`\n══ ${achados.length} de ${REG.length} componentes com renderização pobre`)
  console.log(`   (${naturais.length} com forma declarada no registry, fora da conta)\n`)
  Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length).forEach(([t, ids]) => {
    console.log(`   ${t.padEnd(14)} ${ids.length}`)
  })
  console.log('\n── detalhe (ordenado pelo nº de problemas)')
  achados.sort((a, b) => b.problemas.length - a.problemas.length).forEach((a) => {
    console.log(`\n${a.titulo}  [${a.id}]  ${a.grupo}${a.temProps ? '' : '  ⚠ sem props'}${a.temSlot ? '' : ' ⚠ sem slot'}`)
    console.log(`   ${a.problemas.join(' · ')}`)
    console.log(`   nós ${a.m.nos} · texto "${a.m.texto || '(nada)'}" · campos ${a.m.nCampos}` +
      ` · raiz ${a.m.raiz ? a.m.raiz.w + '×' + a.m.raiz.h : '—'} de ${a.m.palco.util}px úteis`)
  })
  fs.writeFileSync(path.join(__dirname, 'auditoria-render.json'), JSON.stringify(achados, null, 1))
  await b.close()
})()
