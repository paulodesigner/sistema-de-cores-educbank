const { chromium } = require('/Users/pauloricardo/Desktop/Design System/VS Code/EducbankPay/webclient/node_modules/playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///Users/pauloricardo/Desktop/Design System/VS Code/estudo-de-cores/index.html');
  await p.waitForTimeout(700);
  // paleta + famílias + varmap, direto das funções do artefato
  const d = await p.evaluate(() => {
    const script = Array.from(document.scripts).find(s => s.textContent.includes('getPaletteData'));
    return { ok: !!script };
  });
  // não há como chamar as funções internas do IIFE: reconstruo pelo DOM da paleta
  const paleta = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.panel[data-panel="paleta"] .palette-grid').forEach(grid => {
      const grupo = grid.previousElementSibling.textContent.trim();
      grid.querySelectorAll('.palette-swatch').forEach(sw => {
        const nome = sw.querySelector('.palette-swatch__name').textContent.replace(/\s*novo\s*$/,'').trim();
        const hex = sw.querySelector('.palette-swatch__hex').textContent.trim();
        const nota = sw.querySelector('.palette-swatch__note').textContent.trim();
        const dark = sw.querySelector('.palette-swatch__dark');
        const varLinha = sw.querySelector('.varline code');
        const tag = sw.querySelector('.var-tag');
        out.push({ grupo, nome, hex, nota,
          dark: dark ? dark.textContent.replace(/escuro \(proposta\)/,'').trim() : '',
          cssVar: varLinha ? varLinha.textContent : '', situacao: tag ? tag.textContent : '' });
      });
    });
    return out;
  });
  const familias = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('.panel[data-panel="papeis"] .role-fam')).map(f => ({
      nome: f.querySelector('.role-fam__name').textContent.trim(),
      nota: f.querySelector('.role-fam__note').innerHTML,
      faixas: Array.from(f.querySelectorAll('.role-band')).map(bd => ({
        papel: bd.textContent.trim(), claro: bd.getAttribute('data-l'), parClaro: bd.getAttribute('data-lp'),
        escuro: bd.getAttribute('data-d'), parEscuro: bd.getAttribute('data-dp')
      })),
      pares: f.querySelector('.role-pairs').innerText
    }));
  });
  const superficies = await p.evaluate(() => Array.from(document.querySelectorAll('.panel[data-panel="papeis"] .surface-row')).map(r => ({
    nome: r.querySelector('.surface-row__name').textContent, desc: r.querySelector('.surface-row__desc').textContent,
    hex: r.querySelector('.surface-row__hex').innerText
  })));
  const alias = await p.evaluate(() => Array.from(document.querySelectorAll('.panel[data-panel="papeis"] .alias')).map(a => ({
    hex: a.querySelector('.alias__hex').textContent,
    papeis: Array.from(a.querySelectorAll('.alias__role')).map(r => ({ nome: r.querySelector('b').textContent, uso: r.querySelector('span').textContent }))
  })));
  fs.writeFileSync('paleta.json', JSON.stringify({ paleta, familias, superficies, alias }, null, 1));
  console.log('paleta:', paleta.length, '| famílias:', familias.length, '| superfícies:', superficies.length, '| alias:', alias.length);
  await b.close();
})();
