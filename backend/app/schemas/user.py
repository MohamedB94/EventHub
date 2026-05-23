from pydantic import BaseModel, EmailStr, field_validator
from datetime import date
from typing import Optional
import re

class InscriptionUser(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    mot_de_passe: str
    role: Optional[str] = "participant"

    @field_validator("nom", "prenom")
    @classmethod
    def not_empty(cls, v):
        if not v.strip():
            raise ValueError("Le champ ne peut pas être vide")
        if len(v) < 2:
            raise ValueError("Le champ doit contenir au moins 2 caractères")
        return v
    
    @field_validator("mot_de_passe")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Le mot de passe doit contenir au moins une lettre majuscule")
        if not re.search(r"[0-9]", v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        if not re.search(r"[^a-zA-Z0-9]", v):
            raise ValueError("Le mot de passe doit contenir au moins un caractère spécial")
        return v
    
    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v not in ["participant", "organisateur"]:
            raise ValueError("Le rôle doit être soit 'participant' soit 'organisateur'")
        return v
    
class ConnexionUser(BaseModel):
    email: EmailStr
    mot_de_passe: str

class ReponseUser(BaseModel):
    id_utilisateur: int
    nom: str
    prenom: str
    email: str
    role: str
    statut: bool

    class Config:
        from_attributes = True

class ReponseAuth(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ReponseUser