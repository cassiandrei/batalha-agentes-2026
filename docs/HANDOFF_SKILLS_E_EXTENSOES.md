# Handoff: skills, plugins, conectores e extensões usados no projeto

Estado em 28/09/2026. Tudo o que uma pessoa nova precisa instalar ou conectar para
trabalhar neste repositório com o Claude Code do mesmo jeito que o time trabalhou.
Nada aqui é obrigatório para rodar o Vita (isso é `make setup`, `make test`,
`make deploy`); é o ferramental de desenvolvimento.

## 1. Skills do projeto (`.claude/skills/`, versionadas)

| Skill | Origem | Para que serviu |
| --- | --- | --- |
| `banca-batalha-agentes` | escrita pelo time (não vem de fora) | Simula a banca do hackathon com um juiz por critério do regulamento; usada para revisar entregáveis, ensaiar a sabatina e checar riscos de desclassificação. Há edições locais em andamento nos arquivos dos juízes (`references/`), ainda não commitadas |
| `impeccable` | `pbakaus/impeccable` (GitHub) | Design do front: `init` gerou `docs/design/PRODUCT.md`, `document` gerou `docs/design/DESIGN.md` e o sidecar `.impeccable/design.json`; a migração da UI foi feita numa worktree (`.claude/worktrees/impeccable-init`). Atenção: a skill procura `PRODUCT.md` e `DESIGN.md` na **raiz**; por decisão do time eles vivem em `docs/design/`, então copie para a raiz antes de rodar `document` ou `doctor` e apague depois |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Revisão de acessibilidade e boas práticas de interface (contraste, alvos de toque, rótulos) na S7 e na migração da UI |
| `webapp-testing` | `anthropics/skills` | Testes de front com Playwright (capturas das jornadas em `docs/images/jornada`, verificação de estados) |

As três skills externas estão travadas em `skills-lock.json` (hash da versão instalada).
Para reinstalar na mesma versão: `npx skills add <origem>` respeitando o lock, ou copie a
pasta `.claude/skills/` inteira, que está no repositório.

## 2. Plugins do Claude Code

Habilitados no projeto (`.claude/settings.json`):

| Plugin | Para que serviu |
| --- | --- |
| `ponytail` | Modo "solução mais simples que funciona": guiou o tamanho dos diffs e a regra de não adicionar dependência quando a stdlib resolve (BM25 em 40 linhas, desofuscação com regex, SVG gerado à mão) |
| `agent-skills` (addy) | Skills de processo: `code-review`, `test-driven-development`, `debugging-and-error-recovery`, `security-and-hardening`, `shipping-and-launch`, usadas pontualmente |

Instalados globalmente e usados nas sessões:

| Plugin | Para que serviu |
| --- | --- |
| `superpowers` | Fluxo de trabalho: brainstorming, planos, worktrees isoladas (`using-git-worktrees`), verificação antes de declarar pronto |
| `frontend-design` | Direção visual do front junto com o impeccable |
| `skill-creator` | Criação e ajuste da skill `banca-batalha-agentes` |
| `code-review`, `pr-review-toolkit`, `security-guidance` | Revisões de diff antes dos commits de fatia |

Outros plugins instalados na máquina (`context7`, `feature-dev`, `playwright`, `figma`,
`claude-md-management`, `pyright-lsp`, `typescript-lsp`, `clangd-lsp`,
`commit-commands`, `claude-code-setup`) não foram necessários; podem ser ignorados.

## 3. Skills globais usadas (`~/.claude/skills/`)

`graphify` (grafo de conhecimento do repositório, disparado por `/graphify`) e as skills
de processo `lean-build`, `surgical-patch`, `safe-refactor`, `verify-and-stop`,
`investigate-first`. As da família `caveman`/`cavecrew` (modo econômico de tokens) não
foram usadas neste projeto.

## 4. Conectores (MCP) usados

| Conector | Para que serviu |
| --- | --- |
| Claude Docs (claude.ai) | O PRD e a aba "Fatias verticais" vivem num doc do claude.ai (`3e9ed4e3-3c60-4606-a9de-828c18d30f8f`); exportamos de lá para `docs/produto/PRD.md` e `fatias_verticais.md` e marcamos as fatias como feitas na aba. Exportação: criar um blob em markdown e ler pelo Artifact |
| Google Drive | Leitura do template do entregável 3 ("Racional de prototipação") e dos documentos da pasta do evento |
| Notion | Tentativa de ler o racional de design da equipe; a página não estava no workspace conectado, então foi lida pelo navegador |
| Claude in Chrome | Abrir páginas que não expõem texto por HTTP (Notion público, preview do SVG do desenho de solução) |
| GitHub via `gh` (CLI, não MCP) | Colaboradores e proteção de branch do repositório |

Os conectores `gitlab-syntesis`, `youtrack` e os `postgres*` da configuração global são de
outros projetos e não têm relação com este.

## 5. Ferramentas de linha de comando

| Ferramenta | Versão usada | Uso |
| --- | --- | --- |
| `gcloud` (Google Cloud SDK) | 582.0.0 | Cloud Run, Artifact Registry, Cloud Logging, Vertex; sempre com `--project` do evento e conta `cassiandrei.central@gmail.com` (regra 8: nunca misturar com a conta pessoal) |
| `bq` | incluído no SDK | Consultas e exportação do snapshot (`make stage-evento`) |
| `gh` | 2.87.3 | Repositório, colaboradores, proteção do `main` |
| `uv` | 0.10.4 | Ambiente Python do agente (`agent/.venv`, `pyproject.toml` com `google-adk 2.8`) |
| `ruff` | 0.16.7 | `make lint` |
| `docker` (Docker Desktop) | 29.1.3 | Build local das imagens (Cloud Build foi negado no projeto do evento); `BUILD=local` |
| `node` / `npm` | 24.12 / 11.7 | Front em `web/` (Vite, React, Express); `npm install --legacy-peer-deps` |
| `python3` | 3.12 no venv (3.14 na máquina) | Scripts de `infra/scripts/` rodam com o `python3` da máquina |
| `agents-cli` (Google) | não instalado | O scaffold original veio dele; não é necessário para nada do dia a dia |
| draw.io | não instalado | O `.drawio` é gerado por `infra/scripts/desenho_solucao.py`; para editar à mão, abra em https://app.diagrams.net ou instale a extensão do VS Code |

## 6. Extensões do VS Code (`.vscode/extensions.json`)

`ms-python.python`, `ms-python.vscode-pylance`, `charliermarsh.ruff`,
`googlecloudtools.cloudcode`, `hediet.vscode-drawio` (abre o `.drawio` no editor),
`ms-vscode.makefile-tools`, `redhat.vscode-yaml`. O VS Code sugere instalá-las ao abrir a
pasta.

## 7. Pastas geradas por ferramentas (não editar à mão)

| Pasta | Dona |
| --- | --- |
| `.impeccable/` | impeccable (sidecar do design system) |
| `.superpowers/` | superpowers (specs e planos, `sdd`) |
| `.claude/worktrees/` | worktrees das sessões paralelas; ignorada pelo git |
| `docs/historico/superpowers/` | specs e planos antigos, movidos para o histórico |

## 8. Como as sessões paralelas trabalharam

Duas sessões do Claude Code no mesmo checkout: uma no agente e nos docs, outra no front.
Regras que evitaram conflito: quem edita código em paralelo usa worktree própria e mescla
no `main`; só uma sessão faz deploy por vez, avisando a outra por mensagem entre sessões;
o `main` agora exige pull request com uma aprovação para colaboradores (admins isentos).
