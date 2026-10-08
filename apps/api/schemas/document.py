from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime

class DocumentCreate(BaseModel):
    filename: str

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    page_count: int
    preview: str
    created_at: Optional[datetime] = None

class DocumentSummary(BaseModel):
    parties: List[str] = Field(default_factory=list, description="Parties involved in the document")
    term: str = Field(default="Not specified", description="Duration or term of the agreement")
    obligations: List[str] = Field(default_factory=list, description="Key obligations for the SME")
    risks: List[str] = Field(default_factory=list, description="Key risks identified")
    plain_summary: str = Field(default="", description="Plain-English explanation for SME owner")

class SummaryResponse(BaseModel):
    summary: DocumentSummary

class RedFlag(BaseModel):
    clause_text: str = Field(..., description="Quoted clause or excerpt")
    page: int = Field(..., description="Page number where clause appears")
    severity: Literal["low", "med", "medium", "high"] = Field(..., description="Risk severity")
    explanation: str = Field(..., description="Plain-English explanation of why it is dangerous")
    suggestion: str = Field(..., description="What the SME owner should negotiate or alter")

class RedFlagsResponse(BaseModel):
    red_flags: List[RedFlag]

class QuestionItem(BaseModel):
    question: str = Field(..., description="Question to ask a Kenyan advocate")
    why_it_matters: Optional[str] = Field(default=None, description="Context on why this is crucial for the SME")

class QuestionsResponse(BaseModel):
    questions: List[QuestionItem]
