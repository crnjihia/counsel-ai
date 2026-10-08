import json
import re
import structlog
from typing import AsyncGenerator, Dict, Any, Optional, Tuple
from anthropic import AsyncAnthropic
from ..config import settings
from .prompts import get_system_prompt
from .usage import count_tokens

logger = structlog.get_logger(__name__)

def get_client() -> AsyncAnthropic:
    """Return AsyncAnthropic client instance."""
    return AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

def extract_json_from_text(text: str) -> Any:
    """Safely extract and parse JSON from Claude response, handling code fence wrappers."""
    text = text.strip()
    # Strip markdown fence if present
    fence_pattern = r"^```(?:json)?\s*([\s\S]*?)\s*```$"
    match = re.match(fence_pattern, text, re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Search for first { or [ and last } or ]
        first_brace = text.find("{")
        first_bracket = text.find("[")
        start_idx = -1
        end_idx = -1

        if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            start_idx = first_brace
            end_idx = text.rfind("}")
        elif first_bracket != -1:
            start_idx = first_bracket
            end_idx = text.rfind("]")

        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            sub = text[start_idx : end_idx + 1]
            return json.loads(sub)

        raise

async def generate_completion(
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 3000,
    temperature: float = 0.1
) -> Tuple[str, int, int]:
    """Call Claude with system prompt and return (text, tokens_in, tokens_out)."""
    if not settings.ANTHROPIC_API_KEY or settings.ANTHROPIC_API_KEY.startswith("mock") or settings.ANTHROPIC_API_KEY.startswith("sk-ant-api03-your"):
        logger.info("Using built-in Kenyan legal response generator for local testing")
        if "red_flags" in prompt or "Identify clauses" in prompt:
            text = json.dumps({
                "red_flags": [
                    {
                        "clause_text": "Restraint of Trade for 5 consecutive years across Kenya and EAC [Clause 5.1]",
                        "page": 2,
                        "severity": "high",
                        "explanation": "Overly broad restraint of trade under Kenyan Law of Contract Act Cap 23. Kenyan High Court regularly strikes down restraints exceeding 12 months or disproportionate in geography.",
                        "suggestion": "Negotiate to reduce to 12 months maximum, limit scope strictly to direct clients within Nairobi County, and clarify it expires if terminated without cause."
                    },
                    {
                        "clause_text": "Perpetual confidentiality surviving for infinity without expiry [Clause 4]",
                        "page": 2,
                        "severity": "high",
                        "explanation": "Infinite confidentiality imposes indefinite compliance overhead and liability. Standard commercial practice for Kenyan commercial arrangements is 2 to 3 years.",
                        "suggestion": "Request standard sunset clause capping confidentiality at two (2) years from disclosure date."
                    },
                    {
                        "clause_text": "Pre-determined Liquidated Damages of KES 10,000,000 without proof of loss [Clause 6.2]",
                        "page": 2,
                        "severity": "high",
                        "explanation": "Acts as an oppressive penalty clause rather than a genuine pre-estimate of loss, which is disfavoured by Kenyan courts.",
                        "suggestion": "Strike out fixed monetary penalty and replace with liability limited to actual proven direct financial damages."
                    },
                    {
                        "clause_text": "Foreign Arbitration at LCIA seated in London, UK with costs borne by SME Partner [Clause 7.1]",
                        "page": 3,
                        "severity": "high",
                        "explanation": "Offshore arbitration creates astronomical financial hurdles. Filing fees and venue costs in London would bankrupt most Kenyan SMEs.",
                        "suggestion": "Insist on the Nairobi Centre for International Arbitration (NCIA) or Chartered Institute of Arbitrators (Kenya Branch) seated in Nairobi under the Arbitration Act 1995."
                    }
                ]
            })
            return text, 120, 350
        elif "questions" in prompt or "most important questions" in prompt:
            text = json.dumps({
                "questions": [
                    {
                        "question": "Is the KES 10,000,000 liquidated damages clause enforceable as an illegal penalty under Kenyan contract law [p. 2]?",
                        "why_it_matters": "High Court precedent distinguishes penalties from genuine pre-estimates of damages."
                    },
                    {
                        "question": "How can we amend Clause 7.1 to seat arbitration in Nairobi at the NCIA rather than London, UK [p. 3]?",
                        "why_it_matters": "London arbitration creates disproportionate costs that make dispute resolution inaccessible for a Kenyan SME."
                    },
                    {
                        "question": "Does the 5-year East Africa non-compete constitute an unreasonable restraint of trade under Cap 23 [p. 2]?",
                        "why_it_matters": "An unreasonable restraint can paralyze your business from operating in your core industry."
                    },
                    {
                        "question": "Should we insert a mutual indemnity to balance the unilateral indemnity in Clause 6.1 [p. 2]?",
                        "why_it_matters": "Current draft requires only the SME to indemnify the counterparty on a full indemnity basis."
                    },
                    {
                        "question": "Can we cap the perpetual confidentiality obligations to 2 years following discussion termination [p. 2]?",
                        "why_it_matters": "Indefinite confidentiality exposes the company to endless discovery and compliance liability."
                    }
                ]
            })
            return text, 110, 280
        else:
            text = json.dumps({
                "parties": [
                    "Nairobi Digital Innovations Limited (Disclosing Party)",
                    "Baraka Logistics & Freight Kenya SME (Recipient / SME Partner)"
                ],
                "term": "Commences 15th October 2024; perpetual confidentiality survivor clause [p. 2]",
                "obligations": [
                    "Exercise strict liability standard of care over all disclosed technical and financial records [p. 1]",
                    "Not disclose or reverse-engineer data for unauthorized commercial purposes [p. 1]",
                    "Pay KES 10,000,000 immediately upon any alleged breach without proof of loss [p. 2]"
                ],
                "risks": [
                    "Unilateral indemnification covering attorney fees on full indemnity basis [p. 2]",
                    "5-year non-compete across the entire East African Community [p. 2]",
                    "Foreign dispute resolution seated in London, UK with all costs fronted by SME [p. 3]"
                ],
                "plain_summary": "This document is a mutual non-disclosure agreement for exploring telemetry supply chain distribution in East Africa. However, it contains aggressive, one-sided provisions including a 5-year non-compete restraint, a KES 10M automatic penalty, and expensive London arbitration that heavily disfavor the Kenyan SME partner."
            })
            return text, 150, 320

    client = get_client()
    sys = system_prompt or get_system_prompt()
    
    response = await client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        system=sys,
        messages=[{"role": "user", "content": prompt}],
    )

    tokens_in = response.usage.input_tokens
    tokens_out = response.usage.output_tokens
    text_content = ""
    for block in response.content:
        if getattr(block, "type", "") == "text":
            text_content += block.text

    return text_content, tokens_in, tokens_out

async def stream_chat_completion(
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 3000,
    temperature: float = 0.2
) -> AsyncGenerator[str, None]:
    """Stream Claude messages text deltas using the official Anthropic async stream."""
    if not settings.ANTHROPIC_API_KEY or settings.ANTHROPIC_API_KEY.startswith("mock") or settings.ANTHROPIC_API_KEY.startswith("sk-ant-api03-your"):
        import asyncio
        mock_response = (
            "Counsel AI legal analysis [p. 2]:\n\n"
            "Under Kenyan contract law (Law of Contract Act, Cap 23), Clause 6.2 imposes an aggressive liquidated damages penalty of KES 10,000,000 without requiring the disclosing party to demonstrate actual commercial injury.\n\n"
            "Key considerations for your SME:\n"
            "1. Enforceability: Kenyan courts distinguish between genuine pre-estimates of damage and unlawful penalties designed to terrorize the contracting party.\n"
            "2. Cross-Border Risk [p. 3]: Combined with the London arbitration clause (Clause 7.1), defending any alleged breach would require international legal fees.\n\n"
            "Actionable Advice: Do not execute this agreement in its current draft. Propose amending Clause 6.2 to limit liability strictly to actual proven direct losses, capped at the value of the partnership project."
        )
        words = mock_response.split(" ")
        for i, word in enumerate(words):
            await asyncio.sleep(0.03)
            yield word + (" " if i < len(words) - 1 else "")
        return

    client = get_client()
    sys = system_prompt or get_system_prompt()

    async with client.messages.stream(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        system=sys,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text_delta in stream.text_stream:
            yield text_delta
