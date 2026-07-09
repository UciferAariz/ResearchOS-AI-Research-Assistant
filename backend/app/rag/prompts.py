from app.models.chat import ChatTurn
from app.models.llm import ChatMessage
from app.models.vector import VectorMatch

_GROUNDING_RULE = (
    "You are a research assistant that discusses academic papers with the user. "
    "If the user's message is a greeting, small talk, or a question about your "
    "own capabilities rather than paper content, respond naturally and briefly "
    "like a normal assistant — do not mention sources or citations for these. "
    "For any question about paper content, findings, or claims, answer only "
    "using the numbered sources below: every factual claim must be followed by "
    "a citation marker like [1] or [2] referencing the source it came from. If "
    "the sources don't contain enough information to answer such a question, "
    "say so explicitly rather than guessing or using outside knowledge. Never "
    "fabricate a citation number that isn't listed below."
)


def _format_sources(matches: list[VectorMatch]) -> str:
    entries = []
    for i, match in enumerate(matches, start=1):
        title = match.metadata.get("title", "Unknown title")
        paper_id = match.metadata.get("paper_id", match.id)
        entries.append(f"[{i}] {title} (paper_id: {paper_id})\n{match.document}")
    return "\n\n".join(entries)


def build_rag_messages(
    query: str, history: list[ChatTurn], matches: list[VectorMatch]
) -> list[ChatMessage]:
    system_content = _GROUNDING_RULE
    if matches:
        system_content += "\n\nSources:\n" + _format_sources(matches)
    else:
        system_content += (
            "\n\nNo sources were retrieved for this query. If the user asked "
            "about paper content, tell them you couldn't find relevant papers "
            "for it; if it's a greeting or general chitchat, just respond "
            "normally."
        )

    messages = [ChatMessage(role="system", content=system_content)]
    messages.extend(ChatMessage(role=turn.role, content=turn.content) for turn in history)
    messages.append(ChatMessage(role="user", content=query))
    return messages
