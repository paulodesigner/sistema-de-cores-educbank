const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright');
const fs = require('fs');
const BASE = 'http://localhost:4173';
const reg = JSON.parse(fs.readFileSync('' + __dirname + '/src/registry/componentes.json', 'utf8'));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const ok = [], falhou = [];
  for (const c of reg) {
    await p.goto(`${BASE}/#/doc/${c.id}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(260);
    const r = await p.evaluate(() => {
      const palco = document.querySelector('.palco');
      if (!palco) return { estado: 'sem-palco' };
      const erro = palco.querySelector('.palco__erro');
      if (erro) return { estado: 'erro', msg: erro.innerText.replace(/\n/g, ' ').slice(0, 120) };
      /* Modal usa Teleport: renderiza no body, fora do palco. Contar só dentro
         do palco daria falso negativo. */
      const teleportado = [...document.querySelectorAll('body > div:not(#app)')].find((d) => d.getBoundingClientRect().height > 30);
      const filhos = palco.children.length || (teleportado ? 1 : 0);
      const altura = Math.round(palco.getBoundingClientRect().height);
      const temTexto = (palco.innerText || '').trim().length > 0
        || !!palco.querySelector('input, svg, em[class*="ph-"], img, .box, canvas');
      const temPintura = Array.from(palco.querySelectorAll('*')).some(el => {
        const cs = getComputedStyle(el);
        return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px';
      });
      return { estado: filhos ? 'montou' : 'vazio', filhos, altura, temTexto, temPintura };
    });
    if (r.estado === 'montou') ok.push({ id: c.id, ...r }); else falhou.push({ id: c.id, ...r });
  }
  console.log('montaram:', ok.length, '| não montaram:', falhou.length, 'de', reg.length);
  console.log('\n--- não montaram:');
  falhou.forEach(f => console.log('  ' + f.id.padEnd(34) + f.estado + '  ' + (f.msg || '')));
  const sem = ok.filter(o => !o.temTexto && !o.temPintura);
  console.log('\nmontaram mas parecem vazios:', sem.length, sem.map(s=>s.id).slice(0,12));
  fs.writeFileSync('cobertura-comps.json', JSON.stringify({ ok, falhou }, null, 1));
  await b.close();
})();
