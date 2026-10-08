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
