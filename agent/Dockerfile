# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /bin/

WORKDIR /code

COPY ./pyproject.toml ./README.md ./uv.lock* ./

COPY ./app ./app

# Download de wheels grandes (pyarrow, scipy) estourava o timeout padrão do uv
# em rede lenta; o build inteiro caía por um pacote.
ENV UV_HTTP_TIMEOUT=600 UV_LINK_MODE=copy
# Cache de wheels persistido entre builds (BuildKit) + retentativa: em rede ruim
# um pacote que cai não joga fora os 200 MB já baixados.
RUN --mount=type=cache,target=/root/.cache/uv \
    for i in 1 2 3 4 5; do uv sync --frozen && break; echo "uv sync falhou ($i), tentando de novo"; sleep 15; done \
    && test -d .venv

# Encenado por `make stage-data`: data/ vive fora do contexto de build (agent/),
# então é copiado para agent/data/ antes do build. Em produção isto some quando
# DATA_SOURCE=bigquery existir. Fica DEPOIS do uv sync: o snapshot muda todo dia
# e não pode invalidar a camada das dependências (~200 MB de wheels por deploy).
COPY ./data ./data

ARG AGENT_VERSION=0.0.0
ENV AGENT_VERSION=${AGENT_VERSION}

EXPOSE 8080

CMD ["uv", "run", "uvicorn", "app.fast_api_app:app", "--host", "0.0.0.0", "--port", "8080"]
