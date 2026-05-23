from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class BilletCreate(BaseModel):
    type: str
    prix: Decimal
    quantite_disponible: int
    dat_limite_vente: Optional[date] = None
    id_evenement: int


class BilletUpdate(BaseModel):
    type: Optional[str] = None
    prix: Optional[Decimal] = None
    quantite_disponible: Optional[int] = None
    dat_limite_vente: Optional[date] = None


class BilletResponse(BaseModel):
    id_billet: int
    type: str
    prix: Decimal
    quantite_disponible: int
    dat_limite_vente: Optional[date]
    id_evenement: int

    class Config:
        orm_mode = True
