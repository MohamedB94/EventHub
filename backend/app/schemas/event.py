from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EventCreate(BaseModel):
    titre: str
    description: Optional[str] = None
    date_debut: datetime
    date_fin: datetime
    lieu: str
    capacite_max: int
    categorie: Optional[str] = None
    statut: bool


class EventUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    lieu: Optional[str] = None
    capacite_max: Optional[int] = None
    categorie: Optional[str] = None
    statut: Optional[bool] = None


class EventResponse(BaseModel):
    id_evenement: int
    titre: str
    description: Optional[str]
    date_debut: datetime
    date_fin: datetime
    lieu: str
    capacite_max: int
    categorie: Optional[str]
    statut: bool
    date_creation: datetime

    class Config:
        orm_mode = True
