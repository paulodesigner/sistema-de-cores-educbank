/**
 * Auditoria de VARIÁVEIS — a cadeia, não o pixel.
 *
 * O comando máximo do Paulo (2026-08-02): inspecionando um título no DevTools, a
 * regra vencedora mostra `color: var(--ath-color-secondary-900)` — o NOME antigo.
 * O valor computado está certo (#002A3A = Content/Primary), mas a experiência de
 * inspeção ainda fala a língua do sistema velho. As auditorias de pixel fecham em
 * zero e não veem isso, porque medem o RESULTADO e não o CAMINHO.
 *
 * Esta auditoria olha o caminho, em duas partes:
 *
 *  1 · ESTÁTICA — baixa o CSS realmente servido (lição: grep no dist lê build
 *      velho; aqui é `fetch` na URL do <link>) e extrai todo `var(--nome)`
 *      consumido. Cada nome cai numa de quatro caixas:
 *        · token novo (--content-*, --background-*, --border-*, --control-*, --overlay-*)
 *        · legado COBERTO — redeclarado pela ponte em tokens-padrao.css
 *        · legado DESCOBERTO — consumido mas sem redeclaração: sob o modo
 *          "novas" resolve para o valor ANTIGO do produto → vazamento real
 *        · não-cor (fonte, raio, sombra, espaçamento) — fora do escopo
 *
 *  2 · RUNTIME — com `data-cores="novas"`, resolve cada variável legada de cor no
 *      próprio navegador e confere se o valor final pertence à paleta nova.
 *      É o teste de que a ponte não só existe como vence a cascata.
 *
 *   node auditar-variaveis.cjs [base]
 */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright')
const fs = require('fs'), path = require('path')

const BASE = process.argv[2] || 'http://localhost:4173'
const paleta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/dados/paleta.json'), 'utf8')).paleta
const HEX_NOVOS = new Set(paleta.map((t) => String(t.hex).toLowerCase()))
/* A ponte de tokens E o override: o bloco 34 redeclara os temas de biblioteca
   (--bs-*, --swal2-*) no override, não na ponte — ler só a ponte deixava 263
   nomes como "descobertos" que o runtime provava cobertos. */
const ponte = fs.readFileSync(path.join(__dirname, 'src/estilo/tokens-padrao.css'), 'utf8')
  + fs.readFileSync(path.join(__dirname, 'src/estilo/override-legado.gated.css'), 'utf8')
const REDECLARADAS = new Set([...ponte.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]))

const NOVO = /^--(content|background|border|control|overlay)-/
/* prefixos que declaradamente não são cor (medida, fonte, sombra composta etc.) */
const NAO_COR = /(font|family|weight|size|radius|spacing|width|height|shadow|opacity|space|gutter|top-h|side-w|rail-w|z-|duration|unnamed|transition|animation|transform|padding|border$|-s\d)/
/* A CASCA editorial da ferramenta usa nomes curtos próprios (--tx, --ln, --sf,
   --ac, --pg, --ok, --meio, --nao, --on-ac…). Ela não é o produto documentado —
   é a moldura — e tem paleta própria de propósito (se usasse os tokens do DS,
   entraria no que está sendo avaliado). Fora do escopo desta auditoria. */
const CASCA = /^--(tx\d?|ln|sf\d?|pg|ac(-sf)?|ok(-sf)?|meio(-sf)?|nao(-sf)?|on-ac|gut)$/

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(`${BASE}/#/doc/paleta`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(1200)

  // ── 1 · estática: o CSS que o navegador de fato recebeu
  const consumo = await p.evaluate(async () => {
    const hrefs = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href)
    let css = ''
    for (const h of hrefs) {
      try { css += await (await fetch(h)).text() } catch { /* fonte de ícones etc. */ }
    }
    document.querySelectorAll('style').forEach((s) => { css += s.textContent })
    const usos = {}
    for (const m of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
      usos[m[1]] = (usos[m[1]] || 0) + 1
    }
    return usos
  })

  const caixas = { novo: [], coberto: [], DESCOBERTO: [], naoCor: [] }
  for (const [nome, n] of Object.entries(consumo)) {
    if (NOVO.test(nome)) caixas.novo.push([nome, n])
    else if (NAO_COR.test(nome)) caixas.naoCor.push([nome, n])
    else if (CASCA.test(nome)) caixas.naoCor.push([nome, n])
    else if (REDECLARADAS.has(nome)) caixas.coberto.push([nome, n])
    /* --dp-* tem mapa próprio (bloco 6). --bs-* e --swal2-* NÃO TÊM — a 1ª rodada
       os marcou como cobertos por engano, e o runtime provou o contrário
       (#0d6efd, #198754, #7066e0 vazando). Ficam como descobertos até o mapa. */
    else if (/^--dp-/.test(nome)) caixas.coberto.push([nome, n])
    else caixas.DESCOBERTO.push([nome, n])
  }

  // ── 2 · runtime: cada legada de cor resolve para a paleta nova?
  const legadas = [...caixas.coberto, ...caixas.DESCOBERTO].map(([n]) => n)
    .filter((n) => /color|--dp-|--bs-body|--ath-link|--ath-icon/.test(n))
  const resolucao = await p.evaluate((nomes) => {
    const cs = getComputedStyle(document.documentElement)
    const alvo = document.querySelector('.palco') || document.body
    const csA = getComputedStyle(alvo)
    const out = {}
    for (const n of nomes) {
      const v = (csA.getPropertyValue(n) || cs.getPropertyValue(n)).trim()
      if (v) out[n] = v
    }
    return out
  }, legadas)

  const foraDaPaleta = []
  for (const [nome, valor] of Object.entries(resolucao)) {
    const hex = valor.toLowerCase().match(/#[0-9a-f]{6}\b/)?.[0]
    if (!hex) continue      /* rgba com canais, gradiente, sombra */
    if (!HEX_NOVOS.has(hex)) foraDaPaleta.push(`${nome} → ${valor}`)
  }

  console.log('══ consumo de var() no CSS servido')
  console.log(`   tokens novos ......... ${caixas.novo.length} nomes`)
  console.log(`   legados cobertos ..... ${caixas.coberto.length} nomes`)
  console.log(`   legados DESCOBERTOS .. ${caixas.DESCOBERTO.length} nomes`)
  console.log(`   não-cor .............. ${caixas.naoCor.length} nomes`)
  if (caixas.DESCOBERTO.length) {
    console.log('\n── DESCOBERTOS (consumidos e sem redeclaração — vazamento potencial):')
    caixas.DESCOBERTO.sort((a, b) => b[1] - a[1])
      .forEach(([n, q]) => console.log(`   ${n}  ×${q}`))
  }
  console.log(`\n══ resolução em runtime (modo "novas"): ${foraDaPaleta.length} legada(s) resolvendo FORA da paleta`)
  foraDaPaleta.forEach((x) => console.log('   ' + x))

  fs.writeFileSync(path.join(__dirname, 'auditoria-variaveis.json'),
    JSON.stringify({ caixas, resolucao, foraDaPaleta }, null, 1))
  await b.close()
})()
