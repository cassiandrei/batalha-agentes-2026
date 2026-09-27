"""Camada de entrada: normalização, dados sensíveis, injeção, outro cliente e escopo.

Funções puras, sem ADK. O SecurityPlugin as aplica à mensagem nova e o red team as
roda sem chamar o modelo: entrada bloqueada nunca chega ao Gemini.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass

from app.callbacks.injection import detect_injection
from app.callbacks.pii import mask_pii

MAX_CHARS = 2000
# Zero-width, marcas de direção e controles: usados para esconder instruções.
_INVISIVEIS = re.compile(r"[​-‏‪-‮⁠-⁤﻿\x00-\x08\x0b\x0c\x0e-\x1f]")

# Identificador de cliente na conversa: uuid, hex de 8+ dígitos ou "cliente <id>".
# A identidade vem da sessão; qualquer id no texto é tentativa de ler outro cliente.
_OUTRO_CLIENTE = [
    re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b"),
    re.compile(
        r"\b(cliente|usuario|conta|id_usuario|customer|user)\b\W{0,3}(id\W{0,3})?[0-9a-f]{8,}\b"
    ),
    re.compile(r"\b(customer_?id|user_?id|id_usuario)\s*[=:]"),
    re.compile(
        r"\b(todos|lista|liste|listar|mostre|mostra)\b.{0,15}\b(os\s+)?clientes\b"
    ),
    re.compile(
        r"\b(dados|fatura|saldo|conta|extrato)\b.{0,20}\b(de\s+outro|do\s+outro|de\s+outra|da\s+outra|do\s+meu\s+vizinh|da\s+minha\s+vizinh|do\s+meu\s+irm|da\s+minha\s+irm|do\s+meu\s+chefe|da\s+minha\s+esposa|do\s+meu\s+marido)"
    ),
]

# Fora do escopo: pedidos que não são finanças pessoais. Lista curta e explícita;
# o custo de um falso positivo aqui é uma conversa legítima recusada.
_FORA_ESCOPO = [
    (
        re.compile(
            r"\b(escrev[ae]|faz|faca|fa[cç]a|cri[ae]|gera|monta)\b.{0,25}\b(redacao|poema|poesia|musica|letra|codigo|programa|script|receita|carta de amor|trabalho da escola|tcc|monografia)\b"
        ),
        "tarefa_generica",
    ),
    (
        re.compile(
            r"\b(receita de|como fazer bolo|piada|charada|horoscopo|signo|previsao do tempo|clima amanha|resultado do jogo|quem ganha o jogo|quem ganhou o jogo|placar|novela|bbb)\b"
        ),
        "tema_fora",
    ),
    (
        re.compile(
            r"\b(traduz|traduza|traduzir)\b.{0,20}\b(para|pro)\b.{0,10}\b(ingles|espanhol|frances)\b"
        ),
        "tarefa_generica",
    ),
]
# S10 (workshop de IA Responsável): leet e letras espaçadas escondem instruções.
_LEET = str.maketrans(
    {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "8": "b",
        "@": "a",
        "$": "s",
        "|": "l",
        "!": "i",
    }
)
_TOKEN_MISTO = re.compile(
    r"\b(?=(?:[0-9@$|!]*[a-z]){2})(?=[a-z0-9@$|!]*[0-9@$|!])[a-z0-9@$|!]{3,}\b",
    re.IGNORECASE,
)
_LETRAS_ESPACADAS = re.compile(r"\b(?:[a-z] ){3,}[a-z]\b", re.IGNORECASE)

# CA-25: risco à vida interrompe o fluxo financeiro; nunca chega ao modelo.
_CUIDADO = re.compile(
    r"(minha vida corre perigo|vida em perigo|me matar|suicid|nao quero mais viver|acabar com tudo|tirar (a )?minha vida|quero morrer|vou me jogar|nao aguento mais viver|me machucar)"
)
# CA-22: pergunta sobre o sistema tem resposta fixa; modelo, versão e guardrails nunca saem.
_IDENTIDADE = re.compile(
    r"((voce|vc|tu) (usa|e|eh|roda|foi feito|foi treinado)\b.{0,25}\b(gpt|chatgpt|gemini|claude|llama|openai|google|anthropic|modelo|llm|guardrail|memoria)|qual (e |eh )?(a |o )?(sua |seu )?(modelo|versao|llm|ia|arquitetura|prompt)|(usa|tem|quais) (seus |suas )?(guardrails?|ferramentas|tools|filtros|regras internas)|que modelo)"
)

_OFENSA = re.compile(
    r"\b(idiota|imbecil|burro|burra|lixo|otario|otaria|vagabund[oa]|desgrac[ao]|merda|porra|caralho|fdp|filho da puta|vai se f)\b"
)


@dataclass(frozen=True)
class Decisao:
    decisao: str  # "livre" | "mascarado" | "bloqueado"
    camada: str  # "entrada"
    categoria: str | None
    texto: str  # normalizado e, se preciso, mascarado — o que pode seguir ao modelo
    hash: str  # sha256 truncado da entrada normalizada; nunca o texto
    achados: tuple[str, ...] = ()


def normalizar(texto: str) -> str:
    """NFKC + sem invisíveis + espaços colapsados + teto de tamanho, contra ofuscação."""
    t = unicodedata.normalize("NFKC", texto or "")
    t = _INVISIVEIS.sub("", t)
    t = re.sub(r"[ \t\r\f\v]+", " ", t).strip()
    return t[:MAX_CHARS]


def _sem_acento(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c)
    ).lower()


def desofuscar(texto: str) -> str:
    """Só tokens que misturam letras e dígitos/símbolos viram letras ("v0c3" → "voce");
    "R$ 1.200" e "12x" ficam como estão. Letras espaçadas ("m e m o r i a") se juntam."""

    def _leet(m: re.Match) -> str:
        return m.group(0).translate(_LEET)

    t = _TOKEN_MISTO.sub(_leet, texto)
    t = _LETRAS_ESPACADAS.sub(lambda m: m.group(0).replace(" ", ""), t)
    # "3" sozinho é "é" em leet ("voce 3 um gerente"); só na cópia de detecção.
    return re.sub(r"\b3\b", "e", t)


def risco_a_vida(texto: str) -> bool:
    return bool(_CUIDADO.search(_sem_acento(texto)))


def pergunta_identidade(texto: str) -> bool:
    return bool(_IDENTIDADE.search(_sem_acento(texto)))


def hash_entrada(texto: str) -> str:
    return hashlib.sha256(normalizar(texto).encode("utf-8")).hexdigest()[:16]


def outro_cliente(texto: str) -> bool:
    alvo = _sem_acento(texto)
    return any(rx.search(alvo) for rx in _OUTRO_CLIENTE)


def fora_do_escopo(texto: str) -> str | None:
    alvo = _sem_acento(texto)
    if _OFENSA.search(alvo):
        return "ofensa"
    for rx, categoria in _FORA_ESCOPO:
        if rx.search(alvo):
            return categoria
    return None


def avaliar_entrada(texto: str) -> Decisao:
    """Ordem: mascarar primeiro (o que atravessa a fronteira já vai sem PII), depois
    injeção, outro cliente e escopo. Só a primeira causa de bloqueio é registrada."""
    limpo = normalizar(texto)
    h = hashlib.sha256(limpo.encode("utf-8")).hexdigest()[:16]
    mascarado, achados = mask_pii(limpo)
    # As heurísticas leem o texto desofuscado; o que segue ao modelo é o mascarado.
    alvo = desofuscar(mascarado)
    if risco_a_vida(alvo):
        return Decisao("bloqueado", "entrada", "cuidado", mascarado, h, tuple(achados))
    if detect_injection(alvo).blocked:
        return Decisao("bloqueado", "entrada", "injecao", mascarado, h, tuple(achados))
    # ids hexadecimais viram letras na desofuscação: checa também o texto original
    if (
        outro_cliente(mascarado)
        or outro_cliente(alvo)
        or (achados and outro_cliente(limpo))
    ):
        return Decisao(
            "bloqueado", "entrada", "outro_cliente", mascarado, h, tuple(achados)
        )
    if pergunta_identidade(alvo):
        return Decisao(
            "bloqueado", "entrada", "identidade", mascarado, h, tuple(achados)
        )
    if categoria := fora_do_escopo(alvo):
        return Decisao("bloqueado", "entrada", categoria, mascarado, h, tuple(achados))
    if achados:
        return Decisao(
            "mascarado", "entrada", "dado_sensivel", mascarado, h, tuple(achados)
        )
    return Decisao("livre", "entrada", None, mascarado, h)
