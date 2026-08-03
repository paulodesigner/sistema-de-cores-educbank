# Sistema de Cores — Arquitetura de informação

> Gerado do código em 2026-08-02, antes da auditoria tripla de tokens legados.
> É o mapa do que EXISTE — cada nó daqui é uma superfície onde cor pode aparecer,
> e portanto uma superfície que a auditoria precisa cobrir. A regra do projeto:
> **toda superfície consome os tokens novos, exceto o modo "Cores hoje"**, cujo
> papel é justamente mostrar a produção como está.

## O interruptor global (vale para TODAS as superfícies)

```
┌────────────────────────────────────────────────────────────────────┐
│  data-cores="novas"  (padrão) → tokens novos + 34 blocos de fix    │
│  (sem atributo)      "hoje"   → o produto como está em produção    │
│                                  ÚNICA superfície onde cor antiga  │
│                                  é o comportamento CORRETO         │
└────────────────────────────────────────────────────────────────────┘
```

## Árvore de superfícies

```
sistema-de-cores (app vivo, localhost:4173)
│
├── CATÁLOGO  #/doc/:pid  (casca da ferramenta: topo + menu + painel + trilho)
│   │
│   ├── Abas editoriais (conteúdo gerado do artefato estático)
│   │   ├── fundamentos      · texto + amostras
│   │   ├── paleta           · 78 tokens — DUAS VISÕES (cartões ↔ lista) + filtro
│   │   ├── papeis           · faixas de par medido, claro/escuro
│   │   ├── regras           · as 10 regras de uso
│   │   └── paginas          · índice das 6 páginas reais
│   │
│   └── 108 páginas de componente (1 rota cada), em 8 grupos
│       ├── Botões (3) · Campos de formulário (28) · Navegação (17)
│       ├── Textos (8) · Feedback (33) · Dados (11) · Ícones (1) · Layout (7)
│       │
│       └── CADA página tem 4 sub-superfícies:
│           ├── palco em REPOUSO
│           ├── palco em INTERAÇÃO (hover · foco por teclado)
│           ├── estado ABERTO (dropdown, calendário, acordeão, aba)
│           └── SOBREPOSIÇÃO (modal/painel — 8 componentes com gatilho:
│               athmodal · athmodalcenter · athmodalinformation ·
│               athguardianinfomodal · changepassword · modalmfavalidated ·
│               securityaccount · phoneverificationmodal)
│               ⚠ a sobreposição pode montar DENTRO da vitrine, no #app fora
│                 dela, ou TELEPORTADA para o <body> — as três variantes
│                 precisam de cobertura própria (lição 24)
│
├── PÁGINAS REAIS  #/pagina/:pid  (shell completo do produto: sidebar + top bar)
│   ├── matricula (Funil) · home · faturas · repasses · turmas · alunos
│   ├── cada uma com: repouso · interação · filtros abertos · barra da
│   │   ferramenta (voltar + switch novas/hoje)
│   └── ⚠ FURO CONHECIDO: o menu lateral navega para as rotas REAIS do produto
│       (#/atividades, #/matriculas, #/captacao, #/relatorios, #/cobrancas,
│       #/credito, #/configuracoes…) que abrem FORA da casca — sem barra,
│       sem switch, fora do alcance dos auditores. Decisão (a) pendente.
│
├── ARTEFATO ESTÁTICO  sistema-de-cores/index.html  (112 páginas, file://)
│   └── mesmas abas editoriais + 108 componentes em réplica estática
│
└── ESTUDO DE CORES  estudo-de-cores/index.html  (a investigação, 69+ páginas)
    └── documenta o ANTES→DEPOIS de propósito: cores antigas ali são CITAÇÃO
```

## As 3 camadas de CSS que pintam o app vivo

| camada | arquivo | papel | gate |
|---|---|---|---|
| produto | `educbank.scss` + SFCs (via alias, READ-ONLY) | o CSS real | sempre |
| tokens | `tokens-padrao.css` (gerado) | 78 novos + 97 legados redeclarados | `data-cores='novas'` |
| fixes | `override-legado.gated.css` (derivado) + `foco.css` | 34 blocos com arquivo:linha | `data-cores='novas'` |

## Onde token ANTIGO ainda é esperado (e onde é defeito)

| superfície | cor antiga é… |
|---|---|
| modo "Cores hoje" (qualquer tela) | ✅ correta — é o papel do modo |
| aba "Cores hoje" do estudo de cores | ✅ correta — é citação do antes |
| **nome** de variável legada na regra do DevTools | ⚠ inevitável no CSS do produto (READ-ONLY) — mas o VALOR deve resolver via token novo, e a cadeia de `var()` deve exibir o token novo |
| qualquer outra superfície | ❌ defeito a corrigir |
