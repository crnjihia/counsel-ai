import json
from typing import AsyncGenerator, Any, Dict
from sse_starlette.sse import EventSourceResponse, ServerSentEvent

def format_sse_event(event_type: str, data: Dict[str, Any]) -> ServerSentEvent:
    """Format SSE event using sse-starlette ServerSentEvent."""
    return ServerSentEvent(
        event=event_type,
        data=json.dumps(data)
    )

def create_event_source_response(generator: AsyncGenerator[ServerSentEvent, None]) -> EventSourceResponse:
    """Wrap async generator into an EventSourceResponse."""
    return EventSourceResponse(generator)
