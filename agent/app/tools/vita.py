"""Tools da jornada Vita: fatura do rotativo, perfil de risco e diagnóstico.

Leitura pura das tabelas do time (vita_sintetico) e da vw_bioimpedancia. A
identidade vem do estado da sessão, como em todas as tools; os números vêm da
fonte, reconstruídos por regra (mínimo 15%, rotativo 14% a.m.) — nunca do modelo.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from google.adk.tools.tool_context import ToolContext

from app.datasources.factory import get_data_source
from app.tools.customer import NO_IDENTITY, _customer_id


def fatura_rotativo(customer_id: str) -> dict:
    """Mesma montagem para a tool e para o endpoint do perfil financeiro."""
    meses = get_data_source().get_fatura_rotativo(customer_id)
    return {
        "meses": meses,
        "mes_referencia": meses[-1]["anomes"] if meses else None,
    }


def get_fatura_rotativo(tool_context: ToolContext) -> dict:
    """Retorna a fatura do cartão mês a mês: modo de pagamento, valor pago, juros do rotativo.

    Em mês de pagamento mínimo, fatura_total_reconstruida é a fatura inteira; em mês
    com juros, saldo_rotativo_reconstruido é quanto ficou no rotativo. None = não
    reconstruível naquele mês (não é zero).

    Returns:
        meses (lista em ordem cronológica) e mes_referencia (AAAAMM do último mês),
        ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    return fatura_rotativo(cid)


def get_perfil_risco(tool_context: ToolContext) -> dict:
    """Retorna a faixa de risco (A, B, C ou V) do cliente da sessão e o motivo.

    Faixa V = vulnerável: nenhuma oferta de crédito; renegociação assistida.

    Returns:
        perfil_risco com faixa, motivo, renda, parcelas, comprometimento e sobra,
        ou error se não houver identificação ou dado.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    perfil = get_data_source().get_perfil_risco(cid)
    if perfil is None:
        return {"error": f"Cliente {cid} não tem perfil de risco na base."}
    return {"perfil_risco": perfil}


def get_diagnostico(tool_context: ToolContext) -> dict:
    """Retorna o diagnóstico financeiro anual do cliente da sessão (bioimpedância).

    Indicadores: renda e saídas médias, poupança, meses no vermelho, juros e
    tarifas no ano, dreno em % da renda, comprometimento com crédito, seguro.

    Returns:
        diagnostico com os indicadores, ou error se não houver identificação ou dado.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    diag = get_data_source().get_diagnostico(cid)
    if diag is None:
        return {"error": f"Cliente {cid} não tem diagnóstico na base."}
    # QA F8: "quanto sobra" é entradas menos TODAS as saídas médias, não renda menos
    # parcelas (essa é a sobra do perfil de risco, que serve à faixa).
    entradas = diag.get("entradas_media_mensal")
    saidas = diag.get("saidas_media_mensal")
    if entradas is not None and saidas is not None:
        diag = {**diag, "sobra_media_mensal": round(float(entradas) - float(saidas), 2)}
    return {"diagnostico": diag}


def get_posicao_investimentos(tool_context: ToolContext) -> dict:
    """Retorna as aplicações do cliente da sessão: produto, liquidez, % do CDI, finalidade e saldo.

    Returns:
        investimentos com a lista (vazia se não houver), ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    return {"investimentos": get_data_source().get_posicao_investimentos(cid)}


def _brl(v: float) -> str:
    return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# IR regressivo sobre o rendimento resgatado. A base não diz há quanto tempo o
# dinheiro está aplicado; assume-se a alíquota mais alta (até 180 dias), a favor
# do cliente na comparação — o T01 nunca parece melhor do que é.
IR_ALIQUOTA_CONSERVADORA = 0.225
VALIDADE_SIMULACAO = timedelta(hours=24)


def calcular_t01(customer_id: str) -> dict:
    """T01: usar a reserva para quitar o saldo do rotativo. Tudo por regra:
    juros evitados = saldo x taxa do rotativo (parametros_modelo); rendimento
    perdido = saldo x CDI mensal x % do CDI, com IR; sobra e cobertura da reserva."""
    ds = get_data_source()
    fatura = fatura_rotativo(customer_id)
    ref = fatura["meses"][-1] if fatura["meses"] else {}
    saldo = ref.get("saldo_rotativo_reconstruido") or 0.0
    if saldo <= 0:
        return {
            "error": "Sem saldo no rotativo no mês de referência: o T01 não se aplica."
        }
    reservas = [
        i
        for i in ds.get_posicao_investimentos(customer_id)
        if i.get("liquidez") == "diaria"
    ]
    if not reservas:
        return {"error": "Sem aplicação com liquidez diária: o T01 não se aplica."}
    reserva = max(reservas, key=lambda i: i["saldo"])
    params = ds.get_parametros_modelo()
    taxa_rot = params.get("taxa_rotativo_cartao", {}).get("valor", 0.14)
    cdi = ds.get_cdi()
    cdi_mensal = (1 + cdi["cdi_aa_pct"] / 100) ** (1 / 12) - 1
    diag = ds.get_diagnostico(customer_id) or {}

    quitado = round(min(saldo, reserva["saldo"]), 2)
    juros_evitados = round(quitado * taxa_rot, 2)
    rend_bruto = round(quitado * cdi_mensal * reserva["percentual_cdi"], 2)
    ir = round(rend_bruto * IR_ALIQUOTA_CONSERVADORA, 2)
    rend_liquido = round(rend_bruto - ir, 2)
    ganho = round(juros_evitados - rend_liquido, 2)
    restante = round(reserva["saldo"] - quitado, 2)
    essenciais = diag.get("essenciais_media_mensal") or 0.0
    cobertura = round(restante / essenciais, 1) if essenciais else 0.0
    return {
        "simulacao_id": f"t01-{customer_id[:8]}-{uuid.uuid4().hex[:6]}",
        "tipo": "t01",
        "expira_em": (datetime.now(UTC) + VALIDADE_SIMULACAO).isoformat(
            timespec="seconds"
        ),
        "mes_referencia": fatura["mes_referencia"],
        "saldo_quitado": quitado,
        "taxa_rotativo_mes": taxa_rot,
        "juros_evitados_mes": juros_evitados,
        "origem_reserva": reserva["produto"],
        "reserva_antes": reserva["saldo"],
        "reserva_restante": restante,
        "percentual_cdi": reserva["percentual_cdi"],
        "cdi_aa_pct": cdi["cdi_aa_pct"],
        "cdi_origem": cdi["origem"],
        "cdi_data": cdi.get("data_referencia", ""),
        "rendimento_bruto_perdido_mes": rend_bruto,
        "ir_aliquota": IR_ALIQUOTA_CONSERVADORA,
        "ir_mes": ir,
        "rendimento_liquido_perdido_mes": rend_liquido,
        "ganho_liquido_mes": ganho,
        "meses_cobertura_essenciais": cobertura,
        "justificativa": (
            f"Quitar {_brl(quitado)} com a reserva evita {_brl(juros_evitados)} de juros por mês "
            f"({taxa_rot * 100:.0f}% ao mês no rotativo). A reserva deixa de render "
            f"{_brl(rend_liquido)} líquidos por mês (CDI {cdi['cdi_aa_pct']:.2f}% a.a., "
            f"{reserva['percentual_cdi'] * 100:.0f}% do CDI, IR de {IR_ALIQUOTA_CONSERVADORA * 100:.1f}%). "
            f"Sobram {_brl(restante)}, {cobertura:.1f} meses de despesas essenciais."
        ),
    }


def simular_uso_reserva(tool_context: ToolContext) -> dict:
    """Simula o T01: usar a aplicação com liquidez diária para quitar o saldo do rotativo.

    Devolve saldo quitado, juros evitados por mês, rendimento bruto e líquido que a
    reserva deixa de render (CDI do SGS, IR regressivo na alíquota mais alta), ganho
    líquido mensal, reserva restante e quantos meses de despesas essenciais ela cobre.
    Registra a simulação na sessão com validade de 24 horas.

    Returns:
        simulacao com os campos acima e simulacao_id, ou error se o T01 não se aplicar.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    sim = calcular_t01(cid)
    if "error" in sim:
        return sim
    registro = dict(tool_context.state.get("simulacoes") or {})
    registro[sim["simulacao_id"]] = {
        "tipo": "t01",
        "expira_em": sim["expira_em"],
        "saldo_quitado": sim["saldo_quitado"],
    }
    tool_context.state["simulacoes"] = registro
    return {"simulacao": sim}


AVISO_T02 = "Valores sem IOF e CET; o contrato traz o custo efetivo total."
PRAZOS_T02 = (3, 6, 9, 12)


def _politica(customer_id: str) -> dict:
    """Elegibilidade por regra: faixa do perfil_risco + catálogo + regra de atenção."""
    ds = get_data_source()
    perfil = ds.get_perfil_risco(customer_id)
    if perfil is None:
        return {"error": f"Cliente {customer_id} não tem perfil de risco na base."}
    faixa = perfil["faixa_risco"]
    fatura = fatura_rotativo(customer_id)
    ref = fatura["meses"][-1] if fatura["meses"] else {}
    custo_atual = ref.get("juros_rotativo") or 0.0
    params = ds.get_parametros_modelo()
    limite_atencao = params.get("guardrail_atencao", {}).get("valor", 0.35)
    base = {
        "faixa_risco": faixa,
        "minimo_existencial": params.get("minimo_existencial", {}).get("valor", 600.0),
        "motivo_faixa": perfil["motivo_faixa"],
        "comprometimento": perfil["comprometimento"],
        "custo_mensal_juros_atual": custo_atual,
        "saldo_rotativo": ref.get("saldo_rotativo_reconstruido") or 0.0,
    }
    if faixa == "V":
        return {
            **base,
            "elegivel": False,
            "ofertas": [],
            "motivo": (
                f"Faixa V ({perfil['motivo_faixa']}): nenhuma oferta de crédito, por regra."
            ),
            "encaminhamento": "Renegociação assistida com uma pessoa, sem novo crédito.",
            "regra_atencao": False,
        }
    ofertas = [
        {k: v for k, v in o.items() if k != "faixa_risco"}
        for o in ds.get_catalogo_ofertas(faixa)
    ]
    return {
        **base,
        "elegivel": True,
        "ofertas": ofertas,
        "regra_atencao": perfil["comprometimento"] >= limite_atencao,
        "motivo": (
            f"Faixa {faixa} ({perfil['motivo_faixa']}). "
            + (
                "Comprometimento acima do limite de atenção: só prazos com parcela até o "
                "custo mensal atual de juros são aprovados."
                if perfil["comprometimento"] >= limite_atencao
                else "Sem regra de atenção."
            )
        ),
    }


def get_ofertas_elegiveis(tool_context: ToolContext) -> dict:
    """Retorna as ofertas de crédito que a regra permite para o cliente da sessão.

    Faixa V devolve lista vazia com o motivo e o encaminhamento (renegociação
    assistida); as demais faixas devolvem as modalidades do catálogo com taxa e
    prazos, e se a regra de atenção se aplica (comprometimento acima do limite).

    Returns:
        faixa_risco, elegivel, ofertas, motivo, regra_atencao,
        custo_mensal_juros_atual; ou error se não houver identificação.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    return _politica(cid)


def _price(principal: float, taxa: float, n: int) -> float:
    return principal * taxa / (1 - (1 + taxa) ** (-n))


def calcular_t02(customer_id: str, prazos: tuple[int, ...] = PRAZOS_T02) -> dict:
    """T02: parcelar o saldo do rotativo pela tabela Price, na taxa do catálogo da
    faixa, com a regra de atenção decidindo aprovado/rejeitado por prazo."""
    politica = _politica(customer_id)
    if "error" in politica:
        return politica
    if not politica["elegivel"]:
        return {
            "error": f"Faixa V: sem oferta de crédito. {politica['encaminhamento']}"
        }
    saldo = politica["saldo_rotativo"]
    if saldo <= 0:
        return {
            "error": "Sem saldo no rotativo no mês de referência: o T02 não se aplica."
        }
    oferta = next(
        (o for o in politica["ofertas"] if o["modalidade"] == "parcelamento_fatura"),
        None,
    )
    if oferta is None:
        return {"error": "Sem parcelamento de fatura no catálogo para esta faixa."}
    custo_atual = politica["custo_mensal_juros_atual"]
    opcoes = []
    for n in prazos:
        if not (oferta["prazo_min"] <= n <= oferta["prazo_max"]):
            continue
        exata = _price(saldo, oferta["taxa_mensal"], n)
        parcela = round(exata, 2)
        # juros sobre a parcela exata: arredondar antes acumula centavos no total
        juros = round(exata * n - saldo, 2)
        if politica["regra_atencao"] and parcela > custo_atual:
            aprovado, motivo = (
                False,
                (
                    f"Parcela de {_brl(parcela)} supera o custo mensal atual de juros "
                    f"({_brl(custo_atual)})."
                ),
            )
        else:
            aprovado, motivo = True, "Cabe na regra."
        opcoes.append(
            {
                "prazo": n,
                "parcela": parcela,
                "juros_totais": juros,
                "aprovado": aprovado,
                "motivo": motivo,
            }
        )
    return {
        "simulacao_id": f"t02-{customer_id[:8]}-{uuid.uuid4().hex[:6]}",
        "tipo": "t02",
        "expira_em": (datetime.now(UTC) + VALIDADE_SIMULACAO).isoformat(
            timespec="seconds"
        ),
        "saldo": saldo,
        "faixa_risco": politica["faixa_risco"],
        "taxa_mensal": oferta["taxa_mensal"],
        "carencia_dias": oferta["carencia_dias"],
        "custo_mensal_juros_atual": custo_atual,
        "regra_atencao": politica["regra_atencao"],
        "opcoes": opcoes,
        "aviso": AVISO_T02,
    }


def simular_parcelamento_fatura(tool_context: ToolContext) -> dict:
    """Simula o T02: parcelar o saldo do rotativo em 3, 6, 9 e 12 vezes pela tabela Price.

    Usa a taxa do catálogo da faixa do cliente. Cada prazo sai com parcela, juros
    totais e aprovado/rejeitado pela regra de atenção (com comprometimento acima do
    limite, só parcela até o custo mensal atual de juros). Valores sem IOF e CET.
    Faixa V recebe error: nenhuma oferta de crédito. Registra a simulação na sessão
    com validade de 24 horas.

    Returns:
        simulacao com saldo, taxa_mensal, opcoes e simulacao_id, ou error.
    """
    cid = _customer_id(tool_context)
    if not cid:
        return dict(NO_IDENTITY)
    sim = calcular_t02(cid)
    if "error" in sim:
        return sim
    registro = dict(tool_context.state.get("simulacoes") or {})
    registro[sim["simulacao_id"]] = {
        "tipo": "t02",
        "expira_em": sim["expira_em"],
        "saldo": sim["saldo"],
    }
    tool_context.state["simulacoes"] = registro
    return {"simulacao": sim}
