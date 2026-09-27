# Design Spec: Vita web

Spec do aplicativo web publicado como `vita-app`. Descreve o que a pessoa faz em [web/](../../web/) e o que cada tela mostra. Viewport de referência: coluna de 420 px dentro da moldura, ou a viewport inteira abaixo de 768 px.

## Sources

- Initiative: Vita, agente de bem-estar financeiro — [docs/design/PRODUCT.md](PRODUCT.md)
- PRD: [docs/produto/PRD.md](../produto/PRD.md)
- Decisions:
  - Jornada da demo, critérios CA-02, CA-03, CA-05, CA-06, CA-07, CA-14, CA-15, CA-17 e CA-19 no PRD
  - Restrições de tela e princípios em [docs/design/PRODUCT.md](PRODUCT.md)
  - Roteiro e desvios em [docs/entregaveis/3. Racional de prototipação.md](../entregaveis/3.%20Racional%20de%20prototipação.md)
  - Catálogo de ações e texto de abertura de reserva em [agent/app/abertura.py](../../agent/app/abertura.py)
  - Comportamento de tela em [web/src/App.tsx](../../web/src/App.tsx), [web/src/components/](../../web/src/components/) e [web/server.ts](../../web/server.ts)

Afirmações de produto levam **Sourced**, **Assumed** ou **Open**. Cifras de exemplo não são texto obrigatório da tela: todo valor exibido vem de `/api/*`.

## Principles

1. **Sourced.** Todo valor em reais, percentual ou data na tela existe porque uma tool o calculou e `/api/*` o entregou; um valor ausente aparece como "—". Isso recusa uma tela com cifra escrita no componente.
2. **Sourced.** O push é neutro: o título é o texto do agente e não carrega valor, produto nem a palavra "juros". Isso recusa uma notificação que já mostra o juros do mês.
3. **Sourced.** O cliente confirma com iToken antes de qualquer tratamento, e "Falar com uma pessoa" permanece no cabeçalho. Isso recusa quitar o rotativo ou parcelar ao toque no card.
4. **Sourced.** Quem está na faixa V vê o motivo e o caminho humano, sem card de parcela. Isso recusa oferecer T02 ao Marcos.
5. **Sourced.** Cada balão do agente se identifica como "Vita · IA", e a interface não usa "garantido", "aprovado", "sem risco", "sangria" nem "você errou". Isso recusa um título de culpa ou uma promessa de aprovação.

## Scope

- In:
  - Push na tela de bloqueio e abertura da conversa já montada.
  - Raio-X da fatura, detalhe da fatura e visão financeira.
  - T01 (usar a reserva) e T02 (parcelar), com iToken e estado depois da confirmação.
  - Cena da faixa V (Marcos) e o sheet de falar com uma pessoa.
  - Conversa livre, citações de norma, leitura em voz e memória com consentimento.
  - Troca Bruno/Marcos, moldura no desktop e volta à tela de bloqueio.
- Out:
  - Push real do sistema operacional, biometria e execução bancária. **Sourced:** o PRD deixa push e transação como simulação.
  - Entrada por voz, navegação inferior e painel fora da conversa. **Sourced:** o app é o chat; o microfone não existe no composer.
  - Tokens visuais, que ficam em [docs/design/DESIGN.md](DESIGN.md).
  - Guardrails, tools e o texto que o modelo redige: o spec cobre só o que a tela faz com a resposta.

## Platforms

- **Web, desktop com moldura.** **Sourced:** [PRODUCT.md](PRODUCT.md) declara a plataforma web e a demo projetada numa moldura de celular. Largura máxima 420 px, altura máxima 880 px (92 vh), raio 44 px. Abaixo do relógio da moldura há uma faixa de 36 px. O botão de moldura troca para coluna de até 896 px (94 vh).
- **Web, viewport estreita (abaixo de 768 px).** **Sourced:** [DESIGN.md](DESIGN.md). A moldura, a ilha e o botão de alternar somem; o app ocupa a viewport. Toque e ponteiro usam os mesmos controles. Alvo mínimo dos controles do app: 44 px.

Não há rotas. Um sheet por vez, contido na moldura.

## Flows

### Push e abertura

- Actor: Bruno, cliente padrão. Marcos entra pelo fluxo da faixa V.
- Entry: a página abre com a tela de bloqueio por cima da conversa vazia. **Sourced:** `pushVisivel` começa verdadeiro.
- Steps:
  1. A tela pede `/api/abertura` e `/api/financial-profile`.
  2. O cartão mostra a marca, "VITA", "agora", o título `push` e o texto fixo de que os detalhes ficam dentro do app.
  3. "Abrir no Vita" ou "Deslize para cima" tira o bloqueio e, se a abertura chegou, coloca o balão inicial com as ações do agente. Em seguida a conversa renderiza o Raio-X e os tratamentos.
- Decisions:
  - "Lembrar mais tarde" troca o cartão por "Notificação adiada" e "Restaurar notificação". O bloqueio continua.
  - "Deslize para cima" chama a mesma abertura do botão, inclusive quando o título ainda é "Carregando…". **Assumed:** o PRD não descreve o gesto; se o gesto devesse esperar o push, o botão da base precisa da mesma trava do botão "Abrir no Vita".
- Done: a conversa mostra o texto da abertura, os chips de ação e os dois cards, sem a pessoa ter digitado. **Sourced:** CA-03.
- Recovery: se `/api/abertura` falha, o título permanece "Carregando…" e "Abrir no Vita" fica desabilitado. O gesto da base ainda revela a conversa vazia, sem Raio-X. A seta do cabeçalho devolve o bloqueio, zera a conversa local, fecha o sheet e busca o perfil de novo.

### Diagnóstico

- Actor: Bruno, depois da abertura. Marcos vê o mesmo Raio-X; os tratamentos seguem o fluxo da faixa V.
- Entry: cards sob o balão marcado como abertura, ou um chip cuja ação é `abrir_fatura` ou `abrir_visao_financeira`. Os rótulos do catálogo são "Ver a fatura" e "Ver visão financeira". **Sourced:** `CATALOGO_ACOES`.
- Steps:
  1. O Raio-X mostra mês, barra pago / saldo / juros, totais, reserva quando existe, e o índice quando o perfil o traz.
  2. "Fatura completa" abre o sheet da fatura: totais do ciclo e o histórico de 2025, do mês mais recente para o mais antigo.
  3. "Visão financeira" abre o sheet do índice, dos quatro pilares e dos indicadores.
  4. Com T01 presente e nenhum tratamento confirmado nesta sessão, o rodapé da visão oferece "Usar a reserva" e "Comparar com parcelar", e o corpo traz o bloco "Recomendação principal: usar a reserva" com "Por que recomendamos isso".
- Decisions:
  - "Usar a reserva" fecha a visão e abre o T01.
  - "Comparar com parcelar" fecha a visão e abre o T02.
  - Fechar, Escape ou toque no véu devolvem à conversa. Os dados do perfil permanecem.
- Done: a pessoa leu fatura, índice e reserva sem enviar mensagem.
- Recovery: com `referenceMonth` nulo, o Raio-X mantém "Carregando o extrato…" e as linhas em "—". Não há botão de tentar de novo. **Assumed:** uma falha de `/api/financial-profile` fica igual ao carregamento; se a falha precisar de mensagem própria, o card ganha um estado de erro.

### T01, usar a reserva

- Actor: Bruno, quando o perfil traz `t01`.
- Entry: chip `abrir_simulacao_t01` ("Simular usar a reserva"), a opção "Usar a reserva" no card de tratamentos, ou o botão homônimo na visão.
- Steps:
  1. O sheet "Usar a reserva para quitar o rotativo" mostra saldo a quitar, juros evitados, origem, comparativo mensal, reserva antes e depois, meses de essenciais e "Por que recomendamos isso".
  2. O iToken de 6 dígitos libera "Confirmar" com o saldo.
  3. O front envia `simulacao_id`, iToken e uma chave de idempotência criada na abertura do sheet para `/api/confirmar`.
  4. Com sucesso, o sheet troca para o hero "Rotativo quitado com a reserva", a condição confirmada e o comparativo. O confete dispara dentro da moldura.
  5. "Voltar para a conversa", o fecho ou Escape acrescentam o balão de confirmação e, na primeira vez da página, a pergunta de memória.
- Decisions: não há escolha de prazo. A pessoa confirma ou fecha.
- Done: balão com o id de execução, card verde "Reserva usada: rotativo quitado", e a pergunta "Quer que eu lembre…" se ainda não foi feita.
- Recovery:
  - Token recusado ou falha de rede: o sheet continua na simulação, o iToken digitado permanece, a mesma chave vale para a nova tentativa, e um balão diz que nada foi executado.
  - Sem `t01`: o sheet explica que não há simulação e não mostra o iToken.
  - Com o tratamento já marcado nesta sessão, "Confirmar" fica desabilitado e o iToken some; se também não houver `t01`, o texto é "Este tratamento já foi aplicado nesta sessão."
  - "Simular outra opção" no card verde só devolve as opções na sessão. Não apaga a execução. Um novo confirm gera chave nova. **Assumed:** o PRD trata a confirmação como única (CA-14); se a segunda execução for indesejada, esse controle precisa deixar de reabrir o confirm.
  - A seta do cabeçalho busca o perfil de novo. Os zeros gravados só na página (saldo do rotativo, juros do mês, saldo da reserva) não sobrevivem a essa busca. O índice não é recalculado na confirmação. **Open:** ver Em aberto.

### T02, parcelar o rotativo

- Actor: Bruno, quando o perfil traz `t02` e ao menos um prazo aprovado.
- Entry: chip `abrir_simulacao_t02` ("Simular parcelar a fatura"), a opção "Parcelar o rotativo" no card, ou "Comparar com parcelar" na visão.
- Steps:
  1. O sheet mostra saldo, custo mensal atual de juros, taxa da faixa e, se a regra de atenção vale, o aviso de que só cabe prazo cuja parcela fique até esse custo.
  2. Prazos aprovados são rádios, com parcela e juros totais. O de menor juros totais já nasce selecionado.
  3. Prazos reprovados aparecem numa frase ("não cabem na regra"), sem rádio.
  4. O aviso da tool e a carência ficam acima do iToken. "Confirmar" nomeia o prazo e a parcela.
  5. Sucesso troca para o hero "Parcelamento no lugar do rotativo", a condição e o comparativo mês anterior / próximos meses. O balão na conversa repete prazo, parcela, taxa, juros totais e o aviso.
- Decisions: a pessoa troca o prazo aprovado. Um prazo reprovado não é selecionável.
- Done: card verde "Parcelamento confirmado: rotativo parado" e a mesma pergunta de memória da primeira confirmação.
- Recovery: igual ao T01 quanto a token inválido, chave e balão de falha. Sem `t02`, o sheet diz que não há parcelamento e aponta falar com uma pessoa; não há iToken. Sem prazo aprovado, o botão lê "Nenhum prazo cabe na regra" e fica desabilitado.

### Faixa V

- Actor: Marcos, com `?cliente=marcos` ou pelo avatar, que recarrega a página. **Sourced:** CA-05 e a cena do PRD.
- Entry: a mesma abertura. O perfil vem com `offers.elegivel` falso.
- Steps:
  1. O Raio-X segue o diagnóstico.
  2. No lugar das opções, o card "Sem oferta de crédito por regra" mostra a faixa, o motivo, o encaminhamento e "Falar com uma pessoa".
  3. O sheet de pessoa usa o subtítulo "Renegociação assistida, sem novo crédito" e o texto do motivo mais o encaminhamento.
- Decisions: não há T01 nem T02 nesse card. Chips de ação que o agente ainda mandar continuam abrindo o sheet correspondente; sem payload, o sheet cai no estado vazio do T01 ou do T02.
- Done: a pessoa chega ao protocolo humano sem ver parcela.
- Recovery: enquanto `offers` é nulo e não há T01 nem T02, o card de tratamentos não renderiza. **Assumed:** isso cobre o carregamento; se Marcos demorar a receber `offers`, a tela fica só com o Raio-X até a resposta.

### Falar com uma pessoa

- Actor: Bruno ou Marcos, a qualquer momento depois que o bloqueio saiu. O controle do cabeçalho existe também por baixo do bloqueio, sem uso enquanto o bloqueio cobre a página.
- Entry: o botão do cabeçalho, o chip `falar_com_pessoa`, ou o botão do card da faixa V.
- Steps:
  1. O sheet "Falar com uma pessoa" explica o que o Vita viu.
  2. A pessoa escolhe "Chat com uma pessoa" ou "Agendar ligação". Uma opção por vez; chat nasce selecionado.
  3. O bloco "O que vai junto" diz se segue resumo (faixa, mês, gatilho e recomendação, sem valores, nome ou identificador) ou só o protocolo.
  4. O botão primário acompanha a escolha: "Falar com uma pessoa agora" ou "Agendar a ligação".
  5. O front envia `/api/pessoa` com o consentimento de memória já dado na página e o motivo da modalidade.
- Decisions: chat ou ligação. O consentimento não se pede de novo neste sheet; vale o que a página já guardou.
- Done: estado de sucesso com protocolo, fila ("Renegociação assistida" ou "Atendimento geral", ou o código da fila se vier outro) e modalidade. A conversa ganha um balão com o protocolo no momento em que o agente responde, ainda com o sheet aberto. "Voltar para a conversa" fecha.
- Recovery: falha mantém a pessoa no sheet, diz que nada foi enviado e oferece "Tentar de novo". Fechar durante o carregamento zera o estado local, e o pedido que já saiu segue. Se a resposta chega depois, o balão entra no log e, ao reabrir, o sheet pode já estar no sucesso. **Assumed:** não há como desfazer o protocolo pela interface.

### Conversa livre

- Actor: Bruno ou Marcos, na conversa.
- Entry: o composer "Converse ou pergunte ao Vita…" ou um dos quatro chips: "Quanto paguei de juros no ano?", "Posso ficar no rotativo por mais de um mês?", "Qual a economia entre quitar à vista ou parcelar?", "Como recompor minha reserva?".
- Steps:
  1. O texto da pessoa entra no fim do log, alinhado à direita.
  2. O log mostra "O Vita está calculando…". Os quatro chips e o envio ficam desabilitados. O chip de memória continua utilizável.
  3. A resposta vira balão do agente. Só trechos entre `**` ficam em negrito; o resto é texto. Citações, quando o agente as manda e o link é `http` ou `https`, aparecem como "Fonte:" com link. Outro link vira o nome da fonte sem âncora.
  4. "Ouvir mensagem" lê aquele balão em pt-BR. O toggle do cabeçalho, quando ligado, lê as respostas novas do agente, exceto a abertura.
- Decisions: nenhuma além do texto enviado. Uma pergunta pronta é uma mensagem comum.
- Done: o balão do agente está no log e o composer aceita outro envio.
- Recovery: HTTP de erro acrescenta "Não consegui falar com o agente agora…", com o convite a tentar de novo ou falar com uma pessoa. A mensagem da pessoa permanece. Se o agente devolve texto vazio, o proxy grava uma frase segura: recusa de transferência quando a tool de confirmação apareceu, ou o convite a ver a visão e as opções de juros nos outros casos. **Sourced:** [web/server.ts](../../web/server.ts). A pessoa vê essa frase como balão normal.

### Memória

- Actor: Bruno ou Marcos, na mesma página, depois de uma confirmação T01 ou T02 bem-sucedida, ou a qualquer momento pelo chip de memória.
- Entry: a pergunta no balão, uma vez, ou o chip "O que você lembra sobre mim?".
- Steps:
  1. "Sim, pode lembrar" ou "Agora não" chamam `/api/memoria/consentimento` sem passar pelo modelo. Os botões saem do balão.
  2. A resposta confirma que vai lembrar, ou que nada será guardado entre conversas.
  3. "O que você lembra sobre mim?" lista chave e valor, ou diz que não há lembrança. O texto afirma que valores de transação, cadastro e mensagens não são guardados.
  4. Com ao menos um item, o balão oferece "Apagar tudo o que você lembra". Um toque apaga, revoga o consentimento na página e confirma a quantidade apagada.
- Decisions: consentir ou recusar. A pergunta não se repete na mesma carga da página depois de respondida, nem se o consentimento já está ligado.
- Done: o sheet de pessoa passa a refletir o consentimento no bloco "O que vai junto".
- Recovery: a seta do cabeçalho zera o marcador "já perguntei", e a próxima confirmação pode perguntar de novo se a pessoa ainda não consentiu. O consentimento já dado permanece na página até apagar ou recarregar. **Assumed:** voltar à tela de bloqueio não revoga o sim; se a volta devesse recomeçar o consentimento, o reset precisa limpar esse marcador. Trocar Bruno/Marcos recarrega a página e recomeça.

## Information architecture

- Aplicativo, uma coluna: a conversa é a página.
  - Bloqueio: cena inicial, por cima da conversa, até abrir ou até a seta do cabeçalho devolvê-la.
  - Conversa: cabeçalho, log, Raio-X e tratamentos (só depois da abertura), chips e composer.
    - Fatura: sheet filho da conversa.
    - Visão financeira: sheet filho da conversa; pode abrir T01 ou T02.
    - T01: sheet filho da conversa ou da visão.
    - T02: sheet filho da conversa ou da visão.
    - Pessoa: sheet filho da conversa, do cabeçalho ou do card da faixa V.

## Accessibility and input

Estas regras valem em toda tela. A seção da tela só registra a exceção.

- Todo controle tem nome acessível igual ao rótulo visível, ou um `aria-label` quando o controle é só ícone (fechar, ouvir, voz, pessoa, moldura, voltar, simular outra opção, enviar).
- A tarefa principal percorre teclado, com foco visível. Escape fecha o sheet aberto. O painel do sheet recebe foco ao abrir. Não há armadilha além do diálogo, que solta o foco ao fechar.
- A ordem do foco segue a leitura: cabeçalho, log, chips, composer; no sheet, fecho e conteúdo, depois o rodapé.
- Texto com contraste de pelo menos 4,5:1. Componentes e texto grande, pelo menos 3:1. **Sourced:** meta WCAG 2.1 AA em [PRODUCT.md](PRODUCT.md). O laranja `#FF6200` com texto branco fica abaixo de 4,5:1 no texto normal; texto sobre o névoa laranja usa `#C24A00`. **Sourced:** decisão de 27/09 no PRODUCT.md.
- Erro, sucesso e carregamento são anunciados: o log é `role="log"` e `aria-live="polite"`; "O Vita está calculando…" e os estados do sheet de pessoa usam `role="status"` ou `role="alert"`.
- Com `prefers-reduced-motion`, as animações de CSS caem para um instante e o confete não dispara. O hero e o texto de sucesso continuam na tela.
- Alvos de ação têm no mínimo 44 px de altura. **Sourced:** PRD, área de toque.

## Screens

### Bloqueio

- Job: mostrar o push e abrir a conversa já montada.
- Parent: raiz, por cima da conversa.
- Content, in reading order: cadeado, data, relógio, cartão do push (marca, "VITA", "agora", título, texto fixo, "Abrir no Vita", "Lembrar mais tarde"), uma segunda notificação só visual, "Deslize para cima".
- Primary action: "Abrir no Vita". Abre a conversa com a abertura quando ela existe.
- Focus: o bloqueio cobre a página; o primeiro controle útil é "Abrir no Vita". Ao abrir, o foco não é movido para o balão. **Assumed:** se o foco precisasse cair no primeiro chip, a abertura teria de movê-lo.
- Confirmation: none.
- Destructive: none.
- Accessibility exceptions: a segunda notificação empilhada não é controle. O relógio não tem rótulo além do texto visível.

| State | When it appears | What the user sees and can do |
| --- | --- | --- |
| default | A abertura já trouxe `push` | Título do agente, "Abrir no Vita" habilitado, "Lembrar mais tarde" e "Deslize para cima" |
| empty | "Lembrar mais tarde" | "Notificação adiada." e "Restaurar notificação", que devolve o cartão |
| loading | `push` ainda nulo | Título "Carregando…"; "Abrir no Vita" desabilitado; o gesto da base ainda abre |
| error | A busca da abertura falhou | O mesmo que loading: o título não sai de "Carregando…" e não há mensagem de falha |
| success | Abriu pelo botão ou pelo gesto com abertura presente | O bloqueio some e a conversa mostra o balão inicial |
| disabled | Título ainda ausente | "Abrir no Vita" não dispara; o gesto da base dispara |
| permission | N/A | O bloqueio não pede permissão |

### Conversa

- Job: ler o diagnóstico, escolher um caminho e falar com o Vita.
- Parent: raiz, visível quando o bloqueio saiu.
- Content, in reading order: cabeçalho (voltar, Vita, presença, "assistente com IA", pessoa, voz, moldura a partir de 768 px, inicial do cliente); log; sob a abertura, Raio-X e tratamentos; chips; composer.
- Primary action: o primeiro chip de ação da abertura, desenhado como chip ativo. O resultado depende do `tipo` que o agente mandou.
- Focus: permanece onde a pessoa estava. Mensagem nova entra no fim do log e a área rola até ela.
- Confirmation: a pergunta de memória é a confirmação de guardar objetivos e tratamentos.
- Destructive: "Apagar tudo o que você lembra" apaga as lembranças num toque, sem segundo diálogo. A frase seguinte informa quantas saíram. Não há desfazer.
- Accessibility exceptions: o avatar que troca o cliente recarrega a página. A moldura só existe a partir de 768 px.

| State | When it appears | What the user sees and can do |
| --- | --- | --- |
| default | Abertura aplicada e perfil com mês | Balão, Raio-X preenchido, tratamentos ou card da faixa V, composer livre |
| empty | Bloqueio dispensado sem abertura | Log sem balão e sem cards; composer e chips de pergunta continuam |
| loading | Perfil sem `referenceMonth`, ou envio em curso | Raio-X em "Carregando o extrato…" com "—", e/ou "O Vita está calculando…"; os quatro chips de pergunta e o envio desabilitados |
| error | `/api/chat` falhou | O texto da pessoa permanece e um balão pede para tentar de novo ou falar com uma pessoa |
| success | T01 ou T02 confirmado nesta sessão | Card verde no lugar das opções, balão com o id de execução e, na primeira vez, a pergunta de memória |
| disabled | Agente respondendo | Envio e as quatro perguntas não disparam; memória, cabeçalho e sheets já abertos seguem as próprias regras |
| permission | Pergunta de memória visível | "Sim, pode lembrar" e "Agora não"; some depois da escolha |

### Fatura

- Job: ler o ciclo de referência e como a fatura foi paga em 2025.
- Parent: conversa.
- Content, in reading order: título "Detalhamento da fatura", totais (fatura, pagamento, saldo, juros do ciclo), "Como você pagou a fatura em 2025" com modo, valor pago e juros ou "sem juros".
- Primary action: "Fechar". Volta à conversa.
- Focus: o painel do sheet ao abrir; ao fechar, o foco não volta ao botão que abriu. **Assumed:** o retorno do foco ao controle de origem não está implementado; se for exigido, o sheet precisa guardá-lo.
- Confirmation: none.
- Destructive: none.
- Accessibility exceptions: none.

| State | When it appears | What the user sees and can do |
| --- | --- | --- |
| default | Mês de referência presente | Totais e a lista, mês mais recente primeiro |
| empty | Histórico vazio com o mês já carregado | O título da lista permanece e não há linhas |
| loading | `referenceMonth` nulo | Subtítulo "Carregando…"; linhas de totais em "—" |
| error | N/A | A falha do perfil não tem mensagem neste sheet; a tela fica no loading |
| success | N/A | Este sheet não confirma ação |
| disabled | N/A | Não há controle desabilitado além do que a página já cobriu |
| permission | N/A | Não pede consentimento |

### Visão financeira

- Job: ler o índice e, quando couber, seguir para um tratamento.
- Parent: conversa.
- Content, in reading order: índice de 0 a 100 e status; quatro pilares sobre 25; juros do mês, reserva e meses de essenciais (saldo da reserva dividido pela média de essenciais, na página), poupança sobre entradas, crédito na renda; bloco da reserva quando há T01 e nenhum tratamento nesta sessão.
- Primary action: "Usar a reserva", quando o bloco existe. Abre o T01.
- Focus: igual ao sheet da fatura.
- Confirmation: none neste sheet. A confirmação é no T01 ou no T02.
- Destructive: none.
- Accessibility exceptions: a barra do índice tem `aria-label` com o valor. Meses de cobertura são conta da página sobre dois campos do perfil, não um campo próprio da tool. **Assumed:** se esse número precisar ser o `meses_cobertura_essenciais` do T01, a conta local sai.

| State | When it appears | What the user sees and can do |
| --- | --- | --- |
| default | Perfil carregado, sem tratamento nesta sessão, com T01 | Índice, indicadores e os dois botões de tratamento |
| empty | Sem T01, ou tratamento já marcado | Índice e indicadores; sem bloco de recomendação e sem os dois botões |
| loading | Score nulo | O índice mostra "—"; pilares e indicadores omitem o que falta |
| error | N/A | Não há mensagem de falha própria; campos ausentes ficam "—" |
| success | `treatmentStatus` diferente de pendente | O indicador de juros do mês usa o tom de sucesso; os botões de tratamento somem |
| disabled | N/A | Os botões somem em vez de ficarem desabilitados |
| permission | N/A | Não pede consentimento |

### T01

- Job: ver o custo de usar a reserva e confirmar com iToken.
- Parent: conversa ou visão financeira.
- Content, in reading order: saldo a quitar, comparativo "Sem fazer nada" / "Usando a reserva", reserva hoje, quitação, novo saldo, meses de essenciais, "Por que recomendamos isso"; no rodapé, iToken e "Confirmar". No sucesso: hero, condição confirmada, comparativo de fluxo.
- Primary action: "Confirmar" com o saldo quitado. Chama `/api/confirmar`.
- Focus: painel ao abrir. No sucesso, "Voltar para a conversa".
- Confirmation: iToken de 6 dígitos. A ajuda diz que na demo qualquer sequência vale, menos 000000. **Sourced:** campo em [web/src/components/ui.tsx](../../web/src/components/ui.tsx) e CA-14.
- Destructive: none. A execução é registrada; a tela não oferece desfazer no agente.
- Accessibility exceptions: o hero é decorativo (`aria-hidden` no ícone); o título do sucesso é texto.

| State | When it appears | What the user sees and can do |
| --- | --- | --- |
| default | `t01` presente e tratamento ainda pendente | Simulação completa, iToken e confirmar habilitado só com 6 dígitos |
| empty | Sem `t01` e tratamento pendente | Frase de indisponibilidade; sem iToken |
| loading | Confirmação em curso | O botão lê "Confirmando…" e fica desabilitado; o iToken permanece |
| error | O agente recusou ou a rede falhou | A simulação continua; um balão na conversa diz que nada foi executado |
| success | O agente confirmou | Hero, condição, comparativo; fechar acrescenta o balão e pode perguntar a memória |
| disabled | Tratamento já marcado nesta sessão, com `t01` ainda no perfil | A simulação aparece e "Confirmar" não dispara; o iToken não é exibido |
| permission | N/A | O iToken é confirmação da ação, não consentimento de memória |

### T02

- Job: escolher um prazo que cabe na regra e confirmar com iToken.
- Parent: conversa ou visão financeira.
- Content, in reading order: saldo, custo mensal de juros, taxa da faixa, aviso da regra de atenção quando vale, frase dos prazos reprovados, rádios dos prazos aprovados, aviso da tool e carência; no rodapé, iToken e "Confirmar". No sucesso: hero, plano, taxa, juros totais, carência, id da simulação e comparativo.
- Primary action: "Confirmar" com prazo e parcela do rádio selecionado.
- Focus: painel ao abrir; o grupo de prazos é `radiogroup`.
- Confirmation: iToken, mesma regra do T01.
- Destructive: none.
- Accessibility exceptions: "cabe na regra" e "não cabem na regra" estão no texto, não só na cor. Não há o disclosure "Por que recomendamos isso"; a regra aparece no aviso de atenção e no `aviso` da tool. **Assumed:** o PRD pede esse disclosure em toda recomendação; no T02 ele está dissolvido nesses dois textos. Se precisar do mesmo bloco do T01, o sheet ganha o disclosure.

| State | When it appears | What the user sees and can do |
| --- | --- | --- |
| default | `t02` com ao menos um prazo aprovado | Rádio do menor juros totais já marcado; os reprovados só na frase |
| empty | `t02` nulo | Frase de indisponibilidade e convite a falar com uma pessoa; sem iToken |
| loading | Confirmação em curso | "Confirmando…" com o botão desabilitado |
| error | Recusa ou falha de rede | A escolha de prazo permanece; balão de que nada foi executado |
| success | Agente confirmou | Hero e condição; fechar grava o balão na conversa |
| disabled | Nenhum prazo aprovado, ou iToken com menos de 6 dígitos | O botão não envia; sem prazo aprovado o rótulo é "Nenhum prazo cabe na regra" |
| permission | N/A | Igual ao T01: o token confirma a ação |

### Pessoa

- Job: abrir protocolo com uma pessoa, com ou sem resumo.
- Parent: conversa.
- Content, in reading order: o que o Vita viu; "Como prefere ser atendido?" com chat e ligação; "O que vai junto". No carregamento: "Abrindo o seu protocolo…". No erro: "Não consegui abrir o protocolo" e "Tentar de novo". No sucesso: protocolo, fila e modalidade.
- Primary action: "Falar com uma pessoa agora" ou "Agendar a ligação". No sucesso, "Voltar para a conversa".
- Focus: painel ao abrir. No erro, o foco permanece no sheet, onde está "Tentar de novo".
- Confirmation: a escolha da modalidade e o botão primário. Não pede iToken.
- Destructive: none.
- Accessibility exceptions: chat e ligação são `radio` num `radiogroup`. O carregamento é `role="status"`; o erro é `role="alert"`.

| State | When it appears | What the user sees and can do |
| --- | --- | --- |
| default | Sheet acabou de abrir | Duas modalidades, bloco do que segue no protocolo, botão primário conforme a escolha |
| empty | N/A | Não há horário comercial nem fila vazia desenhados; as duas modalidades sempre aparecem |
| loading | Pedido enviado | "Abrindo o seu protocolo…" e o texto condiz com o consentimento; o rodapé some |
| error | HTTP de erro ou rede | Mensagem, "Nada foi enviado", "Tentar de novo" |
| success | Agente devolveu protocolo | Protocolo, fila, modalidade e "Voltar para a conversa"; o balão já está no log |
| disabled | N/A | Não há opção desabilitada; durante o loading o rodapé fica ausente |
| permission | Consentimento de memória ainda falso | "O que vai junto" diz que só o protocolo segue |

## QA checks

1. [Bloqueio / default] O título do push é o texto vindo da abertura e não contém valor em reais nem a palavra "juros".
2. [Bloqueio / disabled] "Abrir no Vita" não abre a conversa enquanto o título é "Carregando…".
3. [Bloqueio / empty] "Lembrar mais tarde" mostra "Notificação adiada." e "Restaurar notificação" devolve o cartão.
4. [Conversa / success] Abrir com a abertura presente mostra o balão, o Raio-X e os tratamentos sem a pessoa digitar.
5. [Conversa / loading] Com o mês ainda nulo, o Raio-X diz "Carregando o extrato…" e as linhas de valor mostram "—".
6. [Conversa / empty] Dispensar o bloqueio antes da abertura deixa o log sem balão e sem Raio-X.
7. [Conversa / default] Com oferta inelegível, o card diz "Sem oferta de crédito por regra" e não lista parcela.
8. [Conversa / default] O cabeçalho mostra "Falar com uma pessoa" e cada balão do agente mostra "Vita · IA".
9. [Fatura / default] O histórico lista o mês mais recente primeiro, com o modo de pagamento e "sem juros" ou o valor dos juros.
10. [Visão financeira / default] Com T01 e sem tratamento nesta sessão, a pessoa vê "Usar a reserva", "Comparar com parcelar" e "Por que recomendamos isso".
11. [Visão financeira / success] Depois de um tratamento confirmado, esses dois botões não aparecem.
12. [T01 / disabled] "Confirmar" permanece desabilitado com menos de 6 dígitos e também quando o tratamento já está marcado na sessão.
13. [T01 / error] Um iToken recusado deixa a simulação aberta e acrescenta um balão dizendo que nada foi executado.
14. [T01 / success] O hero "Rotativo quitado com a reserva" aparece, e o confete não dispara com movimento reduzido.
15. [T01 / empty] Sem payload de T01, o sheet não mostra o campo de iToken.
16. [T02 / default] Um prazo reprovado aparece só na frase "não cabem na regra" e não é um rádio.
17. [T02 / disabled] Sem prazo aprovado, o botão lê "Nenhum prazo cabe na regra" e não envia.
18. [T02 / success] O hero e a condição confirmada mostram prazo, parcela e o aviso de IOF e CET que a tool mandou.
19. [Pessoa / default] Chat e ligação são exclusivos, e o rótulo do botão primário acompanha a opção marcada.
20. [Pessoa / permission] Sem consentimento de memória, "O que vai junto" diz que só o protocolo segue.
21. [Pessoa / error] A falha permanece no sheet, diz que nada foi enviado e oferece "Tentar de novo".
22. [Pessoa / success] Protocolo, fila e modalidade ficam visíveis, e "Voltar para a conversa" fecha o sheet.
23. [Conversa / loading] Durante a resposta, o log mostra "O Vita está calculando…" e os quatro chips de pergunta não enviam.
24. [Conversa / error] Uma falha de chat conserva a mensagem da pessoa e acrescenta o balão que pede nova tentativa ou uma pessoa.
25. [Conversa / default] Citação com link http ou https aparece como "Fonte:" com âncora; a resposta sobre norma sem citação não ganha link inventado na página.
26. [Conversa / permission] A pergunta de memória aparece uma vez depois da primeira confirmação, com "Sim, pode lembrar" e "Agora não".
27. [Conversa / default] "O que você lembra sobre mim?" lista as lembranças ou diz que não há, e "Apagar tudo o que você lembra" só aparece quando há ao menos uma.
28. [Conversa / default] A seta do cabeçalho devolve a tela de bloqueio e busca o perfil de novo.

## Open

- O índice do Raio-X e da visão financeira continua o do perfil depois de confirmar T01 ou T02. A página zera saldo do rotativo, juros do mês e, no T01, o saldo da reserva, só até a próxima busca do perfil. **Sourced:** [PRODUCT.md](PRODUCT.md), em aberto. Blocks: decidir se o índice e o status passam a refletir o rotativo quitado nesta sessão ou se permanecem os do extrato.
