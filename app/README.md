# Sistema de Cores — versão viva (componentes reais)

A documentação de cor renderizando os **componentes Vue reais** do EducbankPay e
as **páginas reais** dos módulos, com os tokens do padrão aplicados. Não há
réplica em HTML aqui: o que aparece na tela é o arquivo `.vue` do repositório.

```bash
npm install
npm run dev
npm run build
npm run preview
```

- `npm run dev` → http://localhost:5180
- `npm run build` → `dist/`, pronto para hospedar (no Vercel: framework Vite, output `dist`)
- `npm run preview` → serve o build em http://localhost:4173

> Copie os comandos **sem comentário na mesma linha**. `npm run dev # porta 5180`
> faz o shell passar `#` como argumento, o Vite entende como raiz do projeto,
> **ignora o `vite.config.ts`** (perde os alias do `@ebp`) e sobe na porta padrão.

## Como o código real entra aqui

O repositório é consumido **read-only por alias** — a receita é a mesma já
provada no Storybook standalone do DS (`../../../design-system/.storybook/main.ts`):

| Peça | Onde | Por quê |
|---|---|---|
| `@` e `@ebp` → `EducbankPay/webclient/src` | `vite.config.ts` | `@` é como o webclient importa internamente; sem ele nenhum SFC resolve |
| `resolve.dedupe` com todo o runtime | `vite.config.ts` | os componentes vivem fora do root: import bare precisa resolver a partir daqui |
| `publicDir` do webclient | `vite.config.ts` | `/img/*` e as fontes do produto |
| provides, diretivas, pinia, router | `src/main.ts` | é o ambiente que os componentes injetam (`t`, `format`, `alert`, `permission`…) |
| `installProviderMock()` | `src/mock/provider-mock.ts` | os selects buscam dados por HTTP; sem isso montam vazios |
| **i18n real** | `src/lib/i18n-real.ts` | as chaves usam interpolação nomeada (`Há {days} dias`); um `t` caseiro deixaria a chave crua na tela |
| **tokens do padrão** | `src/estilo/tokens-padrao.css` | ver abaixo — é o pulo do gato |

### O arquivo que muda as cores sem tocar no repositório

`src/estilo/tokens-padrao.css` é **gerado** (`python3 gerar-tokens-css.py`) e entra
**depois** de `educbank.scss`. Ele faz duas coisas:

1. declara os **nomes novos** do padrão (`--border-default`, `--control-accent`…);
2. **redeclara os nomes que o código já consome** (`--ath-color-primary-700`,
   `--border-primary`, `--content-primary`… — 74 deles) com o valor do padrão.

É por isso que o `EdsButton` real renderiza em `#6b55d8` com texto `#f2f2f2`:
nada foi editado no `EducbankPay/`, só o valor da variável que ele lê.

## Auditoria de cor — o que garante que o padrão está aplicado

```bash
node auditar-cores.cjs      # os 104 componentes, estado em repouso
node auditar-abertos.cjs    # calendário, dropdown e popover ABERTOS
node auditar-pagina.cjs     # a página de matrícula em tela cheia
```

Cada script lê a **cor efetiva** de todo elemento (`getComputedStyle`) e compara
com os 70 tokens. Estado atual: **104 de 104 componentes sem nenhuma cor fora da
paleta**, calendários abertos limpos, e a página de matrícula com 278 elementos
medidos e zero desvio.

Como se chegou lá — três descobertas que valem para qualquer override de tema:

1. **`:root` simples não vence.** Cada SFC do produto que importa os temas
   reinjeta um `:root` com os valores originais, e o CSS de SFC entra **depois**
   da nossa folha (medido: a folha do `AthTitle.vue` é a nº 12, a nossa é a nº 4).
   O `tokens-padrao.css` usa `:root:root:root` — especificidade tripla, ganha
   independentemente da ordem de injeção. Sem isso, 13 valores legados ficavam
   na tela (`#8a76eb`, `#2d3849`, `#e3e4e9`, `#b2b2b2`…).
2. **Variável declarada no próprio elemento vence a herdada.** O calendário
   (`@vuepic/vue-datepicker`) declara o tema em `.dp--theme-light`, então
   `--dp-*` no `:root` não chega lá. O override mira a mesma classe
   (`.dp--theme-light.dp--theme-light`).
3. **Teleport tira o elemento do escopo.** Calendário, modal e dropdown nascem
   como filhos do `<body>` — regra escopada em `.palco` não os alcança.

O que não passa por variável está em `src/estilo/override-legado.css`, e cada
regra ali é também **uma tarefa de implementação**, com o `arquivo:linha` do que
o dev precisa trocar (hex direto no SFC do skeleton, `.text-danger` do Bootstrap,
borda do `.form-check-input`, e o tema do Quill).

## Cobertura, medida (estado atual)

| | |
|---|---|
| Componentes renderizando do arquivo real | **108 de 108** |
| Componentes com erro de runtime ou palco vazio | **0** |
| Componentes com cor fora da paleta | **0** |
| Calendários/dropdowns abertos com cor fora da paleta | **0** |
| Páginas inteiras | **6** (matrícula · início · faturas · repasses · turmas · alunos) |
| Páginas com cor fora da paleta | **0** |

Os cinco auditores:

```bash
node qa-componentes.cjs     # monta os 108 e diz quantos subiram
node qa-console.cjs         # erro de runtime / palco vazio / altura zero
node auditar-cores.cjs      # cor efetiva dos 108, em repouso
node auditar-abertos.cjs    # calendário, dropdown e popover ABERTOS
node auditar-paginas.cjs    # as 6 páginas em tela cheia
```

### O que foi preciso para os 108 montarem

| Causa | Como se resolve |
|---|---|
| `typescript@7` | O `@vue/compiler-sfc@3.5` chama `ts.findConfigFile`, que a API 7.x não expõe — o build morria no `EbTippy.vue` (tipo importado por alias). Fixado em `typescript@5.7`. |
| Tipo importado por alias | `vue({ script: { fs } })` no `vite.config.ts` traduz `@/`→caminho real antes de o compiler ler o arquivo. |
| SDK do Clerk | `@clerk/vue` tem alias para `src/mock/clerk.ts` — dois componentes de segurança exigiam plugin + chave de projeto. |
| Modal que abre por evento | Barramento real (tiny-emitter) + `abrirEvento`/`eventosAntes` no registry. O palco mostra o **gatilho**: abrir automático cobria a tela (Teleport). |
| Modal controlado por prop | `gatilhoProp` no registry (`modelValue`, `show`). |
| Fonte de ícones | O produto carrega Phosphor de um CDN no `index.html`; aqui vai a cópia vendorizada em `publico/`, servida em `/phosphor-vendor`. Sem ela, todo `<em class="ph-*">` fica invisível. |
| Props/slots errados | Lidos um a um no `defineProps` de cada arquivo (`analisar-props.py`). O chute erra: `AlertItem` usa `status`, `ItemNotification` recebe `item`, `BreadCrumbItems` usa `text`, `AthRibbon` usa `textLabel`, `EdsInputSelect` precisa de `rules` e `name` (o vee-validate faz `split` neles). |

### O que foi preciso para as páginas funcionarem

- **Navegar entre páginas recarrega.** A view real lança no *unmount* (`TypeError: parentNode` — um nó já removido por Teleport) e o Vue **aborta a troca de árvore**: a página anterior ficava na tela. Trocar de página passa por `location.hash` + `reload()`.
- **`fetch` mockado** (`src/mock/fetch-mock.ts`): a `EdsTable` busca por `dataUrl` com fetch, fora do provider (axios). Sem isso as tabelas vinham vazias.
- **Dado de exemplo com vários apelidos de campo**: cada tela nomeia o mesmo dado de um jeito (`name`/`studentName`/`displayName`…), então o mock cobre os apelidos usados pelas colunas.

## Cobertura, medida

```bash
npm run preview &          # o QA roda contra o build
node qa-componentes.cjs     # monta os 108 e diz quantos subiram
```

- **101 de 108** componentes montam com o componente real.
- Os 7 restantes aparecem na tela **com o motivo à vista**, nunca em branco:
  `AthSelectFamily` (é um agrupamento, não existe arquivo) · `EbTippy` (tipo
  importado por alias que o compilador SFC não resolve fora do app, e depende de
  `tippy.js`) · `SecurityAccount` (exige o plugin do Clerk, autenticação real) ·
  `PhoneVerificationModal`, `ChangePassword`, `ModalMFAValidated`,
  `AthPanelFilesTableDownloadDelete` (precisam de dado/contexto mais fundo).
- Props e slots de exemplo ficam em `gerar-registry.py` (`EXTRAS`), e cada um foi
  conferido no `defineProps` do próprio arquivo — use `python3 analisar-props.py <id>`
  para ver as props declaradas de um componente.

## Páginas — ambiente completo do produto

Cada página abre o **shell real**: o `BaseTemplate.vue` do produto, com **menu
lateral** e **top bar** de verdade, e a view no lugar do `<router-view>`. A única
adição é a faixa escura no alto, da ferramenta, com o botão de voltar.

Três coisas foram necessárias:

| | |
|---|---|
| **Rotas reais registradas** | o SideBar e o NavBar chamam `router.resolve({ name })` para cada item do menu, e o vue-router **lança** se o nome não existe. `installRoutes` do produto é aplicado ao nosso router (só para resolver nomes; a navegação da doc segue em `/doc` e `/pagina`) |
| **`feature.hasFeature()` devolve `'true'`** | o SideBar compara com a **string** `'true'`; com `false` metade dos itens do menu não existe |
| **`userStore` semeado** | nome, e-mail, escola e lista de escolas — sem isso a top bar monta vazia e não dá para avaliar a cor dela |

Mais: `VITE_EDUCBANK_ENVIRONMENT=Production` no `.env`, senão a top bar mostra a
faixa de ambiente com o rótulo `undefined`.

E um detalhe de ordem: o `preparar()` roda **antes e depois** do mount. A view
real chama o próprio `carregar()` no `onMounted`, a chamada de API falha e ela
seta `hasError` — apagando o que semeamos. Três re-semeaduras curtas (500ms,
1,2s, 2,2s) cobrem isso.

### O menu e a top bar entraram na auditoria

Auditar só o conteúdo deixava metade da tela de fora. Com o shell no escopo,
apareceram dois achados que não existiam antes:

- **`#96b4c6`** no item ativo do menu — `$color-active` e `$bg-submenu` em
  `assets/scss/_sidebar.scss:54,59`. São variáveis **SCSS**, fora do alcance do
  override de tokens, e o valor não existe na paleta. Aplicado: `Content/OnFill`
  no item ativo (13,47:1 contra o fundo escuro do menu) e `Background/Hover` no
  submenu. **Decisão em aberto:** usei o claro por contraste; se a intenção for
  dar identidade de marca ao item ativo, o token seria `Background/Brand`.
- **`#005fcc`** no foco dos itens do menu — é o **anel padrão do Chrome**: o DS
  não define `:focus-visible` ali (o mesmo achado já registrado em
  `_sidebar.scss:361-365`). Aplicada a regra nº 2 do sistema: sobre fundo escuro
  o anel é claro (`Border/Inverse`); na top bar, que é clara, é `Border/Focus`.

## Páginas

`src/registry/paginas.ts` lista as telas de módulo. A primeira é o **funil de
matrículas** (`EnrollmentFunnelView.vue`): abre em `#/pagina/matricula`, em tela
inteira, com uma barra escura da ferramenta e o botão **voltar** — a barra é
propositalmente diferente do produto, para ninguém confundir documentação com
interface real.

O `preparar()` de cada página semeia a store com dado de exemplo. A **forma** do
dado vem do repositório (`types/enrollment-funnel-types.ts`,
`utils/enrollment-funnel-columns.ts`); só os nomes são fictícios.

Para adicionar uma página: registre `arquivo`, `carregar: () => import(...)` e o
`preparar()` que a view precisa.

## Regras deste projeto

1. **`EducbankPay/` é read-only.** Nada aqui escreve no repositório.
2. **Sem `import.meta.glob` amplo.** O registry gera **imports explícitos**
   (`src/registry/componentes-imports.ts`): existe `.vue` vazio no repositório, e
   um glob `**/*.vue` derruba o build de produção inteiro (no dev o glob é lazy e
   o problema não aparece).
3. **A casca precisa vencer o CSS global do produto.** Medido: `_sidebar.scss` tem
   regras de **elemento** (`nav { background: … }`, `ul { … }`) e `_utilities.scss`
   mexe em `p`. A casca declara fundo e ritmo próprios com especificidade — sem
   isso a sidebar da documentação nasce azul-escura.
4. **Nada de número de contraste escrito à mão.** `src/lib/enriquecer.ts` mede.
5. **Um componente que não monta mostra o motivo.** A lista nunca mente sobre
   cobertura.
6. **O scroll da janela precisa ser devolvido.** `assets/scss/_utilities.scss:24-28`
   do produto trava o body (`overflow-y: hidden`, `overflow-x: hidden !important`)
   — correto num app de layout fixo, fatal numa página de documentação de
   10.000px. A casca devolve com `html, body { overflow: visible !important;
   height: auto !important }`. **`visible`, não `auto`:** com overflow != visible
   no `<html>`, o navegador para de propagar o scroll para o viewport e nada rola.
7. **Ao medir scroll, espere.** O `scroll-behavior: smooth` é global: ler
   `window.scrollY` na linha seguinte ao `scrollTo` devolve 0 e parece bug onde
   não tem. Use roda do mouse / `behavior: 'instant'` + espera.

## Relação com o irmão estático

`../index.html` é a versão estática (abre sem build, sem npm) e continua sendo a
fonte do **conteúdo** das páginas Fundamentos/Paleta/Papéis/Regras: o
`gerar-conteudo.py` extrai o HTML delas para cá. Regenerar o estático e rodar
`python3 gerar-conteudo.py` mantém as duas em sincronia.
