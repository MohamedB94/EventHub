from sqlalchemy import Column, Integer, String, Boolean, Date, Text
from app.database import Base

class Utilisateur(Base):
    __tablename__ = "utilisateur"

    id_utilisateur = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom = Column(String(50), nullable=False)
    prenom = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    mot_de_passe = Column(String(255), nullable=False)
    role = Column(Text, nullable=False, default="participant")
    date_inscription = Column(Date, nullable=False)
    statut = Column(Boolean, default=True)
    