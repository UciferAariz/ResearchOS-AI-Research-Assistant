from datetime import datetime

from pydantic import BaseModel


class PaperSummary(BaseModel):
    paper_id: str
    key_contributions: list[str]
    methodology: str
    limitations: list[str]
    future_work: list[str]
    generated_at: datetime
