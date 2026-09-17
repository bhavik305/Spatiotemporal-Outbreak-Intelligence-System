from pydantic import BaseModel
from typing import List, Optional, Any

class HealthResponse(BaseModel):
    status: str

class ResponseWrapper(BaseModel):
    status: str
    count: int
    data: List[Any]
