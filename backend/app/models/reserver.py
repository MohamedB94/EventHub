from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Reserver(Base):
    __tablename__ = "reserver"

    id_utilisateur = Column(Integer, ForeignKey("utilisateur.id_utilisateur"), primary_key=True)
    id_billet = Column(Integer, ForeignKey("billet.id_billet"), primary_key=True)
    date_reservation = Column(Date, nullable=True)
    data_paiement = Column(Date, nullable=True)
    mode_paiement = Column(String(50), nullable=True)

    utilisateur = relationship("Utilisateur", backref="reservations")
