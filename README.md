# Vita — agente de bem-estar financeiro

Batalha de Agentes (Itaú × Google Cloud), 26–27/09/2026. Agente conversacional em ADK sobre GCP
que detecta o custo do rotativo do cartão no extrato do cliente e oferece só os tratamentos que
cabem no orçamento, sempre com confirmação. Todo número vem de tool determinística; o modelo
nunca calcula, decide nem executa.

## Entregáveis obrigatórios

| # | Entregável | Onde está | Status |
| --- | --- | --- | --- |
| 1 | **Proposta de negócio** (jornada, dor, proposta de valor, impacto) | Documento entregue pela equipe no workspace do evento (fora deste repositório); base em [`docs/produto/PRD.md`](docs/produto/PRD.md) | Entregue |
| 2 | **Protótipo funcional** (clicável, avaliado em Design & Experiência) | **https://vita-app-996610300787.us-central1.run.app** — público, sem login; roteiro abaixo | No ar |
| 3 | **Racional de prototipação** (elementos, decisões de experiência, critérios) | [`docs/entregaveis/3. Racional de prototipação.md`](docs/entregaveis/3.%20Racional%20de%20prototipa%C3%A7%C3%A3o.md) | Entregue |
| 4 | **Desenho de solução** (arquitetura, engenharia e ciência de dados) | [`docs/entregaveis/4. Desenho de solução (arquitetura).drawio`](docs/entregaveis/4.%20Desenho%20de%20solu%C3%A7%C3%A3o%20%28arquitetura%29.drawio) (abrir em diagrams.net / draw.io); SVGs em [`docs/diagrams/`](docs/diagrams/) | Entregue |
| 5 | **Documento explicativo da arquitetura** (componentes, integrações, decisões, justificativas) | [`docs/entregaveis/5. Documento explicativo da arquitetura.md`](docs/entregaveis/5.%20Documento%20explicativo%20da%20arquitetura.md) (mesmo conteúdo de [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)) | Entregue |

### Como navegar no protótipo (entregável 2)

1. Abra a URL: a tela de bloqueio mostra o push do Vita. Toque em **Abrir no Vita**.
2. O chat abre com a mensagem de abertura do agente, o **Raio-X da fatura** (fatura, pago, saldo no
   rotativo, juros, reserva, índice) e os **tratamentos** calculados por regra: usar a reserva (T01)
   e parcelar (T02).
3. Toque em um tratamento, leia o comparativo e confirme com um **iToken de 6 dígitos** (na demo,
   qualquer combinação exceto `000000`). Depois, o Vita pede consentimento para lembrar.
4. Os chips acima do campo de texto disparam perguntas ao agente; "Posso ficar no rotativo por
   mais de um mês?" traz a resposta do especialista com a norma citada.
5. **Falar com uma pessoa** (ícone no cabeçalho) abre o encaminhamento com protocolo.
6. Cena do cliente sem oferta de crédito (faixa V): **https://vita-app-996610300787.us-central1.run.app/?cliente=marcos**

A URL é a do serviço `vita-app` no Cloud Run do projeto do evento, na forma determinística
(nome do serviço + número do projeto): não muda entre versões e permanece pública. A forma com
hash (`vita-app-277ilp3dyq-uc.a.run.app`) aponta para o mesmo serviço.

## Mais

- Mapa da documentação: [`docs/README.md`](docs/README.md)
- Convenções para quem for alterar o código: [`CLAUDE.md`](CLAUDE.md)
- Front (React/Vite + Express): [`web/`](web/) · Agente (ADK, FastAPI): [`agent/`](agent/) ·
  Deploy e smokes: [`infra/scripts/`](infra/scripts/)
