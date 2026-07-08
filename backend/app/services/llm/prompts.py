from app.models.llm import ChatMessage
from app.models.paper import Paper

_GROUNDING_RULE = (
    "Only state what is explicitly present in the title and abstract below. "
    "Never invent details, infer unstated methodology, or use outside knowledge. "
    "If something isn't stated, say so explicitly rather than guessing."
)

_JSON_SYSTEM_PROMPT = (
    "You are a research paper summarization assistant. "
    + _GROUNDING_RULE
    + " Respond with a single JSON object with exactly these keys: "
    "key_contributions (array of strings), methodology (string), "
    "limitations (array of strings), future_work (array of strings). "
    "Where the abstract doesn't state something, use the string "
    "'Not specified in abstract' for that field."
)

_TEXT_SYSTEM_PROMPT = (
    "You are a research paper summarization assistant. "
    + _GROUNDING_RULE
    + " Produce a concise Markdown summary with exactly these four headings, "
    "in this order: '## Key Contributions', '## Methodology', '## Limitations', "
    "'## Future Work'. Where the abstract doesn't state something, write "
    "'Not specified in abstract' under that heading."
)


def build_summary_messages(paper: Paper, *, want_json: bool) -> list[ChatMessage]:
    system_prompt = _JSON_SYSTEM_PROMPT if want_json else _TEXT_SYSTEM_PROMPT
    user_content = f"Title: {paper.title}\n\nAbstract: {paper.abstract}"
    return [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_content),
    ]
