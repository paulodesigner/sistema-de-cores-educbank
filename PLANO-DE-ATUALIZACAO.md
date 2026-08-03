# Plano de atualização em pacotes — tirar a língua antiga da inspeção

> Resultado da auditoria dupla (DS sênior + engenheiro) de 2026-08-02.
> Contexto: todas as auditorias de PIXEL fecham em zero — o que resta é a
> LÍNGUA que o DevTools mostra ao inspecionar. Ela vive em três lugares:
> a variável consumida pela regra, a regra vencedora, e o nome da classe no HTML.
> Os dois primeiros o artefato resolve sozinho; o terceiro só muda no produto.

## O inventário (medido, não estimado)

| o quê | quanto | onde |
|---|---|---|
| consumos de `var(--ath-color-*)` | **1.604** em **326 arquivos** | modules 823 · components 421 · assets 358 |
| classes utilitárias de cor | **42** definições | `_colors.scss` + `_utilities.scss:128-180` |
| uso das utilitárias em template | ~500 ocorrências | 90× `ath-color--primary`, 76× `--secondary-500`, 61× `--secondary-900`, 45× `ath-border--bottom`… |
| estilos INLINE com var antiga | **28** | `style="color: var(--ath-color-…)"` em templates |
| temas de biblioteca sem mapa | 2 (Bootstrap, SweetAlert2) | 14 variáveis vazando — ✅ mapeadas (bloco 34) |

## Os pacotes

### ✅ Pacote 0 — cadeia de variáveis (FEITO nesta rodada)
A ponte emite **alias** (`--ath-color-secondary-900: var(--content-primary)`), com
os ciclos de auto-referência eliminados. Bootstrap e SweetAlert2 mapeados.
**Efeito na inspeção:** a cadeia de `var()` sempre termina no token novo.
Verificação: `auditar-variaveis.cjs` → 0 legadas fora da paleta (3 rodadas).

### ✅ Pacote 1 — utilitárias na língua nova (FEITO nesta rodada)
`src/estilo/utilidades-legado.css`: as 42 classes de cor redeclaradas consumindo
o token novo, por PAPEL (texto→Content, fundo→Background, borda→Border), gated.
**Efeito na inspeção:** a REGRA VENCEDORA de `.ath-color--secondary` passa a ser
`color: var(--content-primary) !important` — foi o caso do print do Paulo.
Verificação: teste do sentinela (o elemento segue o token novo e ignora a legada).

### ✅ Pacote 2 — artefato · restos técnicos (FEITO em 2026-08-02)
- ✅ M87 · `filhos` no palco: slot de composição recebe COMPONENTES do registry
  (o `AthTabs` renderiza 3 `<AthTab>` reais, com aba ativa em marca)
- ✅ M89 · overlays e campo de busca resolvidos pelas rodadas anteriores
  (gatilho `show`, travessia de estados) — conformidade 108/108 os cobre
- ✅ Decisão (a) · TODAS as rotas do produto abrem na casca: o `Main.vue` é
  embrulhado NA ORIGEM (interceptação do addRoute), ganhando barra + switch +
  semeadura de usuário. As 11 rotas do menu foram auditadas pela primeira vez:
  **0 achados** — a camada de tokens é global e já as cobria.
- Os 28 estilos inline: a cadeia já resolve certo (alias); no DevTools o
  `element.style` mostra o nome antigo — **sem solução no artefato** (é atributo
  no template, fora do alcance de CSS). Fica no Pacote 4.

### Pacote 3 — produto · PR de fundação (dev, PR pequeno e revisável)
Ordem da Parte 7 da spec (`ds-color-implementation-spec.md`):
1. `Content/OnFill` #F2F2F2→#FFFFFF (1 linha, alinha a 64 usos existentes)
2. Declarar os 78 tokens novos como fonte + **os 97 legados como alias** —
   exatamente o `tokens-padrao.css` que o artefato já gera e testa
3. As 5 variáveis de estado de `themes/main.scss:22-41` (tabela pronta na spec)

### Pacote 4 — produto · troca mecânica de consumo (dev, por módulo)
Substituir `var(--ath-color-*)` → `var(--token-novo)` nos 326 arquivos, usando o
mapa 1:1 da ponte (que é a especificação executável). Fatiado pelo inventário:
- 4a `assets/scss` (358 consumos — o maior efeito por arquivo)
- 4b `components/` (421)
- 4c `modules/` (823, por domínio: invoice → student-area → repasses → …)
- 4d os 28 estilos inline
**Efeito na inspeção:** a regra do SFC passa a mostrar o token novo — o fim
definitivo do `--ath-*` no DevTools. Mecânico e seguro DEPOIS do Pacote 3
(os nomes novos já existem como fonte; o alias mantém quem ainda não migrou).

### Pacote 5 — produto · classes utilitárias (dev + design, decisão de API)
Renomear/oficializar as utilitárias (`.ath-color--secondary` → utilitária
semântica nova, ou aposentar em favor de tokens diretos). Última milha: depois
dele, nem o NOME DA CLASSE no HTML fala a língua antiga. Exige decisão de
nomenclatura do Paulo antes (proposta na revisão do Pacote 4).

### Pacote 6 — produto · débitos de comportamento (dev, itens pontuais)
- Parte 0: remover o reset de foco de `_input.scss:84-91` (destrava tudo de foco)
- M88: `outline-offset` do `EdsButton:136-140` + halo duplo
- Os 10 pontos da Parte 7.4 + unificar indicação de foco (wrapper OU campo)

## Regra de verificação (vale para todo pacote)
Rodar a bateria completa antes de declarar pronto: variáveis (×3) · papel (4
eixos) · regras · forma · identidade · conformidade · pares · QA · foco.
Única exceção legítima de cor antiga: o modo **"Cores hoje"** e a citação
histórica do estudo de cores.
