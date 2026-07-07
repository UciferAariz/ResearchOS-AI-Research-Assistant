from pydantic import BaseModel


class VectorMatch(BaseModel):
    id: str
    document: str
    metadata: dict[str, str]
    distance: float
    similarity: float
