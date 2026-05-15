from pydantic import BaseModel
from datetime import datetime

class EventCreate(BaseModel):
    titre: str
    description: str | None = None
    date_debut: datetime
    date_fin: datetime
    lieu: str
    capacite_max: int
    statut: bool

class EventResponse(BaseModel):
    id_evenement: int
    titre: str
    description: str | None
    date_debut: datetime
    date_fin: datetime
    lieu: str
    capacite_max: int
    statut: bool
    date_creation: datetime

    class Config:
        orm_mode = True