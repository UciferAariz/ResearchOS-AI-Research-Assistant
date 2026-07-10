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


_COMPARISON_GROUNDING_RULE = (
    "Only state what is explicitly present in the titles and abstracts below. "
    "Never invent details, infer unstated methodology, or use outside knowledge. "
    "If something isn't stated, say so explicitly rather than guessing."
)

_COMPARISON_JSON_SYSTEM_PROMPT = (
    "You are a research paper comparison assistant. "
    + _COMPARISON_GROUNDING_RULE
    + " Respond with a single JSON object with exactly these keys: "
    "dimensions (array of 4-6 objects, each an axis worth comparing these specific "
    "papers on — choose whichever dimensions are most informative for this particular "
    "set, e.g. approach, memory/compute cost, retention or performance, data "
    "requirements, ease of use, or best-fit use case; each object has keys 'label' "
    "(a short 1-4 word name for the dimension) and 'values' (array of strings, one "
    "per input paper, in the same order as given, describing that paper along this "
    "dimension in a single short phrase or sentence)), "
    "assistant_take (a 2-3 sentence recommendation on which paper suits which "
    "priority, grounded only in the dimensions above — do not introduce any claim "
    "that isn't already reflected in a dimension value)."
)

_COMPARISON_TEXT_SYSTEM_PROMPT = (
    "You are a research paper comparison assistant. "
    + _COMPARISON_GROUNDING_RULE
    + " Produce a concise Markdown comparison as a table with one row per dimension "
    "(choose 4-6 dimensions most informative for these specific papers) and one "
    "column per paper, followed by a short '## Assistant's take' recommendation."
)


def _format_papers_for_comparison(papers: list[Paper]) -> str:
    entries = [
        f"[{i}] paper_id: {paper.id}\nTitle: {paper.title}\nAbstract: {paper.abstract}"
        for i, paper in enumerate(papers, start=1)
    ]
    return "\n\n".join(entries)


def build_comparison_messages(papers: list[Paper], *, want_json: bool) -> list[ChatMessage]:
    system_prompt = _COMPARISON_JSON_SYSTEM_PROMPT if want_json else _COMPARISON_TEXT_SYSTEM_PROMPT
    user_content = _format_papers_for_comparison(papers)
    return [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_content),
    ]
