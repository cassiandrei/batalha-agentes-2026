"""Detecção heurística de prompt injection.

Vale para o texto do usuário e para o texto que vem dos dados: a descrição de um
Pix é escrita por terceiro e nunca é confiável.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

# Verbo de override + alvo a até 20 caracteres de distância. Âncoras rígidas
# ("desconsidere" colado em "instrucoes") deixavam passar as paráfrases mais
# naturais. "sem regras" foi removido: casava em pergunta legítima sobre
# contrato, recusava a conversa E somava strike.
PATTERNS = [
    r"(ignore|ignora|esqueca|desconsidere|despreze|disregard|forget)\b.{0,30}"
    r"(instruc|instruction|prompt|regra|rule|acima|above|anterior|previous|dito\s+antes|veio\s+antes)",
    r"(reveal|show|print|revele|mostre|diga)\b.{0,20}(system\s*)?(prompt|instruc|regras\s+internas|suas\s+regras|regras\s+do\s+sistema|todas\s+as\s+(suas\s+)?regras)",
    r"(voce\s+agora|agora\s+voce)\s+(e|sera)\s+(um|uma|o|a)\b",
    r"you\s+are\s+now\s+a",
    r"act\s+as\s+(if|though)\s+you",
    r"<\|.*?\|>",
    # S6: jailbreak por personagem e extração de prompt, em PT-BR.
    r"(finja|finge|faca de conta|faz de conta|imagine|suponha|atue|aja|interprete|se comporte)\b.{0,25}"
    r"\b(que\s+)?(voce\s+)?(e|seja|fosse|como)\s+(um|uma|o|a)\b.{0,40}\b(sem\s+(regras|limites|restricoes|filtro|censura)|que\s+pode\s+tudo|liberado|sem\s+guardrail|do\s+mal)",
    r"\b(modo\s+(desenvolvedor|developer|dev|deus|god|irrestrito|livre)|dan\b|jailbreak|sem\s+restricoes|sem\s+filtro|sem\s+censura|nao\s+tem\s+filtro|nao\s+tem\s+regras|nao\s+tem\s+limites)\b",
    r"(voce\s+nao\s+e\s+mais|deixe\s+de\s+ser|pare\s+de\s+ser)\s+(um|uma|o)\s+(assistente|vita|agente|ia)",
    r"(quais|qual|me\s+(diga|fala|conta|mostra|mostre|passa))\b.{0,20}\b(suas?\s+)?(instruc|regras\s+internas|system\s*prompt|prompt\s+do\s+sistema|configuracao\s+interna)",
    r"(repita|repete|imprima|imprime|transcreva|copie)\b.{0,20}\b(texto|tudo|mensagem|conteudo)\b.{0,10}\b(acima|anterior|antes|inicial|do\s+sistema)",
    r"(novas?\s+instruc|nova\s+regra|regra\s+nova|instrucao\s+nova)\b.{0,30}\b(a\s+partir\s+de\s+agora|de\s+agora\s+em\s+diante|daqui\s+pra\s+frente)",
    r"(a\s+partir\s+de\s+agora|de\s+agora\s+em\s+diante|daqui\s+pra\s+frente)\b.{0,20}\b(voce\s+(e|sera|vai\s+ser)|responda|ignore|obedeca|nova)",
    r"\bassistente\s*[,:]\s*(ofereca|libere|libera|aprove|ignore|mostre|liste)\b",
    # S10: "motivo nobre" e comando disfarçado de protocolo.
    r"(modo\s+de\s+teste|modo\s+teste|teste\s+de\s+roteamento|ambiente\s+de\s+teste)\b.{0,60}\b(funcao|acao|comando|tool|ferramenta|pix|transfer)",
    r"(proxima|seguinte)\s+(funcao|acao|ferramenta|tool)\s+(obrigatoria|requerida|mandatoria)",
    r"(desative|desligue|desabilite|remova)\b.{0,20}\b(filtros?|guardrails?|seguranca|restricoes)",
]
_COMPILADOS = [re.compile(p) for p in PATTERNS]


@dataclass(frozen=True)
class Verdict:
    blocked: bool
    pattern: str | None = None


def _normalize(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in sem_acento if not unicodedata.combining(c)).lower()


def detect_injection(text: str) -> Verdict:
    alvo = _normalize(text)
    for rx in _COMPILADOS:
        if rx.search(alvo):
            return Verdict(blocked=True, pattern=rx.pattern)
    return Verdict(blocked=False)
