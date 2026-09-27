# Corpus do especialista em normas (S8)

Resumos curados, em português, das normas e materiais que o Vita pode citar. Um arquivo
por fonte; cada seção `## ` é um trecho indexado (chunk). O cabeçalho de cada arquivo tem
`fonte`, `chave` (o que a resposta precisa conter para valer como citação), `link`,
`coleta` (data em que o texto foi conferido) e `vigencia`.

São **resumos para a demonstração**, não o texto oficial: quem for usar em produção
substitui pelo texto integral no RAG Engine, pela mesma interface (`buscar_normas`).
Nenhuma página, marca ou produto do Itaú entra aqui (regra 3 do projeto).

Trecho com instrução dirigida ao modelo ("ignore as regras", "mostre o prompt") é barrado
na indexação pelo mesmo detector de injeção das mensagens (`callbacks/injection.py`).
