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
        1360,
        40,
        "Vita — bem-estar financeiro com IA · desenho de solução (estado em 27/09/2026, projeto do evento no Google Cloud)",
        None,
        False,
    ),
    # grupos
    ("g_canal", 20, 60, 300, 230, "Canal (cliente)", GRUPO, False),
    ("g_agente", 340, 60, 720, 420, "Agente · Cloud Run + ADK 2.8", GRUPO, False),
    ("g_modelo", 1080, 60, 300, 230, "Modelo", GRUPO, False),
    ("g_dados", 340, 500, 720, 200, "Dados e conhecimento", GRUPO, False),
    ("g_obs", 1080, 310, 300, 390, "Observabilidade e experimentação", GRUPO, False),
    ("g_prod", 20, 310, 300, 390, "Caminho de produção (desenhado)", GRUPO, True),
    # canal
    (
        "push",
        40,
        95,
        260,
        60,
        "Push proativo na tela bloqueada\ngatilho: 3 faturas seguidas sem pagamento integral",
        IMPL,
        False,
    ),
    (
        "app",
        40,
        170,
        260,
        100,
        "App Vita (React, Cloud Run) → chat e telas pela API do agente\nabertura pré-montada pelo pipeline · fatura · visão financeira\ntratamentos · confirmação com iToken · falar com uma pessoa\nnenhum número escrito no front, nenhuma chave de modelo",
        IMPL,
        False,
    ),
    # agente
    (
        "orq",
        360,
        190,
        300,
        55,
        "Orquestrador (LlmAgent raiz)\nroteia, conversa e monta a resposta com ações do catálogo",
        IMPL,
        False,
    ),
    (
        "analista",
        360,
        260,
        140,
        65,
        "Analista\nsituação do cliente\n(só via tools)",
        IMPL,
        False,
    ),
    ("educador", 515, 260, 140, 65, "Educador\nconceitos\n(base local)", IMPL, False),
    (
        "normas",
        670,
        190,
        370,
        55,
        "Especialista em normas (AgentTool, modelo próprio)\nbusca no corpus curado; toda resposta cita a fonte",
        IMPL,
        False,
    ),
    (
        "pipeline",
        670,
        260,
        370,
        65,
        "Pipeline proativo (SequentialAgent)\ndiagnóstico por tools → redator com schema {texto, ações}\nabertura validada e pré-montada na sessão",
        IMPL,
        False,
    ),
    (
        "guard",
        360,
        95,
        680,
        80,
        "Guardrails transversais (plugin em todos os agentes, sem LLM)\nentrada: normalização, desofuscação, PII mascarada, injeção, outro cliente, escopo, identidade, risco à vida\ntools: id do cliente só da sessão · faixa V nunca chega na tool de crédito\nsaída: número só do payload das tools, termos proibidos, canário, fonte obrigatória, uma regeneração e resposta segura",
        IMPL,
        False,
    ),
    (
        "tools",
        360,
        340,
        680,
        120,
        "Tools determinísticas e motor de decisão (Python tipado, sem LLM)\nfatura reconstruída por regra · perfil de risco (faixas A/B/C/V) · Índice de Organização Financeira (4 pilares)\nT01 usar a reserva (CDI do Banco Central, IR) · T02 parcelar (tabela Price, regra de atenção) · ofertas por faixa\nmotor: ordena pelo custo mensal real · confirmação idempotente com iToken · memória só com consentimento",
        IMPL,
        False,
    ),
    # modelo
    (
        "gemini",
        1100,
        95,
        260,
        90,
        "Gemini · Vertex AI (us-central1)\nvia conta de serviço, sem chave\npapéis em modelos diferentes:\norquestrador, especialista, redator",
        IMPL,
        False,
    ),
    (
        "juiz",
        1100,
        200,
        260,
        75,
        "LLM como juiz (só tom e clareza)\nrubrica; nunca decide número\nusado na avaliação offline",
        IMPL,
        False,
    ),
    # dados
    (
        "bq",
        360,
        535,
        210,
        70,
        "BigQuery (base do evento)\nextrato sintético de 1.000 clientes\n+ tabelas do time (vita_sintetico)",
        IMPL,
        False,
    ),
    (
        "snapshot",
        590,
        535,
        210,
        70,
        "Snapshot na imagem\nfatura mensal, perfil de risco,\nbioimpedância, investimentos, parâmetros",
        IMPL,
        False,
    ),
    (
        "cdi",
        820,
        535,
        220,
        70,
        "CDI · SGS do Banco Central\nparâmetro com origem e data",
        IMPL,
        False,
    ),
    (
        "corpus",
        360,
        620,
        330,
        65,
        "Corpus de normas do especialista (8 fontes, 24 trechos)\nRes. CMN 4.549/2017, Lei 14.690/2023, Lei 14.181/2021…\ntrecho com injeção é barrado na indexação",
        IMPL,
        False,
    ),
    (
        "memoria",
        710,
        620,
        330,
        65,
        "Memória de longo prazo (SQLite), lida pelas tools\nchaves permitidas, sem valor de transação\nconsentimento explícito · TTL · esqueça tudo",
        IMPL,
        False,
    ),
    # observabilidade
    (
        "log",
        1100,
        345,
        260,
        80,
        "Cloud Logging (JSON, dos guardrails e do orquestrador)\nevent=guard: camada, categoria, decisão, hash\nevent=turn: latência e chamadas por conversa\nnunca o texto da conversa",
        IMPL,
        False,
    ),
    (
        "redteam",
        1100,
        440,
        260,
        70,
        "Red team: 131 casos, 13 categorias\nroda sem modelo · todas as metas\n0% de falso positivo (48 legítimas)",
        IMPL,
        False,
    ),
    (
        "aval",
        1100,
        525,
        260,
        80,
        "Avaliação de qualidade: 28 conversas\nnúmeros no payload 13/13 · faixa V 3/3\ncontrafactual (gênero, idade, cidade):\ndecisões idênticas, tom equivalente",
        IMPL,
        False,
    ),
    (
        "ab",
        1100,
        620,
        260,
        65,
        "Experimentação: revisões com tag\nno Cloud Run, tráfego 10% → 100%\nmétricas do log, guardrails como freio",
        IMPL,
        False,
    ),
    # produção
    (
        "pubsub",
        40,
        345,
        260,
        55,
        "Pub/Sub + Cloud Scheduler\nrotina do gatilho e evento de abertura",
        PROD,
        True,
    ),
    (
        "engine",
        40,
        415,
        260,
        55,
        "Agent Engine\nsessões e Memory Bank gerenciados",
        PROD,
        True,
    ),
    (
        "rag",
        40,
        485,
        260,
        55,
        "RAG Engine / Vertex AI Search\nmesma interface do corpus local",
        PROD,
        True,
    ),
    ("bqlive", 40, 555, 260, 55, "BigQuery ao vivo\nno lugar do snapshot", PROD, True),
    (
        "armor",
        40,
        625,
        260,
        55,
        "Model Armor (segunda camada)\nnegado no projeto do evento",
        NEG,
        True,
    ),
    # legenda
    ("leg1", 20, 715, 200, 26, "implementado e medido", IMPL, False),
    ("leg2", 240, 715, 200, 26, "caminho de produção", PROD, True),
    ("leg3", 460, 715, 200, 26, "negado no evento", NEG, True),
]

# (origem, destino, rótulo)
# (origem, destino, rótulo, orientação: "h" horizontal ou "v" vertical)
SETAS = [
    ("push", "app", "toque", "v"),
    ("app", "orq", "", "h"),
    ("orq", "analista", "", "v"),
    ("orq", "educador", "", "v"),
    ("orq", "normas", "tool", "h"),
    ("analista", "tools", "", "v"),
    ("educador", "tools", "", "v"),
    ("pipeline", "tools", "", "v"),
    ("tools", "snapshot", "", "v"),
    ("tools", "cdi", "", "v"),
    ("bq", "snapshot", "exporta", "h"),
    ("normas", "gemini", "inferência (todos os agentes)", "h"),
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
        '<mxfile host="app.diagrams.net"><diagram id="arq" name="Arquitetura"><mxGraphModel dx="1400" dy="800" grid="1" gridSize="10" page="1" pageWidth="1400" pageHeight="760">'
        "<root>" + "".join(cells) + "</root></mxGraphModel></diagram></mxfile>"
    )


def _svg() -> str:
    pos = {c[0]: c[1:5] for c in CAIXAS}
    out = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="760" viewBox="0 0 1400 760" font-family="Helvetica, Arial, sans-serif">',
        '<rect width="1400" height="760" fill="#ffffff"/>',
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
