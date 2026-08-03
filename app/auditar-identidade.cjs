/**
 * Auditoria de IDENTIDADE — é o componente certo que está no palco?
 *
 * As auditorias anteriores respondem "a cor está certa?" e "a forma está certa?".
 * Nenhuma responde a pergunta anterior a essas: **o que está dentro da caixa
 * branca é o componente que o título anuncia?**
 *
 * O `AthTabs` mostrou que a pergunta não é retórica: ele renderizava o texto cru
 * "Dados · Faturas · Contrato" — porque o slot recebeu uma STRING onde o
 * componente espera `<AthTab>` filhos. Título certo, arquivo certo, cor certa,
 * forma "com texto" — e o que aparece não é o componente.
 *
 * Três verificações:
 *   TÍTULO   o `<h2>` da página é o título do registry?
 *   ARQUIVO  o caminho mostrado é o do registry?
 *   CORPO    o palco tem a MARCA do componente — o atributo de escopo do SFC
 *            (`data-v-…`) ou uma classe que remete ao nome dele? Texto solto sem
 *            nenhuma marca é o sintoma do slot mal alimentado.
 *
 *   node auditar-identidade.cjs [base]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const REG = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/registry/componentes.json'), 'utf8'))

/* Roda no navegador. Recebe o esperado e devolve o que encontrou. */
function verificar({ titulo, arquivo, id }) {
  const palco = document.querySelector('.palco')
  const vitrine = document.querySelector('.palco__vitrine')
  const h2 = document.querySelector('.ds-main h2')
  const cod = [...document.querySelectorAll('.ds-main code')].map((c) => c.textContent.trim())

  /* A MARCA do componente. Um SFC com <style scoped> deixa `data-v-HASH` nos
     próprios elementos; sem estilo scoped não há atributo, e aí a pista é a classe
     com o nome do componente (kebab do PascalCase). */
  const dentro = vitrine ? [...vitrine.querySelectorAll('*')] : []
  const comEscopo = dentro.filter((e) => [...e.attributes].some((a) => a.name.startsWith('data-v-'))).length
  const kebab = id.replace(/^(ath|eds|nav|modal)/, '')
  const classes = new Set()
  dentro.forEach((e) => {
    if (typeof e.className === 'string') e.className.split(/\s+/).forEach((c) => c && classes.add(c.toLowerCase()))
  })
  /* casa se alguma classe contém o nome do componente sem o prefixo, ou o id */
  const comClasse = [...classes].some((c) => c.includes(kebab) || c.replace(/-/g, '').includes(id))

  /* Texto solto: filho direto da vitrine que é nó de texto, sem elemento nenhum */
  const textoSolto = vitrine
    ? [...vitrine.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    : false

  return {
    tituloNaTela: h2 ? h2.textContent.trim() : null,
    arquivoNaTela: cod.find((c) => c.startsWith('@ebp/')) || null,
    elementos: dentro.length,
    comEscopo,
    comClasse,
    textoSolto,
    marcaAusente: comEscopo === 0 && !comClasse,
  }
}

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const achados = []
  let ok = 0

  for (const c of REG) {
    await p.goto(`${BASE}/#/doc/${c.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
    await p.waitForTimeout(680)
    const r = await p.evaluate(verificar, { titulo: c.titulo, arquivo: c.arquivo, id: c.id })
      .catch(() => null)
    if (!r) { achados.push({ id: c.id, problemas: ['não mediu'] }); continue }

    const problemas = []
    if (r.tituloNaTela !== c.titulo) {
      problemas.push(`TÍTULO: tela "${r.tituloNaTela}" ≠ registry "${c.titulo}"`)
    }
    if (c.arquivo && r.arquivoNaTela !== c.arquivo) {
      problemas.push(`ARQUIVO: tela "${r.arquivoNaTela}" ≠ registry "${c.arquivo}"`)
    }
    /* CORPO sem marca do componente: o que está na caixa pode não ser ele */
    if (r.marcaAusente && r.elementos > 0) {
      problemas.push(`CORPO sem marca do componente (${r.elementos} elementos, nenhum com data-v- nem classe do nome)`)
    }
    if (r.textoSolto) {
      problemas.push('TEXTO SOLTO como filho direto — sintoma de slot recebendo string onde precisa de componente')
    }
    if (!problemas.length) { ok++; continue }
    achados.push({ id: c.id, titulo: c.titulo, problemas, medido: r })
  }

  console.log(`\n══ identidade: ${ok} de ${REG.length} sem ressalva\n`)
  const porTipo = {}
  achados.forEach((a) => a.problemas.forEach((x) => {
    const t = x.split(':')[0].split(' ')[0]
    porTipo[t] = (porTipo[t] || 0) + 1
  }))
  console.log(`   por tipo: ${JSON.stringify(porTipo)}\n`)
  achados.slice(0, 30).forEach((a) => {
    console.log(`${a.titulo || a.id} [${a.id}]`)
    a.problemas.forEach((x) => console.log(`   ${x}`))
  })
  if (achados.length > 30) console.log(`… e mais ${achados.length - 30}`)
  fs.writeFileSync(path.join(__dirname, 'auditoria-identidade.json'), JSON.stringify(achados, null, 1))
  await b.close()
})()
