  /* ══ Comportamento da documentação ══
     Contraste é sempre MEDIDO aqui, nunca escrito: se um valor mudar na
     paleta, o número acompanha. Âncora é semântica (id vem do conteúdo, não
     da posição), e o link da aba entra no endereço — é o que faz o link ser
     compartilhável. */
  var raiz = document.documentElement;

  function lum(hex){
    var c = [1,3,5].map(function(i){
      var v = parseInt(hex.slice(i, i+2), 16) / 255;
      return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
  }
  function contraste(a, b){
    var la = lum(a), lb = lum(b);
    return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
  }
  function pastilha(a, b){
    var r = contraste(a, b);
    var cls = r >= 4.5 ? 'ok' : (r >= 3 ? 'meio' : 'nao');
    var sinal = r >= 4.5 ? '✓' : (r >= 3 ? '◐' : '✕');
    var titulo = r >= 4.5 ? 'Passa para texto de qualquer tamanho'
      : (r >= 3 ? 'Passa para borda, ícone e texto grande' : 'Abaixo do mínimo');
    return '<span class="cr cr--' + cls + '" title="' + titulo + '">' +
      r.toFixed(2).replace('.', ',') + ':1 ' + sinal + '</span>';
  }

  /* ── Navegação ─────────────────────────────────────────────────────── */
  var nav = document.querySelector('.ds-nav');
  var paineis = Array.prototype.slice.call(raizPaineis.querySelectorAll('.ds-panel'));
  var railNav = document.getElementById('dsRailNav');
  var rail = document.getElementById('dsRail');

  function slug(s){
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 44);
  }
  /* Ids nascem no boot em TODOS os painéis, não só no visível: âncora de aba
     fechada também precisa existir pra um link chegar nela. */
  paineis.forEach(function(p){
    var pid = p.getAttribute('data-p');
    Array.prototype.forEach.call(p.querySelectorAll('.ds-h3, .fam, .regra'), function(el){
      if(el.id) return;
      var rotulo = el.classList.contains('ds-h3') ? el.textContent
        : (el.querySelector('.fam__nome, .regra__t') || {}).textContent;
      if(rotulo) el.id = pid + '--' + slug(rotulo);
    });
  });

  function montaRail(painel){
    railNav.innerHTML = '';
    var itens = painel.querySelectorAll('.ds-h3[id]');
    Array.prototype.forEach.call(itens, function(h){
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      railNav.appendChild(a);
    });
    rail.style.visibility = itens.length ? '' : 'hidden';
  }

  function abrir(pid, opts){
    opts = opts || {};
    var alvo = raizPaineis.querySelector('.ds-panel[data-p="' + pid + '"]');
    if(!alvo) return null;
    paineis.forEach(function(p){ p.classList.toggle('on', p === alvo); });
    Array.prototype.forEach.call(nav.querySelectorAll('.ds-nav__i'), function(b){
      b.setAttribute('aria-selected', String(b.getAttribute('data-p') === pid));
    });
    montaRail(alvo);
    syncSegPills(alvo);
    if(opts.hash !== false){ try { history.replaceState(null, '', '#' + pid); } catch(e){} }
    if(opts.scroll !== false) window.scrollTo(0, 0);
    return alvo;
  }
  nav.addEventListener('click', function(e){
    var b = e.target.closest('.ds-nav__i'); if(!b) return;
    abrir(b.getAttribute('data-p'));
  });
  function doHash(){
    var h = (location.hash || '').replace(/^#/, '');
    if(!h) return false;
    var pid = h.split('--')[0];
    if(!abrir(pid, { hash:false, scroll:false })) return false;
    var alvo = document.getElementById(h);
    if(alvo){ alvo.scrollIntoView(); window.scrollBy(0, -12); } else { window.scrollTo(0, 0); }
    return true;
  }
  window.addEventListener('hashchange', doHash);

  /* ── Busca do menu ─────────────────────────────────────────────────── */
  var buscaNav = document.getElementById('buscaNav');
  buscaNav.addEventListener('input', function(){
    var q = this.value.trim().toLowerCase();
    var grupo = null, temGrupo = false;
    Array.prototype.forEach.call(nav.children, function(el){
      if(el.classList.contains('ds-nav__g')){
        if(grupo) grupo.style.display = temGrupo ? '' : 'none';
        grupo = el; temGrupo = false; return;
      }
      var bate = !q || el.textContent.toLowerCase().indexOf(q) !== -1;
      el.style.display = bate ? '' : 'none';
      if(bate) temGrupo = true;
    });
    if(grupo) grupo.style.display = temGrupo ? '' : 'none';
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== '/' || document.activeElement === buscaNav) return;
    var t = document.activeElement && document.activeElement.tagName;
    if(t === 'INPUT' || t === 'TEXTAREA') return;
    e.preventDefault(); buscaNav.focus();
  });

  /* ── Filtro da paleta ──────────────────────────────────────────────── */
  var buscaToken = document.getElementById('buscaToken');
  if(buscaToken){
    var conta = document.getElementById('buscaConta');
    var todosToks = Array.prototype.slice.call(document.querySelectorAll('.tok'));
    var atualiza = function(){
      var q = buscaToken.value.trim().toLowerCase();
      var vis = 0;
      todosToks.forEach(function(t){
        var bate = !q || t.textContent.toLowerCase().indexOf(q) !== -1;
        t.style.display = bate ? '' : 'none';
        if(bate) vis++;
      });
      Array.prototype.forEach.call(document.querySelectorAll('.tok-grid'), function(g){
        var algum = Array.prototype.some.call(g.querySelectorAll('.tok'), function(t){ return t.style.display !== 'none'; });
        g.style.display = algum ? '' : 'none';
        var tit = g.previousElementSibling;
        if(tit && tit.classList.contains('ds-h3')) tit.style.display = algum ? '' : 'none';
      });
      conta.textContent = q ? vis + ' de ' + todosToks.length : '';
    };
    buscaToken.addEventListener('input', atualiza);
  }

  /* ── Papéis: pares medidos + troca de esquema ──────────────────────── */
  function medePares(){
    var escuro = !!document.querySelector('.ds-esq button[data-esq="escuro"][aria-pressed="true"]');
    Array.prototype.forEach.call(document.querySelectorAll('.fam'), function(fam){
      var bandas = fam.querySelectorAll('.fam__band');
      if(bandas.length < 4) return;
      var v = function(el){ return escuro ? el.getAttribute('data-d') : el.getAttribute('data-l'); };
      var p = function(el){ return escuro ? el.getAttribute('data-dp') : el.getAttribute('data-lp'); };
      Array.prototype.forEach.call(bandas, function(bd){
        bd.style.background = v(bd); bd.style.color = p(bd);
      });
      var linhas = [
        'preenchimento ' + v(bandas[0]).toUpperCase() + ' + ' + p(bandas[0]).toUpperCase() + ' ' + pastilha(v(bandas[0]), p(bandas[0])),
        'contêiner ' + v(bandas[2]).toUpperCase() + ' + ' + p(bandas[2]).toUpperCase() + ' ' + pastilha(v(bandas[2]), p(bandas[2]))
      ];
      fam.querySelector('[data-pares]').innerHTML = linhas.map(function(l){ return '<div>' + l + '</div>'; }).join('');
    });
  }
  var esq = document.querySelector('.ds-esq');
  if(esq){
    esq.addEventListener('click', function(e){
      var b = e.target.closest('button[data-esq]'); if(!b) return;
      Array.prototype.forEach.call(esq.querySelectorAll('button'), function(x){
        x.setAttribute('aria-pressed', String(x === b));
      });
      medePares();
    });
    medePares();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-cr]'), function(el){
    var par = el.getAttribute('data-cr').split('|');
    el.innerHTML = pastilha(par[0], par[1]);
  });

  /* ── Aviso passageiro (toast) ───────────────────────────────────────
     A confirmação de "copiado" aparece AQUI, no topo, e não trocando o texto do
     próprio botão. A versão antiga fazia `b.textContent = 'copiado'` e restaurava
     depois — o que destruía o conteúdo do botão: nos chips de token há um SWATCH
     (`<span class="tok-chip__sw">`) dentro, e sobrescrever o texto apagava o
     quadradinho de cor de vez, porque a restauração devolvia só a string.
     `role=status` + `aria-live` porque o aviso É a confirmação da ação. */
  var caixaAviso = null, timerAviso = null;
  function avisar(texto, eco){
    if(!caixaAviso || !document.body.contains(caixaAviso)){
      caixaAviso = document.createElement('div');
      caixaAviso.className = 'ds-aviso';
      caixaAviso.setAttribute('role','status');
      caixaAviso.setAttribute('aria-live','polite');
      document.body.appendChild(caixaAviso);
    }
    caixaAviso.innerHTML = '';
    var m = document.createElement('span'); m.className='ds-aviso__t'; m.textContent = texto;
    caixaAviso.appendChild(m);
    if(eco){
      /* eco truncado: copiar um LINK produz 90+ caracteres e o aviso virava uma
         faixa atravessando a tela. 44 bastam para reconhecer o que foi copiado. */
      var c = document.createElement('code'); c.className = 'ds-aviso__c';
      c.textContent = eco.length > 44 ? eco.slice(0, 44) + '\u2026' : eco;
      c.title = eco;
      caixaAviso.appendChild(c);
    }
    caixaAviso.classList.remove('is-on');
    void caixaAviso.offsetWidth;   /* reinicia a animação em cliques seguidos */
    caixaAviso.classList.add('is-on');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function(){ caixaAviso.classList.remove('is-on'); }, 2200);
  }

  /* ── Paleta: alternador de visão (cartões ↔ lista) ───────────────────
     A escolha é lembrada porque as duas visões servem tarefas diferentes: quem
     está comparando pares fica na lista por vários minutos, e voltar para os
     cartões a cada navegação anularia o motivo de ter as duas. */
  var CHAVE_VISAO = 'sistema-de-cores:visao-paleta';
  function aplicarVisao(qual){
    var corpo = document.querySelector('.pal-corpo');
    if(!corpo) return;
    corpo.setAttribute('data-visao', qual);
    var bs = document.querySelectorAll('.pal-visao [data-visao]');
    for(var i=0;i<bs.length;i++){
      bs[i].setAttribute('aria-pressed', String(bs[i].getAttribute('data-visao') === qual));
    }
    try { localStorage.setItem(CHAVE_VISAO, qual); } catch(e){}
  }
  function restaurarVisao(){
    var salva = null;
    try { salva = localStorage.getItem(CHAVE_VISAO); } catch(e){}
    if(salva === 'lista' || salva === 'cartoes') aplicarVisao(salva);
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('.pal-visao [data-visao]');
    if(!b) return;
    aplicarVisao(b.getAttribute('data-visao'));
  });

  /* ── Copiar ────────────────────────────────────────────────────────── */
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-copy]'); if(!b) return;
    e.preventDefault();
    var txt = b.getAttribute('data-copy');
    /* o botão NÃO é alterado: aviso global + pulso local por classe */
    var ok = function(){
      avisar('Copiado', txt);
      b.classList.remove('copiou');
      void b.offsetWidth;
      b.classList.add('copiou');
      setTimeout(function(){ b.classList.remove('copiou'); }, 700);
    };
    var manual = function(){
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch(err){}
      document.body.removeChild(ta);
    };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, manual);
    else manual();
  });

  /* ── Claro e escuro ────────────────────────────────────────────────── */
  var temaBtn = document.getElementById('temaBtn');
  var temaIcone = temaBtn.querySelector('use');
  function tema(t){
    raiz.setAttribute('data-t', t);
    temaIcone.setAttribute('href', t === 'escuro' ? '#i-moon' : '#i-sun');
    temaBtn.setAttribute('aria-label', t === 'escuro' ? 'Mudar para claro' : 'Mudar para escuro');
    try { localStorage.setItem('ds.tema', t); } catch(e){}
  }
  temaBtn.addEventListener('click', function(){
    tema(raiz.getAttribute('data-t') === 'escuro' ? 'claro' : 'escuro');
  });
  var salvo = null;
  try { salvo = localStorage.getItem('ds.tema'); } catch(e){}
  tema(salvo || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'));

  /* ── Voltar ao topo ────────────────────────────────────────────────── */
  var topo = document.getElementById('dsTopo');
  window.addEventListener('scroll', function(){
    topo.setAttribute('data-v', window.scrollY > 600 ? '1' : '0');
  }, { passive:true });
  topo.addEventListener('click', function(){ window.scrollTo({ top:0, behavior:'smooth' }); });

  /* ── Estado inicial ────────────────────────────────────────────────── */
  if(!doHash()) abrir('fundamentos', { scroll:false });
  restaurarVisao();
