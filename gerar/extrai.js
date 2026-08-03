/* Extrai do estudo o ESTADO-PADRÃO de cada componente: o HTML da coluna do
   padrão (ou da única coluna, quando não há comparação), os tokens citados no
   lado do padrão, e o grupo. Nada do lado "Hoje" é levado. */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright');
const fs = require('fs');
const F='file:///Users/pauloricardo/Desktop/Design System/VS Code/estudo-de-cores/index.html';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(F); await p.waitForTimeout(900);
  const dados = await p.evaluate(() => {
    const RE_TOKEN = /\b(Background|Content|Border|Control|Overlay)\/[A-Za-z]+\b/g;
    const out = [];
    document.querySelectorAll('.panel').forEach(panel => {
      const grupo = (panel.querySelector('.page-head__eyebrow') || {}).textContent || '';
      if (!grupo) return;
      const id = panel.getAttribute('data-panel');
      const titulo = (panel.querySelector('h3') || {}).textContent.trim();
      const situacao = panel.getAttribute('data-situacao');
      const why = (panel.querySelector('.why') || {}).textContent || '';
      const hint = (panel.querySelector('.hint') || {}).textContent || '';
      const prop = panel.querySelector('.col.proposed');
      let html = '', legenda = '', subtitulo = '';
      if (prop) {
        const card = prop.querySelector('.col-card');
        html = card ? card.innerHTML : '';
        const lg = prop.querySelector('.legend');
        legenda = lg ? lg.innerText : '';
        const sub = prop.querySelector('.col-head span');
        subtitulo = sub ? sub.textContent : '';
        var classesCol = prop.className;
      } else {
        /* Sem comparação: pega tudo que não é texto explicativo nem casca. */
        const partes = Array.from(panel.children).filter(el =>
          !el.classList.contains('page-head') && !el.classList.contains('why') &&
          !el.classList.contains('hint') && !el.classList.contains('facil-card') &&
          !el.classList.contains('page-actions') && !el.classList.contains('legend'));
        html = partes.map(el => {
          if (el.classList.contains('col')) {
            const card = el.querySelector('.col-card');
            return card ? card.innerHTML : el.innerHTML;
          }
          return el.outerHTML;
        }).join('\n');
        const lg = panel.querySelector('.legend');
        legenda = lg ? lg.innerText : '';
        var classesCol = (panel.querySelector('.col') || {}).className || '';
      }
      const fonteTokens = (prop ? (subtitulo + ' ' + legenda) : (why + ' ' + legenda));
      const tokens = Array.from(new Set((fonteTokens.match(RE_TOKEN) || [])));
      const tokensNoWhy = Array.from(new Set((why.match(RE_TOKEN) || [])));
      out.push({ id, grupo, titulo, situacao, why, hint, subtitulo, legenda, html, tokens, tokensNoWhy, classesCol: classesCol || '' });
    });
    return out;
  });
  fs.writeFileSync('extraido.json', JSON.stringify(dados, null, 1));
  console.log('componentes:', dados.length);
  const porSit = {}; dados.forEach(d => porSit[d.situacao] = (porSit[d.situacao]||0)+1);
  console.log('por situação:', porSit);
  console.log('sem HTML:', dados.filter(d => !d.html.trim()).map(d => d.id));
  console.log('sem token identificado:', dados.filter(d => !d.tokens.length && !d.tokensNoWhy.length).map(d => d.id).length);
  await b.close();
})();
