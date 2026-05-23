from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class EventCreate(BaseModel):
    titre: str
    description: str | None = None
    date_debut: datetime
    date_fin: datetime
    lieu: str
    capacite_max: int
    prix: Decimal = Decimal("0")
    statut: bool

class EventUpdate(BaseModel):
    titre: str | None = None
    description: str | None = None
    date_debut: datetime | None = None
    date_fin: datetime | None = None
    lieu: str | None = None
    capacite_max: int | None = None
    prix: Decimal | None = None
    statut: bool | None = None

class EventResponse(BaseModel):
    id_evenement: int
    titre: str
    description: str | None
    date_debut: datetime
    date_fin: datetime
    lieu: str
    capacite_max: int
    prix: Decimal = Decimal("0")
    statut: bool
    date_creation: datetime

    class Config:
        orm_mode = True