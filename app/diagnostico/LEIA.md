# Scripts de diagnóstico

Ferramentas de investigação usadas nas rodadas de auditoria. Não fazem parte do
ciclo normal (para isso use os `qa-*.cjs` e `auditar-*.cjs` na raiz), mas cada um
resolve um tipo de pergunta que apareceu de verdade:

| Script | Responde |
|---|---|
| `diag-regra.cjs <pagina> <seletor> <prop>` | **qual regra CSS** pinta um elemento (via CDP). A única forma de achar a origem quando a cor não vem de variável nem de style inline |
| `diag-var.cjs` | o valor de uma variável no `:root` **e** no elemento — pega o caso de variável redeclarada mais perto do alvo |
| `diag-vazios.cjs <ids...>` | o que um componente realmente renderizou, incluindo o que foi para um Teleport no `<body>` |
| `diag-pagina.cjs <id>` | erro de console e HTML do palco de uma página |
| `diag-stack.cjs` | stack legível de erro de runtime (rode contra o dev server, não o build) |
| `diag-badge.cjs` | exemplo de varredura de um componente repetido em vários estados |
