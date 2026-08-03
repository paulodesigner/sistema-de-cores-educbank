/* Tokens de cada componente, MEDIDOS no navegador.
   A dedução por estilo inline não vê o que vem de regra CSS — e é de regra CSS
   que vêm as cores dos botões (`.col.proposed .btn.primary`), por exemplo. Aqui
   a cor efetiva de cada elemento do componente é lida com getComputedStyle e
   traduzida para o token correspondente, por CATEGORIA:
     background-color -> Background/…   color -> Content/…
     border-color / outline-color -> Border/…   accent-color -> Control/…
   Valores legados são convertidos para o valor do padrão antes do mapeamento
   (a mesma lista de trocas do gera.py). */
const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright');
const fs = require('fs');

const TROCAS = {
  '#1a1a1a': '#002a3a', '#7d8097': '#666666', '#a6a6a6': '#666666', '#2d3849': '#575e6a',
  '#665200': '#6f5d00', '#7a4b00': '#6b2300', '#e3e4e9': '#cccccc', '#8a76eb': '#6b55d8',
  '#898989': '#8c8c8c', '#cca300': '#ae9300', '#e2e2e2': '#f2f2f2', '#f7c9c9': '#ffafa0',
  '#333333': '#002a3a', '#5b5f66': '#575e6a', '#f2f0fc': '#f3f1ff', '#eef0f4': '#f2f2f2',
  '#8a8e94': '#666666'
};

(async () => {
  const paleta = JSON.parse(fs.readFileSync(__dirname + '/paleta.json', 'utf8')).paleta;
  const porHex = {};
  paleta.forEach(p => { (porHex[p.hex.toLowerCase()] = porHex[p.hex.toLowerCase()] || []).push(p.nome); });

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file:///Users/pauloricardo/Desktop/Design System/VS Code/estudo-de-cores/index.html');
  await p.waitForTimeout(900);

  const cru = await p.evaluate(() => {
    const hex = (s) => {
      if (!s) return null;
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const v = m[1].split(',').map(x => parseFloat(x.trim()));
      const a = v.length > 3 ? v[3] : 1;
      if (a === 0) return null;
      if (a < 0.95) return 'alpha:' + Math.round(v[0]) + ',' + Math.round(v[1]) + ',' + Math.round(v[2]) + ',' + a;
      return '#' + v.slice(0, 3).map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
    };
    const out = {};
    document.querySelectorAll('.panel').forEach(pan => {
      if (!pan.querySelector('.page-head__eyebrow')) return;
      const id = pan.getAttribute('data-panel');
      pan.classList.add('active');
      const alvo = pan.querySelector('.col.proposed .col-card') || pan.querySelector('.col-card') || pan;
      const achados = [];
      alvo.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;   /* divisor de 1px conta */
        /* Divisor e trilho são implementados como background de uma div fina.
           A intenção ali é BORDA, não fundo — senão o AthHr fica sem token. */
        const fino = r.height <= 3 || r.width <= 3;
        const bg = hex(cs.backgroundColor); if (bg) achados.push([fino ? 'Border' : 'Background', bg]);
        const ehSvg = el.tagName === 'svg' || el.tagName === 'use' || el.tagName === 'path';
        const fg = hex(cs.color);
        /* Ícone não tem textContent, e stroke/fill costumam ser currentcolor:
           sem esta linha, componente cuja única cor é o ícone ficava sem token. */
        if (fg && ((el.textContent || '').trim().length || ehSvg)) achados.push(['Content', fg]);
        if (parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0) {
          const bc = hex(cs.borderTopColor) || hex(cs.borderLeftColor); if (bc) achados.push(['Border', bc]);
        }
        if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
          const oc = hex(cs.outlineColor); if (oc) achados.push(['Border', oc]);
        }
        const ac = hex(cs.accentColor); if (ac && cs.accentColor !== 'auto') achados.push(['Control', ac]);
        if (ehSvg) { const sc = hex(cs.stroke) || hex(cs.fill); if (sc) achados.push(['Content', sc]); }
      });
      pan.classList.remove('active');
      out[id] = achados;
    });
    return out;
  });

  const resultado = {};
  Object.entries(cru).forEach(([id, pares]) => {
    const nomes = new Set();
    pares.forEach(([cat, val]) => {
      if (val.startsWith('alpha:')) {
        const [r, g, bl, a] = val.slice(6).split(',').map(Number);
        if (r < 60 && g < 60 && bl < 60 && a >= 0.35 && a <= 0.65) nomes.add('Overlay/Scrim');
        return;
      }
      const alvo = TROCAS[val] || val;
      const naCategoria = (porHex[alvo] || []).filter(n => n.startsWith(cat + '/'));
      if (naCategoria.length) { naCategoria.forEach(n => nomes.add(n)); return; }
      /* Sem token naquela categoria: o valor É da paleta, só está aplicado por
         outra propriedade. Registra o nome que existe, em vez de perder a cor. */
      (porHex[alvo] || []).forEach(n => nomes.add(n));
    });
    const ordem = { Background: 0, Content: 1, Border: 2, Control: 3, Overlay: 4 };
    resultado[id] = [...nomes].sort((x, y) =>
      (ordem[x.split('/')[0]] - ordem[y.split('/')[0]]) || x.localeCompare(y));
  });

  fs.writeFileSync(__dirname + '/tokens-medidos.json', JSON.stringify(resultado, null, 1));
  const vazios = Object.entries(resultado).filter(([, v]) => !v.length).map(([k]) => k);
  const soma = Object.values(resultado).reduce((a, v) => a + v.length, 0);
  console.log('componentes medidos:', Object.keys(resultado).length, '| tokens no total:', soma,
              '| média:', (soma / Object.keys(resultado).length).toFixed(1));
  console.log('sem nenhum token medido:', vazios.length, vazios.slice(0, 10));
  console.log('exemplo edsbutton:', resultado['edsbutton']);
  await b.close();
})();
