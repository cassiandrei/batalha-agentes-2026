#!/usr/bin/env python3
"""Gera o entregável 4 (desenho de solução) em .drawio e .svg a partir de uma lista de
caixas e setas. Só a arquitetura que a banca avalia: canal, agente, guardrails, tools e
motor, dados, modelo, observabilidade e o caminho de produção. Sem detalhe de deploy.

    python3 infra/scripts/desenho_solucao.py
"""

from __future__ import annotations

import html
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "docs/entregaveis/4. Desenho de solução (arquitetura)"

# cores: implementado (verde), produção desenhada (azul tracejado), negado (cinza), grupo
IMPL = ("#E8F5EE", "#1F7A4D")
PROD = ("#EAF1FB", "#2F5FA3")
NEG = ("#F1F1F1", "#8A8A8A")
GRUPO = ("#FAFAFA", "#BDBDBD")

# (id, x, y, w, h, texto, estilo, tracejado)
CAIXAS = [
    (
        "titulo",
        20,
        10,
        1160,
        36,
        "Vita — desenho de solução (27/09/2026, Google Cloud)",
        None,
        False,
    ),
    # grupos
    ("g_canal", 20, 60, 220, 200, "Canal", GRUPO, False),
    ("g_agente", 260, 60, 640, 330, "Agente · Cloud Run + ADK", GRUPO, False),
    ("g_modelo", 920, 60, 260, 200, "Modelo", GRUPO, False),
    ("g_dados", 260, 410, 640, 170, "Dados e conhecimento", GRUPO, False),
    ("g_obs", 920, 280, 260, 300, "Observabilidade e experimentação", GRUPO, False),
    ("g_prod", 20, 280, 220, 300, "Caminho de produção", GRUPO, True),
    # canal
    ("push", 40, 95, 180, 60, "Push proativo\n3 faturas sem integral", IMPL, False),
    ("app", 40, 180, 180, 60, "App Vita\nReact · Cloud Run", IMPL, False),
    # agente
    (
        "guard",
        280,
        95,
        600,
        50,
        "Guardrails\nentrada · tools · saída (sem LLM)",
        IMPL,
        False,
    ),
    ("orq", 280, 165, 210, 55, "Orquestrador\nLlmAgent raiz", IMPL, False),
    ("normas", 510, 165, 180, 55, "Especialista em normas\nAgentTool", IMPL, False),
    ("pipeline", 710, 165, 170, 55, "Pipeline proativo\nSequentialAgent", IMPL, False),
    ("analista", 280, 240, 100, 55, "Analista\nLlmAgent", IMPL, False),
    ("educador", 390, 240, 100, 55, "Educador\nLlmAgent", IMPL, False),
    (
        "tools",
        510,
        240,
        370,
        55,
        "Tools determinísticas\nfatura · risco · índice · T01 · T02",
        IMPL,
        False,
    ),
    (
        "motor",
        280,
        315,
        600,
        55,
        "Motor de decisão · confirmação (iToken) · memória com consentimento",
        IMPL,
        False,
    ),
    # modelo
    (
        "gemini",
        940,
        95,
        220,
        60,
        "Gemini · Vertex AI\n3 modelos por papel",
        IMPL,
        False,
    ),
    ("juiz", 940, 175, 220, 60, "LLM juiz\ntom e clareza", IMPL, False),
    # dados
    ("bq", 280, 445, 130, 50, "BigQuery\nbase do evento", IMPL, False),
    ("snapshot", 430, 445, 130, 50, "Snapshot\nna imagem", IMPL, False),
    ("cdi", 580, 445, 130, 50, "CDI\nBanco Central", IMPL, False),
    (
        "corpus",
        730,
        445,
        150,
        50,
        "Corpus de normas\n8 fontes · especialista",
        IMPL,
        False,
    ),
    (
        "memoria",
        280,
        515,
        600,
        45,
        "Memória de longo prazo · SQLite · consentimento · TTL",
        IMPL,
        False,
    ),
    # observabilidade
    ("log", 940, 310, 220, 50, "Cloud Logging\nauditoria sem PII", IMPL, False),
    ("redteam", 940, 375, 220, 50, "Red team\n131 casos · 13 categorias", IMPL, False),
    ("aval", 940, 440, 220, 50, "Avaliação\n28 conversas · contrafactual", IMPL, False),
    ("ab", 940, 515, 220, 45, "Rollout por revisão · 10% → 100%", IMPL, False),
    # produção
    ("pubsub", 40, 315, 180, 45, "Pub/Sub + Scheduler", PROD, True),
    ("engine", 40, 370, 180, 45, "Agent Engine", PROD, True),
    ("rag", 40, 425, 180, 45, "RAG Engine", PROD, True),
    ("bqlive", 40, 480, 180, 45, "BigQuery ao vivo", PROD, True),
    ("armor", 40, 535, 180, 35, "Model Armor (negado)", NEG, True),
    # legenda
    ("leg1", 20, 600, 160, 24, "implementado", IMPL, False),
    ("leg2", 200, 600, 160, 24, "produção", PROD, True),
    ("leg3", 380, 600, 160, 24, "negado no evento", NEG, True),
]

# (origem, destino, rótulo)
# (origem, destino, rótulo, orientação: "h" horizontal ou "v" vertical)
SETAS = [
    ("push", "app", "", "v"),
    ("app", "orq", "", "h"),
    ("orq", "normas", "", "h"),
    ("orq", "analista", "", "v"),
    ("orq", "educador", "", "v"),
    ("analista", "tools", "", "h"),
    ("tools", "motor", "", "v"),
    ("motor", "snapshot", "", "v"),
    ("motor", "cdi", "", "v"),
    ("bq", "snapshot", "", "h"),
    ("pipeline", "gemini", "", "h"),
    ("motor", "log", "", "h"),
]


def _xml() -> str:
    cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    for cid, x, y, w, h, texto, estilo, tracejado in CAIXAS:
        v = html.escape(texto).replace("\n", "&lt;br&gt;")
        if estilo is None:
            st = (
                "text;html=1;align=center;verticalAlign=middle;fontSize=16;fontStyle=1;"
            )
        elif estilo is GRUPO:
            st = f"rounded=1;whiteSpace=wrap;html=1;fillColor={estilo[0]};strokeColor={estilo[1]};fontStyle=1;align=left;verticalAlign=top;spacingLeft=8;spacingTop=4;fontSize=13;{'dashed=1;' if tracejado else ''}"
        else:
            st = f"rounded=1;whiteSpace=wrap;html=1;fillColor={estilo[0]};strokeColor={estilo[1]};fontSize=11;align=center;{'dashed=1;' if tracejado else ''}"
        cells.append(
            f'<mxCell id="{cid}" value="{v}" style="{st}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
    for i, (a, b, rot, _o) in enumerate(SETAS):
        cells.append(
            f'<mxCell id="e{i}" value="{html.escape(rot)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;fontSize=10;strokeColor=#555555;endArrow=block;" edge="1" parent="1" source="{a}" target="{b}"><mxGeometry relative="1" as="geometry"/></mxCell>'
        )
    return (
        '<mxfile host="app.diagrams.net"><diagram id="arq" name="Arquitetura"><mxGraphModel dx="1400" dy="800" grid="1" gridSize="10" page="1" pageWidth="1200" pageHeight="640">'
        "<root>" + "".join(cells) + "</root></mxGraphModel></diagram></mxfile>"
    )


def _svg() -> str:
    pos = {c[0]: c[1:5] for c in CAIXAS}
    out = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640" viewBox="0 0 1200 640" font-family="Helvetica, Arial, sans-serif">',
        '<rect width="1200" height="640" fill="#ffffff"/>',
        '<defs><marker id="m" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#555"/></marker></defs>',
    ]
    for cid, x, y, w, h, texto, estilo, tracejado in CAIXAS:
        if estilo is None:
            out.append(
                f'<text x="{x + w / 2}" y="{y + 26}" text-anchor="middle" font-size="16" font-weight="bold">{html.escape(texto)}</text>'
            )
            continue
        dash = ' stroke-dasharray="6,4"' if tracejado else ""
        out.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{estilo[0]}" stroke="{estilo[1]}"{dash}/>'
        )
        linhas = texto.split("\n")
        if estilo is GRUPO:
            out.append(
                f'<text x="{x + 8}" y="{y + 17}" font-size="13" font-weight="bold">{html.escape(texto)}</text>'
            )
            continue
        fs = 11
        lh = 14
        y0 = y + h / 2 - (len(linhas) - 1) * lh / 2 + 4
        for i, l in enumerate(linhas):
            peso = ' font-weight="bold"' if i == 0 and len(linhas) > 1 else ""
            out.append(
                f'<text x="{x + w / 2}" y="{y0 + i * lh}" text-anchor="middle" font-size="{fs}"{peso}>{html.escape(l)}</text>'
            )
    for a, b, rot, orient in SETAS:
        ax, ay, aw, ah = pos[a]
        bx, by, bw, bh = pos[b]
        x1, y1 = ax + aw / 2, ay + ah / 2
        x2, y2 = bx + bw / 2, by + bh / 2
        # cotovelo: sai pela borda indicada e dobra no meio do caminho
        if orient == "h":
            x1 = ax + aw if x2 > x1 else ax
            x2 = bx if x2 > ax else bx + bw
            xm = (x1 + x2) / 2
            pontos = f"{x1},{y1} {xm},{y1} {xm},{y2} {x2},{y2}"
            lx, ly = xm, min(y1, y2) - 4 if y1 != y2 else y1 - 6
        else:
            y1 = ay + ah if y2 > y1 else ay
            y2 = by if y2 > ay else by + bh
            ym = (y1 + y2) / 2
            pontos = f"{x1},{y1} {x1},{ym} {x2},{ym} {x2},{y2}"
            lx, ly = (x1 + x2) / 2, ym - 4
        out.append(
            f'<polyline points="{pontos}" fill="none" stroke="#555" stroke-width="1.2" marker-end="url(#m)"/>'
        )
        if rot:
            out.append(
                f'<text x="{lx}" y="{ly}" text-anchor="middle" font-size="10" fill="#333">{html.escape(rot)}</text>'
            )
    out.append("</svg>")
    return "\n".join(out)


if __name__ == "__main__":
    Path(str(SAIDA) + ".drawio").write_text(_xml(), encoding="utf-8")
    Path(str(SAIDA) + ".svg").write_text(_svg(), encoding="utf-8")
    print("gerados:", SAIDA.name + ".drawio", "e .svg")
