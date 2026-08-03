const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/sistema-de-cores-prints';
require('fs').mkdirSync(OUT, { recursive: true });
const F='file:///Users/pauloricardo/Desktop/Design System/VS Code/sistema-de-cores/index.html';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const err=[]; p.on('pageerror',e=>err.push('PAGEERROR: '+e.message)); p.on('console',m=>{if(m.type()==='error')err.push(m.text());});
  await p.goto(F); await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({
    paineis: document.querySelectorAll('.ds-panel').length,
    menu: document.querySelectorAll('.ds-nav__i').length,
    ativa: (document.querySelector('.ds-panel.on')||{}).dataset?.p,
    hash: location.hash,
    tokens: document.querySelectorAll('.tok').length,
    familias: document.querySelectorAll('.fam').length,
    passosIA: document.querySelectorAll('.ia-passos > li').length,
    camadasNomen: document.querySelectorAll('.nomen-cam').length,
    setasNomen: document.querySelectorAll('.nomen-svg path').length,
    chips: document.querySelectorAll('.tok-chip').length,
    pastilhas: document.querySelectorAll('.cr').length,
    rail: document.querySelectorAll('#dsRailNav a').length,
  }));
  console.log(JSON.stringify(r,null,1));
  // hex fora da paleta, no DOM renderizado
  const fora = await p.evaluate(() => {
    const validos = new Set();
    document.querySelectorAll('.tok').forEach(t => validos.add(t.dataset.hex));
    ['#ffffff','#fff','#12181c','#000000'].forEach(h=>validos.add(h));
    /* AMOSTRA DE COR É DADO, não cor da interface.
       Um quadradinho que existe só para exibir um valor — o do cartão, o do chip,
       a faixa de família e, desde a visão em lista, a amostra do tema ESCURO —
       mostra por definição um hex que não pertence à paleta clara. A 1ª versão
       desta checagem só isentava os valores do tema claro (via `data-hex` dos
       cartões), então a coluna do escuro apareceu como violação: #7AA0FF e
       #162872 acusados na Paleta. O critério certo não é "esse hex está na
       lista?", é "esse elemento é amostra ou é interface?". */
    const AMOSTRAS = '.tok__cor, .pal-cel__sw, .tok-chip__sw, .fam__band, .cr__sw';
    const achados = {};
    document.querySelectorAll('.ds-panel').forEach(pan => {
      pan.querySelectorAll('[style]').forEach(el => {
        if (el.matches(AMOSTRAS) || el.closest(AMOSTRAS)) return;
        (el.getAttribute('style').match(/#[0-9a-fA-F]{6}\b/g)||[]).forEach(h => {
          if(!validos.has(h.toLowerCase())) (achados[h.toLowerCase()] = achados[h.toLowerCase()]||[]).push(pan.dataset.p);
        });
      });
    });
    return Object.entries(achados).map(([h,ids])=>({hex:h, n:ids.length, ex:[...new Set(ids)].slice(0,4)}));
  });
  console.log('hex fora da paleta no DOM:', fora.length ? fora : 'nenhum');
  // varre todas as páginas: erro, overflow
  const over = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.ds-nav__i').forEach(b => {
      b.click();
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(b.textContent.trim());
    });
    return out;
  });
  console.log('overflow horizontal:', over.length ? over : 'nenhuma página');
  await p.evaluate(()=>document.querySelector('.ds-nav__i[data-p="fundamentos"]').click());
  await p.screenshot({ path: OUT + '/x1-fundamentos.png' });
  await p.evaluate(()=>document.querySelector('.ds-nav__i[data-p="paleta"]').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/x2-paleta.png' });
  await p.evaluate(()=>document.querySelector('.ds-nav__i[data-p="papeis"]').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/x3-papeis.png' });
  await p.evaluate(()=>document.querySelector('.ds-nav__i[data-p="nomenclatura"]').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/x4-nomenclatura.png' });
  await p.evaluate(()=>document.querySelector('.ds-nav__i[data-p="instrucoes-ia"]').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/x4b-instrucoes-ia.png' });
  await p.evaluate(()=>document.querySelector('.ds-nav__i[data-p="edsbutton"]').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/x5-componente.png' });
  await p.evaluate(()=>{document.documentElement.setAttribute('data-t','escuro');document.querySelector('.ds-nav__i[data-p="paleta"]').click();}); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/x6-paleta-escuro.png' });
  console.log('ERROS:', err.length?err:'nenhum');
  await b.close();
})();
