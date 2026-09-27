---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/components/ChatArea.tsx","web/src/components/Header.tsx","web/src/components/PrescriptionFooter.tsx"]
---

# Superfície: web/ (chat do Vita, vita-app)

Escopo: migração de UI do `web/` para o mundo do Vita-UI; toda funcionalidade atual do chat e dos fluxos (abertura pelo push, perfil, T01, T02, confirmação com iToken, consentimento e memória, pessoa, especialista com citação, cena do Marcos, voz, moldura) permanece. Modo: Operate (o cliente conclui a tarefa: entender o custo e escolher um tratamento), com a banca assistindo projetado.

Público e tarefa: Bruno recebe um push, abre o chat, vê o Raio-X e as opções, confirma uma. Marcos vê o custo, nenhuma oferta e o caminho humano. Prova: todos os números vêm de `/api/*`. Restrições: sem nome, laranja, azul ou fonte do Itaú; sem "garantido/aprovado"; PT-BR; WCAG 2.1 AA.

## Direction contract

THESIS: o chat é o app, e o Raio-X e as opções vivem dentro da conversa como cards claros e chips em pílula; recusa o layout "cabeçalho escuro + rodapé de cards + modais centrais" do protótipo anterior e qualquer painel que pareça dashboard.

OWN-WORLD: fundo `#F7F7F7`, cartões brancos com borda `#EDEDED` e sombra suave `0 2px 12px rgba(0,0,0,.03)`, forma pedra (24 px) nos cards e squircles, CTAs em pílula, Inter; acento verde Vita `#0F7A5A` (hover `#0B5C44`, claro `#E6F4EE`), grafite `#1A1A1A` nos balões do usuário, ênfase média `#6E6E6E`, feedback sucesso `#00875A`/`#E6F7F0`, alerta `#DE350B`/`#FFEBE5`, aviso `#FFAB00`/`#FFF8E6`, info `#0065FF`/`#E6F0FF`. Sem reconhecer, sobra: balões assimétricos (canto superior esquerdo reto no Vita, inferior direito no usuário), chips brancos com ícone à esquerda, sheets que sobem do rodapé com cabeçalho e fecho circular.

STORY: "o Vita viu isto no meu extrato, me mostrou quanto custa, me deu duas saídas com os números e só executa se eu confirmar com o iToken; se eu não couber na regra, me leva a uma pessoa."

FIRST VIEWPORT: tela de bloqueio escura com relógio grande e o push rico (squircle verde com estrela, "VITA · agora", título neutro do agente, botão pílula "Abrir no Vita", "Lembrar mais tarde"). Ao abrir: Top App Bar branca (voltar, squircle verde, "Vita" + ponto verde pulsante, "assistente com IA"; à direita, voz, pessoa, Bruno/Marcos), balão de abertura do agente, card Raio-X (pedra) com fatura, pago, saldo no rotativo, juros e barra de comprometimento; chips de ações do agente; card "Tratamentos" com T01 (Recomendação Vita) e T02 como linhas em pílula; composer em pílula fixo no rodapé com chips de memória e perguntas acima.

FORM: mundo pinado pelo usuário (repositório Vita-UI, `COMPONENT_INVENTORY.md`), com a marca Itaú substituída pelo acento verde; roll de direções não rodado por ser pino de brief; seed: nenhum.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Momento memorável: o hero de confirmação dentro do sheet (pedra verde com check, tag "Confirmado", comparativo mês anterior × próximo mês com os números da simulação).

Em aberto: bottom navigation (fora do escopo); índice do cabeçalho após confirmar (decisão de produto).
