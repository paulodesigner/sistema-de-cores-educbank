# Começar aqui — Sistema de Cores num computador novo

Documentação de um **sistema de cores completo**: os tokens, os papéis de cada cor, as regras de uso e os componentes aplicados. Serve como referência de método — como se documenta cor num design system.

---

## Duas versões, e uma delas não precisa de nada

| | O que é | Como abrir |
|---|---|---|
| **`index.html`** | versão **estática** — os componentes são réplicas fiéis em HTML/CSS | **dois cliques no arquivo.** Só isso. |
| **`app/`** | versão **viva** — renderiza os componentes reais do produto | precisa do código-fonte do produto (veja abaixo) |

**Para consultar, apresentar ou usar como referência: use a estática.** Ela é autossuficiente e abre offline.

---

## ⚠️ Sobre a versão viva

A pasta `app/` foi feita para renderizar os **componentes reais** do produto de onde este sistema saiu. **Esse código não veio junto** — era da empresa.

Ou seja: **a versão viva não vai rodar** num computador novo, e isso é esperado. O que ficou é a versão estática, que já contém tudo que importa: os 70 tokens, os papéis e as regras.

Se um dia você quiser reativar a ideia num produto novo, o caminho está em `ARQUITETURA-DE-INFORMACAO.md` — a estrutura é reaproveitável, só o conteúdo muda.

---

## Como servir por HTTP (se preferir)

```bash
cd ~
git clone https://github.com/paulodesigner/sistema-de-cores-educbank.git
cd sistema-de-cores-educbank
python3 -m http.server 8000
```
Abra http://localhost:8000

---

## O que ler

| Arquivo | O que tem |
|---|---|
| `README.md` | o contrato da página: ela documenta o presente, não o histórico |
| `ARQUITETURA-DE-INFORMACAO.md` | **o método** — como a documentação de cor foi organizada |
| `PLANO-DE-ATUALIZACAO.md` | como manter viva quando um token muda |
