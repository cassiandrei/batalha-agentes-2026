"""deploy_web.sh: o front sobe como serviço próprio, público, apontando para o agente,
sem chave de modelo e com as mesmas restrições do projeto do evento."""

import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
SCRIPT = RAIZ / "infra" / "scripts" / "deploy_web.sh"


def _dry(**extra):
    env = {
        "PATH": "/usr/bin:/bin",
        "PROJECT_ID": "proj-teste",
        "AGENT_URL": "https://agente.exemplo.run.app",
        **extra,
    }
    return subprocess.run(
        ["bash", str(SCRIPT), "--dry-run"], capture_output=True, text=True, cwd=RAIZ, env=env
    )


def test_exige_agent_url():
    r = _dry(AGENT_URL="")
    assert r.returncode != 0
    assert "AGENT_URL" in r.stderr


def test_sobe_vita_app_publico_apontando_para_o_agente_sem_chave():
    saida = _dry().stdout
    assert "gcloud run deploy vita-app" in saida
    assert "--allow-unauthenticated" in saida
    assert "AGENT_URL=https://agente.exemplo.run.app" in saida
    assert "DEMO_CUSTOMER_ID=" in saida
    assert "GEMINI_API_KEY" not in saida
    assert "squad-agent-sa@proj-teste.iam.gserviceaccount.com" in saida
    assert "docker build --platform linux/amd64" in saida  # sem Cloud Build


def test_tag_sem_trafego_opcional():
    assert "--no-traffic" in _dry(TAG="fatia-s2b").stdout
    assert "--no-traffic" not in _dry().stdout
