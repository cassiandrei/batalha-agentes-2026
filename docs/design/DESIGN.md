---
name: Vita
description: Chat de bem-estar financeiro em superfícies claras, forma pedra e acento laranja, onde cada número vem de uma tool.
colors:
  accent: "#ff6200"
  accent-dark: "#c24a00"
  accent-soft: "#fff0e6"
  ink: "#1a1a1a"
  ink-2: "#2e2e2e"
  ink-3: "#4d4d4d"
  mid: "#6e6e6e"
  low: "#a3a3a3"
  canvas: "#f7f7f7"
  surface: "#ffffff"
  line: "#ededed"
  line-strong: "#d6d6d6"
  success: "#00875a"
  success-text: "#0b6b48"
  success-soft: "#e6f7f0"
  alert: "#de350b"
  alert-text: "#b92b08"
  alert-soft: "#ffebe5"
  warn: "#ffab00"
  warn-text: "#7a5200"
  warn-soft: "#fff8e6"
  night: "#0d1017"
  night-card: "#151821"
  bezel: "#1c1c1e"
  page: "#e9e9eb"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif"
    fontSize: "84px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'tnum' 1, 'cv11' 1"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pedra: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "14px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.mid}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-hover:
    backgroundColor: "{colors.canvas}"
  chip-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-dark}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pedra}"
    padding: "16px"
  card-inset:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px"
  bubble-agent:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "14px"
  bubble-user:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "12px"
  input-composer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 6px 4px 16px"
    height: "48px"
  input-itoken:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "48px"
  tag-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  tag-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  tag-alert:
    backgroundColor: "{colors.alert-soft}"
    textColor: "{colors.alert-text}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pedra}"
    padding: "16px"
---

# Design System: Vita

## Overview

**Creative North Star: "O Consultório Claro"**

O Vita atende como um consultório de luz branca: o cliente entra por um push, senta numa conversa e recebe um Raio-X da própria fatura, seguido de tratamentos que cabem no orçamento. A metáfora já está na linguagem do produto (Raio-X, tratamentos, "por que recomendamos isso") e o mundo visual a sustenta sem dramatizar: superfícies claras (`canvas` e `surface`), grafite para o texto, uma única cor viva, o laranja Vita, reservada para o que age, e cores de feedback que aparecem só quando um número precisa ser lido como pago, juros, atenção ou confirmado.

O chat é o app. Não há painel, dashboard ou cabeçalho escuro: o diagnóstico e as opções são cards dentro da conversa, as ações são chips em pílula, e tudo o que exige decisão sobe do rodapé como uma folha (sheet) contida na moldura do aparelho. A densidade é a de um app de banco lido de perto, com corpo de 13,5 px e valores em negrito tabular, mas cada card respira 16 px de borda e as ações têm 44 px de altura. O único ambiente escuro é a tela de bloqueio, que existe para dar ao push o palco de um celular real; dentro do app, escuro é só o balão do cliente.

O tom é sereno e preciso. Nada brilha, nada salta: as sombras ficam abaixo de 4% de opacidade em repouso, o movimento é uma subida curta com desaceleração exponencial, e o momento memorável, o hero de confirmação, ganha sua ênfase por forma (pedra verde de 72 px com check) e não por cor extra. Rejeições confirmadas pela migração: o protótipo anterior de fundo `#121212` com Plus Jakarta Sans, modais centrais e rodapé de cards; e o nome, o azul e as fontes do Itaú (o laranja entrou por decisão registrada).

**Key Characteristics:**
- Chat como tela principal: cards e opções vivem na conversa, decisões sobem em sheets.
- Superfícies claras em duas camadas (`canvas` sob `surface`) com bordas de 1 px; sombras quase invisíveis.
- Forma pedra (24 px) nos cards e sheets, 16 px nos balões e opções, 12 px nas linhas internas, pílula (999 px) em toda ação.
- Uma família, Inter, com dígitos tabulares em todo o app; só o relógio do bloqueio usa a fonte do sistema.
- Laranja Vita (`accent`) só no que age ou identifica: marca, CTA primário, chip ativo, presença, foco.
- Feedback semântico sempre em par: tom cheio para preenchimento e barra, tom `-text` para texto, tom `-soft` para fundo.
- Cada número vem de `/api/*`, em formato PT-BR, negrito e tabular; o front não escreve cifra.

## Colors

Uma paleta quase acromática, com um único laranja e quatro cores de feedback que só aparecem quando um número precisa ser lido.

### Primary
- **Laranja Vita** (`accent`): a única cor viva da interface. Squircle da marca, botão primário, ponto do push, chip ativo, seleção de opção, cursor e anel de foco. Aparece porque algo age ou identifica o Vita, nunca como decoração.
- **Laranja Fundo** (`accent-dark`): hover e pressão do botão primário; texto sobre `accent-soft` (chip ativo, valor em destaque `accent`, link de fonte citada).
- **Névoa Laranja** (`accent-soft`): fundo do chip ativo, da seleção de opção, do ícone da marca em cards, do toggle de voz ligado e da tag "T01/T02" no sheet. É o laranja que se pode pisar.

### Neutral
- **Grafite** (`ink`): texto principal, títulos, e o balão do cliente (fundo grafite, texto branco). Também o handle do composer a 20%.
- **Grafite 2** (`ink-2`): corpo de texto dos balões do agente e das explicações em cards.
- **Grafite 3** (`ink-3`): texto do chip em repouso, ícones dos controles do cabeçalho, segmento "saldo no rotativo" da barra.
- **Cinza Médio** (`mid`): rótulos, legendas, timestamps, subtítulos, placeholder do composer. Contraste 5,0:1 sobre branco; é o menor cinza que carrega texto.
- **Cinza Baixo** (`low`): só ícones decorativos, setas de opção não recomendada e bordas em hover. Nunca texto.
- **Tela** (`canvas`): fundo do chat e da moldura; painéis internos aninhados dentro de cards brancos; campo do iToken.
- **Superfície** (`surface`): cards, balões do agente, sheets, cabeçalho (a 95% com blur), composer.
- **Linha** (`line`): borda de cards, balões e divisores; borda inferior do cabeçalho.
- **Linha Forte** (`line-strong`): borda de chips, botão secundário, composer, campo de texto, avatar de inicial; trilho da barra de comprometimento.
- **Noite** (`night`) e **Cartão da Noite** (`night-card`): fundo da tela de bloqueio (gradiente `#08090f → #0d1017 → #06080d`) e o cartão do push rico, com bordas brancas a 8%. Só existem nessa cena.
- **Moldura** (`bezel`): bezel de 10 px e Dynamic Island da moldura de celular no desktop.
- **Palco** (`page`): fundo da página atrás da moldura no desktop.

### Feedback (Secondary)
- **Verde Sucesso** (`success`, texto `success-text`, fundo `success-soft`): pago, confirmado, presença online, pedra do hero, card de tratamento concluído, coluna "próximos meses".
- **Coral de Alerta** (`alert`, texto `alert-text`, fundo `alert-soft`): juros do rotativo, comprometimento ≥ 35%, "não cabe na regra", faixa de risco V, coluna "mês anterior".
- **Âmbar de Aviso** (`warn`, texto `warn-text`, fundo `warn-soft`): regra de atenção, índice "Atenção". O tom cheio (`#ffab00`) nunca carrega texto: sobre branco não passa de 1,7:1.

### Named Rules
**The Text-Tone Rule.** O tom cheio de uma cor de feedback (`success`, `alert`, `warn`) preenche barras, pontos e ícones; texto só usa o tom `-text` sobre o tom `-soft` ou sobre branco. Não há exceção, nem em tags de 10 px.

**The Green Acts Rule.** O laranja Vita aparece apenas onde há ação, seleção, identidade ou foco. Um card sem ação não tem laranja; um fundo nunca é laranja. Se a tela tiver mais laranja do que grafite, algo está errado.

**The Brand Decision Rule.** O laranja `#FF6200` é o laranja do Itaú e entrou por decisão do usuário em 27/09, contra a regra 3 do projeto (registrado no PRODUCT.md). Azul `#003399`, fontes Itaú Text/Display e o nome Itaú continuam fora.

## Typography

**Display Font:** fonte do sistema (`-apple-system`, `SF Pro Display`, com Inter de fallback), só no relógio da tela de bloqueio
**Body Font:** Inter (com `-apple-system`, `Segoe UI`, Roboto, sans-serif)
**Label/Mono Font:** `font-mono` do sistema, só para identificadores de simulação e protocolo

**Character:** Uma família só, Inter nos pesos 400–800, com `tnum` e `cv11` ligados no `body`: os dígitos alinham em qualquer coluna e o "a" de andar único mantém a leitura serena. A hierarquia vem de peso e de meio-pixel, não de tamanho: entre o corpo (13,5 px) e o título de card (14,5 px) há um pixel, e o que separa rótulo de valor é o negrito.

### Hierarchy
- **Display** (700, 84 px, line-height 1, tracking -0.025em): o relógio da tela de bloqueio, com sombra de texto `0 4px 16px rgba(0,0,0,0.6)`. Não aparece dentro do app.
- **Headline** (700, 22 px, 1.25, tracking -0.025em): título do hero de confirmação, limitado a 320 px. Também 18 px/700 nos valores do comparativo mensal e 17 px/700 no título do push.
- **Title** (700, 15 px, 1.25): título do sheet e das seções internas do sheet; 14,5 px nos títulos de card (Raio-X, Tratamentos); 15 px/600 no nome "Vita" do cabeçalho.
- **Body** (400, 13,5 px, 1.625): balões do agente e do cliente, linhas rótulo × valor. 14 px no composer e no push; 13 px nas explicações de card; 12,5 px nas linhas secundárias de opção. Largura máxima do balão: 85% da coluna.
- **Label** (500, 11 px, 1.25): rótulos de campo em card, legendas da barra, subtítulos "assistente com IA", timestamps a 10 px. Tags em pílula: 10–11,5 px, 600.
- **Value** (700, 14 px, tabular): todo valor em reais ou percentual, alinhado à direita; 15 px nos juros do rotativo; 18 px no comparativo.

### Named Rules
**The Tabular Number Rule.** Todo número é negrito, tabular, em PT-BR (`R$ 3.654,36`, `8,5% ao mês`) e vem de `/api/*`. O front nunca escreve um valor, e um valor ausente é "—".

**The One Family Rule.** Inter em toda a interface; a exceção é o relógio do bloqueio (fonte do sistema) e os identificadores em `font-mono`. Não há fonte display, nem serifa, nem segunda família para títulos.

**The Half-Pixel Rule.** Tamanhos crescem de meio em meio pixel (11 → 11,5 → 12 → 12,5 → 13 → 13,5 → 14 → 14,5 → 15). Hierarquia vem de peso e cor; um novo tamanho só entra se um nível existente não servir.

## Layout

O app é uma coluna única de largura móvel. No desktop, ele vive dentro de uma moldura de celular: 420 px de largura, 880 px de altura máxima (92 vh), raio de 44 px, bezel de 10 px em `bezel`, Dynamic Island de 112 × 28 px, sombra `0 30px 80px rgba(0,0,0,0.35)`, sobre o palco `page`. O botão do cabeçalho troca para "tela cheia": 896 px de largura, 94 vh, raio de 24 px, borda `line-strong`. Em telas menores que `md` (768 px) a moldura some e o app ocupa a viewport inteira.

Dentro da moldura, três faixas fixas: Top App Bar (branca a 95% com blur, 12 px de gutter, altura de um controle de 44 px), a conversa (rolagem própria, gutter de 14 px, 14 px entre mensagens) e o rodapé com a fileira de chips (rolagem horizontal com esmaecimento de 40 px na borda direita) e o composer em pílula de 48 px, terminando no handle de 112 × 4 px. Sheets, tela de bloqueio e confete são `absolute` à moldura, nunca à janela: o celular é a página.

Ritmo de espaçamento: 4, 8, 12, 14, 16, 20 px. Cards têm 16 px de padding e 14 px entre blocos internos; painéis aninhados têm 12 px; linhas de opção têm 14 px; a linha rótulo × valor tem 10 px vertical com divisor `line`. Ações têm no mínimo 44 px de altura (48 px no botão do push e no composer) e ícones de controle são círculos de 44 px.

**The Phone Is the Page Rule.** Nada escapa da moldura: overlays, sheets, confete e a tela de bloqueio são posicionados em relação a ela. Uma tela nova cabe em 420 px de largura ou não é uma tela do Vita.

## Elevation & Depth

O sistema é tonal com sombras ambientais quase invisíveis. Profundidade vem de aninhar `canvas` dentro de `surface`: a página é cinza claro, o card é branco, o painel interno do card volta a ser cinza claro, e cada camada tem uma borda de 1 px em `line` ou `line-strong`. As sombras em repouso ficam entre 3% e 4% de opacidade e existem para descolar o card do fundo, não para dar volume. Só duas sombras são estruturais: a do sheet, que precisa ler como uma folha sobre a conversa, e a do cartão do push na noite do bloqueio.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 2px 12px rgba(0,0,0,0.03)`): cards Raio-X, Tratamentos e seções dentro dos sheets.
- **Chip** (`box-shadow: 0 2px 8px rgba(0,0,0,0.04)`): chips, balão do agente, indicador de digitação, composer.
- **Header** (`box-shadow: 0 1px 6px rgba(0,0,0,0.03)`): borda inferior do cabeçalho, além da linha de 1 px.
- **Sheet** (`box-shadow: 0 -8px 32px rgba(0,0,0,0.12)`): a folha que sobe do rodapé, sobre um véu `rgba(0,0,0,0.4)` com blur leve.
- **Accent lift** (`box-shadow` média com `accent` a 20%; `success` a 25% no hero): só no botão primário e na pedra do hero.
- **Night card** (`box-shadow: 0 22px 45px rgba(0,0,0,0.85)`): o cartão do push na tela de bloqueio; sombra de outra cena, não do app.
- **Frame** (`box-shadow: 0 30px 80px rgba(0,0,0,0.35)`): a moldura do celular sobre o palco.

### Named Rules
**The Tonal Nesting Rule.** Profundidade se faz alternando `canvas` e `surface` com borda de 1 px, não com sombra. Em repouso, nenhuma sombra dentro do app passa de 4% de opacidade; só o sheet (12%) e o botão primário (acento a 20%) levantam de verdade.

**The Sheet Rises Rule.** Toda decisão (fatura, visão financeira, T01, T02, pessoa) sobe do rodapé como sheet com cabeçalho, fecho circular de 44 px e altura máxima de 88% da moldura. Não há modal centrado.

## Shapes

A forma-mãe é a pedra: 24 px de raio nos cards, nos sheets (só os cantos de cima) e na pedra do hero (22 px, 72 px de lado). Um degrau abaixo, 16 px nos balões, nas opções de tratamento e nos prazos; 12 px nas linhas internas de card, no campo do iToken e nos ícones-caixa de 32 px; 8 px nos ícones-caixa de 28 px. Toda ação é pílula (999 px): botões, chips, tags, controles circulares, o composer e o anel de foco (`outline: 2px solid accent; offset 2px; radius 999px`), com o campo de texto como exceção (foco em 12 px, offset 0).

Os balões são assimétricos: o do agente tem o canto superior esquerdo reto (2 px), o do cliente tem o canto inferior direito reto. Bordas são sempre de 1 px, em `line` para contêineres e `line-strong` para controles. Ícones são SVG de traço (lucide), de 14 a 20 px, sempre dentro de uma caixa de raio 8–12 px; a marca é uma estrela de quatro pontas num squircle laranja de 28, 32 ou 36 px.

**The Pill Acts, the Stone Holds Rule.** Pílula (999 px) é o que se toca; pedra (24 px) é o que se lê. Um card nunca é pílula; um botão nunca é pedra.

## Components

Sereno e preciso: as superfícies mal se mexem, as ações têm o tamanho de um dedo e a informação chega em pares rótulo × valor.

### Buttons
- **Shape:** pílula (999 px), altura mínima 44 px, padding horizontal 20 px, texto 14 px/600, ícone de 16 px à direita com 8 px de gap.
- **Primary:** `accent` com texto branco e sombra `accent` a 20%; hover `accent-dark`; pressão `scale(0.98)`; desabilitado a 50%. Largura total no rodapé dos sheets e nos cards de tratamento. O botão do push é a mesma pílula com 48 px e 15 px/700.
- **Secondary:** `surface` com borda `line-strong` e texto `ink`; hover `canvas`.
- **Text:** transparente, texto `mid`, hover `ink`. Nos rodapés de card ("Fatura completa", "Visão financeira"), 12,5 px/600 com ícone de 14 px; a variante de acento tem texto `accent` e hover `accent-soft`.
- **Icon control:** círculo de 44 px, ícone de 18 px, texto `ink-3`, hover `ink` sobre `canvas`; estado ligado (voz) em `accent` sobre `accent-soft` com `aria-pressed`.
- **Focus:** anel de 2 px `accent` com offset 2 px, herdado do `:focus-visible` global.

### Chips
- **Style:** pílula branca com borda `line-strong`, texto `ink-3` 13,5 px/500, ícone lucide de 16 px à esquerda em `ink-3`, altura 44 px, padding 16 px, sombra Chip. Texto trunca em uma linha.
- **State:** hover `canvas` com borda `low`; ativo (primeira ação sugerida, "Sim, pode lembrar") em `accent-soft` com borda `accent` a 30% e texto `accent-dark`; desabilitado a 50% enquanto o Vita digita. A fileira do rodapé rola na horizontal e esmaece nos últimos 40 px.

### Cards / Containers
- **Corner Style:** pedra (24 px).
- **Background:** `surface` com borda `line`; painéis aninhados em `canvas` com raio 12 px e borda `line`; linhas de resumo em `surface` com borda `line-strong` a 80%.
- **Shadow Strategy:** sombra Card (3%). Cards de estado (tratamento concluído) trocam para `success-soft` com borda `success` a 25% e sem sombra.
- **Border:** 1 px sempre; o cabeçalho do card fecha com divisor `line` e 10 px abaixo.
- **Internal Padding:** 16 px; 14 px entre blocos; ícone-caixa de 32 px em `accent-soft` à esquerda do título.

### Inputs / Fields
- **Composer:** pílula de 48 px em `surface` com borda `line-strong` e sombra Chip; texto 14 px `ink`, placeholder `mid`; botão de envio circular de 40 px em `accent` (desabilitado em `line` com ícone `low`). Foco: borda `accent` via `focus-within`.
- **iToken:** campo de 48 px em `canvas` com borda `line-strong`, raio 12 px, texto 16 px com `letter-spacing: 0.4em`, `inputMode="numeric"`, placeholder "••••••". Foco: borda `accent`, sem anel. Rótulo 12,5 px/600 com ícone de cadeado em `accent`; ajuda em 11 px `mid`. Vive no rodapé do sheet, colado ao botão que libera.
- **Radio de prazo:** linha de 16 px com borda `line`; selecionada em `accent-soft` a 60% com borda `accent`; reprovada em `canvas` a 70% com `cursor-not-allowed`; indicador circular de 20 px. "Cabe na regra" / "Não cabe na regra" sempre em texto e ícone.

### Navigation
- **Top App Bar:** `surface` a 95% com `backdrop-blur`, borda `line` e sombra Header; 8 px vertical, 12 px horizontal. Esquerda: voltar (44 px), marca 28 px, "Vita" 15 px/600 com ponto de presença `success` de 8 px pulsando (`animate-ping`), subtítulo "assistente com IA" 11 px `mid`. Direita: pessoa, voz, moldura (só `md`), e o avatar de inicial (36 px, `canvas`, borda `line-strong`, 13 px/700). Não há bottom navigation.
- **Sheet header:** ícone-caixa 28 px, tag opcional em pílula `accent-soft` (10 px/700 uppercase, tracking wider), título 15 px/700, subtítulo 12 px `mid`, fecho circular de 44 px à direita.

### Balões de conversa
- **Agente:** marca 32 px à esquerda; linha de autor "Vita · IA · hh:mm" (12 px/600 + 10 px `mid`) com botão de ouvir de 36 px que aparece no hover; balão `surface` 14 px de padding, raio 16 px com canto superior esquerdo reto, borda `line`, sombra Chip, texto 13,5 px `ink-2` a 1.625 com `**negrito**` em `ink`. Citações em rodapé de 11,5 px com ícone de livro em `accent` e link em `accent-dark`.
- **Cliente:** `ink` com texto branco, 12 px de padding, raio 16 px com canto inferior direito reto, largura máxima 85%, timestamp 10 px `mid` abaixo, alinhado à direita.
- **Digitando:** balão do agente com três pontos `accent` de 6 px subindo em sequência (`dot`, 1,1 s, atrasos de 180 ms) e "O Vita está calculando…".

### Raio-X (signature)
Card pedra com cabeçalho (ícone `Wallet` em `accent-soft`, título 14,5 px, subtítulo com o mês), tag de comprometimento à direita (`alert-soft` a partir de 35%), painel aninhado em `canvas` com a barra de 10 px em três segmentos (`success` pago, `ink-3` saldo, `alert` juros, com `role="img"` e legenda), linhas de resumo com ícone-caixa 28 px, o bloco de juros em `alert-soft` a 60% e a linha da reserva em `accent-soft` a 50%. Fecha com a tag do índice e dois botões de texto.

### Tratamentos (signature)
Card pedra com o título "Tratamentos que cabem no seu orçamento" e a tag "por regra". Cada opção é uma linha de 16 px com ícone-caixa 32 px, título 13,5 px/700, duas linhas de explicação (12,5 px `ink-2`, 11,5 px `mid`) e seta à direita. A recomendação do motor vem primeiro, em `accent-soft` a 50% com borda `accent`, ícone-caixa em `accent`, e a tag "Recomendação Vita" (9,5 px/700 uppercase) pendurada no canto superior direito. Faixa V não vê opções: vê o motivo, um bloco `accent-soft` com "O caminho é com uma pessoa" e o botão primário.

### Hero de confirmação (signature)
No sheet, após o iToken: pedra `success` de 72 px com raio 22 px e check branco de 40 px (traço 3.2), `pop` de 0,4 s, sombra `success` a 25%; tag "Confirmado" em `success-soft` com borda `success` a 25%; título 22 px/700 e texto 13 px `mid`. Abaixo, "Condição confirmada" em linhas rótulo × valor e o comparativo em duas colunas de 16 px: mês anterior em `canvas` com valor `alert-text`, próximos meses em `success-soft` com valor `success-text`. Confete de `canvas-confetti` dentro da moldura, desligado com `prefers-reduced-motion`.

### Tela de bloqueio (signature)
Cena fora do app: gradiente `night`, halo `accent` a 15% com blur de 110 px no topo, cadeado em círculo branco a 10%, data 19 px/500 e relógio Display. O push rico é um cartão `night-card` de raio 28 px, borda branca a 8%, sombra Night card, com a marca 36 px, "VITA" 14 px/700 e "agora" `zinc-400`; ponto `accent` com brilho, título 17 px/700, corpo 14 px `zinc-300`; botão primário de 48 px e botão "Lembrar mais tarde" em branco a 8%. Abaixo, uma segunda notificação empilhada (93% de largura, 10 px) e o "Deslize para cima" com seta em `nudge`.

### Motion
Uma curva só para o app, `cubic-bezier(0.16, 1, 0.3, 1)`: `fade-in` 0,25 s (mensagens e véu), `sheet-up` 0,32 s (32 px de subida), `pop` 0,4 s (hero, de 0,85 a 1). Loops usam `cubic-bezier(0.22, 1, 0.36, 1)`: `dot` 1,1 s e `nudge` 1,6 s. Pressão em `scale(0.98)`; hover troca só cor. `prefers-reduced-motion` zera tudo.

## Do's and Don'ts

### Do:
- **Do** trazer todo número de `/api/*`, em PT-BR com centavos ("R$ 3.654,36", "8,5% ao mês"), em negrito tabular; sem dado, "—".
- **Do** aninhar `canvas` dentro de `surface` com borda de 1 px para dar profundidade; sombra em repouso até 4%.
- **Do** usar pílula (999 px) e 44 px de altura em toda ação, com o anel de foco de 2 px em `accent`.
- **Do** mostrar "cabe na regra" e "não cabe na regra" em texto e ícone, nunca só em cor.
- **Do** subir toda decisão como sheet contido na moldura, com cabeçalho, fecho circular e o iToken colado ao botão que libera.
- **Do** manter "Falar com uma pessoa" visível no cabeçalho e o rótulo "Vita · IA" em cada balão.
- **Do** respeitar `prefers-reduced-motion` em animações e confete.

### Don't:
- **Don't** usar azul `#003399`, fontes Itaú Text/Display ou o nome Itaú em nenhuma superfície; o laranja `#FF6200` entrou por decisão registrada, não use o `#EC7000` alternativo.
- **Don't** escrever "garantido", "aprovado", "sem risco", "sangria" ou "você errou".
- **Don't** pôr texto no tom cheio de `success`, `alert` ou `warn`; texto usa o tom `-text`.
- **Don't** centralizar modais nem usar cabeçalho escuro dentro do app; escuro é só a tela de bloqueio, a moldura e o balão do cliente.
- **Don't** pintar fundos de card em laranja; o laranja Vita é ação, seleção, identidade e foco.
- **Don't** introduzir uma segunda família tipográfica, um tamanho fora da escala de meio pixel ou uma sombra estrutural nova.
- **Don't** mostrar CPF, cartão ou nome completo; a tool não devolve e a tela não inventa.
