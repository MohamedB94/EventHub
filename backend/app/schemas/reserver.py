from pydantic import BaseModel
from datetime import date
from typing import Optional


class ReserverCreate(BaseModel):
    id_billet: int
    mode_paiement: str


class ReserverResponse(BaseModel):
    id_utilisateur: int
    id_billet: int
    date_reservation: Optional[date]
    data_paiement: Optional[date]
    mode_paiement: Optional[str]

    class Config:
        orm_mode = True
