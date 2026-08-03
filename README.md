# Sistema de Cores — documentação final

A referência de cor do EducbankPay **no presente**: os 70 tokens, os papéis, as
regras de uso e os 108 componentes já no padrão vigente. Uma página só,
navegável, sem dependência externa.

**O contrato desta página: ela não olha para trás.** Nada de "antes era",
"hoje está errado", "proposta". Quem precisa do histórico da auditoria —
comparação antes/depois, achados, lotes de migração — usa o projeto vizinho
`../estudo-de-cores/`, que é o estudo. Aqui é o resultado.

## Duas versões

| | O que é | Quando usar |
|---|---|---|
| **`index.html`** (esta pasta) | versão **estática**: abre com duplo clique, sem npm. Os componentes são réplicas fiéis em HTML/CSS do código | leitura rápida, compartilhar arquivo, referência offline |
| **`app/`** | versão **viva**: renderiza os **108 componentes Vue reais** do EducbankPay e **6 páginas inteiras** dos módulos (matrícula · início · faturas · repasses · turmas · alunos), com os tokens do padrão aplicados | ver o produto de verdade com a cor nova; é a que vai pro ar |

A versão viva usa o conteúdo das páginas de doc daqui (`app/gerar-conteudo.py`
extrai o HTML de Fundamentos/Paleta/Papéis/Regras), então **uma fonte só de
conteúdo**. Detalhe técnico da versão viva: `app/README.md`.

## Como abrir

```bash
open index.html
```

Ou servido (necessário para o Simple Browser do VS Code):

```bash
python3 -m http.server 5500 --bind 127.0.0.1
```

## Páginas

| Página | O que traz |
|---|---|
| **Fundamentos** | a forma do nome (`Categoria/Papel`), as 5 categorias, os 4 papéis de cada família, o mínimo de contraste, os dois esquemas |
| **Paleta** | os 70 tokens em 13 grupos: valor, variável CSS, uso em uma frase, par do esquema escuro, e copiar |
| **Papéis de cor** | as 6 famílias com os 4 papéis (cada faixa é a própria prova de contraste), a família neutra, e os valores que cumprem mais de um papel |
| **Regras de uso** | as 10 regras que decidem o que a paleta sozinha não resolve |
| **108 componentes** | o componente vivo no padrão, com hover/clique/foco reais, e os tokens que ele usa |

## Como é gerado

O arquivo é **gerado**, não editado à mão. A fonte dos componentes é o estudo
(`../estudo-de-cores/index.html`), de onde se extrai **somente o lado do
padrão** — o lado "Hoje" nunca entra. O CSS dos componentes vem do mesmo lugar,
porque é ele que garante o pixel fiel ao código do produto.

```bash
cd gerar
node extrai.js     # componentes: HTML do padrão, por componente
node extrai2.js    # paleta, famílias, superfícies, valores multi-papel
node extrai3.js    # tokens de cada componente, MEDIDOS no navegador
python3 gera.py    # monta ../index.html
cd .. && node qa.js && node gerar/audit-contraste.js   # confere
```

`extrai3.js` existe porque a leitura do HTML não vê o que vem de regra CSS — e
as cores dos botões vêm de lá (`.col.proposed .btn.primary`). Ele lê a cor
efetiva de cada elemento com `getComputedStyle` e traduz para o token, por
categoria (`background-color` → Background, `color` → Content, `border`/`outline`
→ Border, `accent-color` → Control). Isso levou o EdsButton de 1 para 10 tokens
listados, e a média de 2,8 para 3,3 por componente.

- `gerar/uso.py` — a frase de uso de cada um dos 70 tokens, escrita à mão. É o
  conteúdo editorial da paleta; a limpeza automática das notas do estudo
  produzia frases quebradas, então este arquivo é a fonte.
- `gerar/casca.css` e `gerar/app.js` — a casca e o comportamento.
- `gerar/audit-contraste.js` — mede o contraste de 34 elementos da casca nos
  dois esquemas. Tem que fechar em **zero reprovação**.
- `gerar/extraido.json` e `gerar/paleta.json` — o que saiu do estudo na última
  extração. Ficam versionados de propósito: dá para rodar só o `gera.py` sem
  abrir o navegador, e o diff deles mostra o que mudou no estudo.
- `node qa.js` grava os prints em `/tmp/sistema-de-cores-prints` (nada de imagem
  dentro do projeto).

## Regras que este projeto impõe

1. **Nenhum valor fora da paleta.** O `qa.js` varre o DOM renderizado e falha se
   aparecer um hex que não seja um dos 70 tokens (mais branco e o preto de
   conteúdo). Foi assim que os 85 valores legados herdados do estudo foram
   encontrados e trocados — a lista de trocas está em `gerar/gera.py` (`TROCAS`),
   cada uma com o token de destino no comentário.
2. **Nenhum número de contraste escrito à mão.** Todos são medidos no navegador
   e recebem a pastilha ✓ / ◐ / ✕.
3. **`.col.proposed` não é decoração.** 15 regras de cor do produto são
   escopadas nessa classe no CSS de origem; o palco do componente tem que
   reproduzir o escopo, senão o botão renderiza sem cor.
4. **A casca não escala o componente.** Tipografia e espaçamento da mobília são
   da casca; o componente mantém o pixel do produto.
5. **Sombra não é cor.** Elevação não entra nesta paleta (`rgba` de sombra é o
   único rgba tolerado no QA).
6. **Dentro do card, só o componente.** Controle é da ferramenta e mora acima do
   card, na barra `.ds-ctl` — o seletor de estado do `AthInputText` e do
   `EdsInputSelect` era o caso. Abas e segmento de `AthTab`, `AthTabs` e
   `SegmentControl` continuam dentro: ali o controle **é** o componente.
7. **A ponte de variáveis é obrigatória.** O CSS herdado consome a escala
   `--space-*` e alguns nomes de cor da casca do estudo. Sem declará-los, todo
   `padding: var(--space-*)` resolve para zero — foi o que deixou o card com
   `padding: 0` e as linhas de estado colando uma na outra. As medidas ficam no
   `:root`; as cores ficam escopadas em `.col, .col-card`, porque o card é a
   superfície do produto e não acompanha o tema da ferramenta.

## O que ficou fora, de propósito

- **Tema escuro do produto.** A paleta traz o par escuro de cada token, porque
  ele faz parte do sistema definido. O que está em produção é o esquema claro, e
  a página diz isso em Fundamentos — sem prometer data.
- **`AthFilterCessionStatus`.** O arquivo existe no índice do DS mas está vazio
  no repositório: não é componente, então não entra no catálogo (108, não 109).
