const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright');
const F='file:///Users/pauloricardo/Desktop/Design System/VS Code/sistema-de-cores/index.html';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(F); await p.waitForTimeout(600);
  for (const t of ['claro','escuro']) {
    await p.evaluate(x => document.documentElement.setAttribute('data-t', x), t);
    for (const pag of ['fundamentos','paleta','papeis','regras','edsbutton']) {
      await p.evaluate(x => document.querySelector('.ds-nav__i[data-p="'+x+'"]').click(), pag);
    }
    await p.evaluate(() => document.querySelector('.ds-nav__i[data-p="paleta"]').click());
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => {
      function lum(rgb){const c=rgb.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
      const parse = s => (s.match(/\d+/g)||[0,0,0]).slice(0,3).map(Number);
      const cr=(a,bb)=>{const la=lum(a),lb=lum(bb);return +((Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05)).toFixed(2)};
      function fundo(el){ let n=el; while(n && n!==document.documentElement){ const c=getComputedStyle(n).backgroundColor; if(c && !/rgba\(0, 0, 0, 0\)/.test(c)) return parse(c); n=n.parentElement; } return [255,255,255]; }
      const sel = ['.ds-top__nome','.ds-top__nome em','.ds-top__meta','.ds-nav__i','.ds-nav__i[aria-selected="true"]','.ds-nav__g',
        '.ds-lead','.ds-p','.ds-h3','.ds-box b','.ds-box span','.ds-rail a','.ds-rail__t','.tok__nome','.tok__hex','.tok__var','.tok__uso',
        '.tok__escuro span','.tok__escuro code','.ds-copy','.ds-side__busca input','.ds-side__busca kbd','.ds-busca-inline input','.tok-chip','.fam__nome','.fam__contorno','.fam__pares','.regra__t','.regra__d','.ds-esq button','.ds-esq button[aria-pressed="true"]','.alias__count','.alias__role span','.ds-topo'];
      const out = [];
      sel.forEach(s => {
        const el = document.querySelector(s); if(!el) { out.push([s,'ausente']); return; }
        const cs = getComputedStyle(el);
        const px = parseFloat(cs.fontSize), grande = px>=18.66 || (px>=14 && +cs.fontWeight>=700);
        out.push([s, cr(parse(cs.color), fundo(el)), cs.fontSize, cs.fontWeight, grande?3:4.5]);
      });
      return out;
    });
    const ruins = r.filter(x => x[1] !== 'ausente' && x[1] < x[4]);
    console.log('=== ' + t + ' — medidos: ' + r.length + ' | reprovando: ' + ruins.length);
    ruins.forEach(x => console.log('   ' + x[1] + ':1  ' + x[2] + ' w' + x[3] + '  ' + x[0] + '  (piso ' + x[4] + ')'));
    const aus = r.filter(x => x[1] === 'ausente').map(x => x[0]);
    if (aus.length) console.log('   ausentes:', aus.join(', '));
  }
  await b.close();
})();
