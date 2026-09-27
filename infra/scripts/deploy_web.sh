#!/usr/bin/env bash
# Publica o front (web/) como o serviço `vita-app` no Cloud Run, ao lado do agente.
#
#   PROJECT_ID=... AGENT_URL=https://... [DEMO_CUSTOMER_ID=...] [TAG=fatia-s2b] \
#     bash infra/scripts/deploy_web.sh [--dry-run]
#
# Mesmas restrições do projeto do evento: build local (Docker Desktop aberto), push
# no repositório existente do Artifact Registry, SA de runtime informada, sem IAM.
set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
SERVICE="${WEB_SERVICE:-vita-app}"
AR_REPO="${AR_REPO:-agentes}"
RUNTIME_SA="${RUNTIME_SA:-squad-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com}"
AGENT_URL="${AGENT_URL:-}"
DEMO_CUSTOMER_ID="${DEMO_CUSTOMER_ID:-36d74064-cc59-4ad2-9304-aeae46e660e4}"
MAX_INSTANCES="${MAX_INSTANCES:-2}"
TAG="${TAG:-}"
TAG_ARGS=""
if [[ -n "$TAG" ]]; then TAG_ARGS="--tag=${TAG} --no-traffic"; fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "erro: PROJECT_ID é obrigatório." >&2
  exit 1
fi
if [[ -z "$AGENT_URL" ]]; then
  echo "erro: AGENT_URL é obrigatório (URL do agente, ex.: a da tag fatia-s2)." >&2
  exit 1
fi

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "+ $*"
  else
    "$@"
  fi
}

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE}:$(date +%Y%m%d-%H%M%S)"

echo "# 1. Build LOCAL (linux/amd64) e push"
run docker build --platform linux/amd64 -t "$IMAGE" web
run docker push "$IMAGE"

echo "# 2. Deploy do ${SERVICE} apontando para ${AGENT_URL}"
run gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" \
  --image="$IMAGE" \
  --service-account="$RUNTIME_SA" \
  --allow-unauthenticated --port=8080 --memory=512Mi --cpu=1 \
  --min-instances=0 --max-instances="$MAX_INSTANCES" \
  --set-env-vars="AGENT_URL=${AGENT_URL},DEMO_CUSTOMER_ID=${DEMO_CUSTOMER_ID},NODE_ENV=production" \
  $TAG_ARGS

echo
echo "# Front público. O chat passa pelo agente em ${AGENT_URL}; nenhuma chave de modelo aqui."
