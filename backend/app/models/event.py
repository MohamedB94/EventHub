from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Evenement(Base):
    __tablename__ = "evenements"

    id_evenement = Column(Integer, primary_key=True, autoincrement=True)
    titre = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    date_debut = Column(DateTime, nullable=False)
    date_fin = Column(DateTime, nullable=False)
    lieu = Column(String(50), nullable=False)
    capacite_max = Column(Integer, nullable=False)
    statut = Column(Boolean, default=False)
    date_creation = Column(DateTime, default=datetime.utcnow)
    id_utilisateur = Column(Integer, ForeignKey("utilisateur.id_utilisateur"), nullable=False)

    utilisateur = relationship("Utilisateur", backref="evenements")