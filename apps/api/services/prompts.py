from jinja2 import Environment, FileSystemLoader, select_autoescape
import pathlib

PROMPTS_DIR = pathlib.Path(__file__).resolve().parent.parent / "prompts"

env = Environment(
    loader=FileSystemLoader(str(PROMPTS_DIR)),
    autoescape=select_autoescape([]),
    trim_blocks=True,
    lstrip_blocks=True,
)

def get_system_prompt() -> str:
    path = PROMPTS_DIR / "system.md"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return "You are Mshauri, a legal assistant for Kenyan SMEs. You are not a lawyer."

def render_summary(document_text: str) -> str:
    template = env.get_template("summary.jinja2")
    return template.render(document=document_text)

def render_red_flags(document_text: str) -> str:
    template = env.get_template("red_flags.jinja2")
    return template.render(document=document_text)

def render_questions(document_text: str) -> str:
    template = env.get_template("questions.jinja2")
    return template.render(document=document_text)

def render_chat(document_excerpt: str, history: str, user_message: str) -> str:
    template = env.get_template("chat.jinja2")
    return template.render(
        document_excerpt=document_excerpt,
        history=history,
        user_message=user_message,
    )
