from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Billet(Base):
    __tablename__ = "billet"

    id_billet = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(50), nullable=False)
    prix = Column(Numeric(15, 2), nullable=False)
    quantite_disponible = Column(Integer, nullable=False)
    dat_limite_vente = Column(Date, nullable=True)
    id_evenement = Column(Integer, ForeignKey("evenements.id_evenement"), nullable=False)

    evenement = relationship("Evenement", backref="billets")
    reservations = relationship("Reserver", backref="billet", cascade="all, delete-orphan")
