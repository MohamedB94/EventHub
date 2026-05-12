from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.user import Utilisateur
from app.schemas.user import InscriptionUser, ConnexionUser, ReponseToken
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentification"])

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/inscription", response_model=ReponseToken, status_code=201)
def inscription(data: InscriptionUser, db: Session = Depends(get_db)):
    # Vérifier si l'email existe deja
    existe = db.query(Utilisateur).filter(Utilisateur.email == data.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user = Utilisateur(
    nom=data.nom,
    prenom=data.prenom,
    email=data.email,
    mot_de_passe=hash_password(data.mot_de_passe),
    role=data.role,
    date_inscription=date.today(),
    statut=True
)
    db.add(user)
    db.commit()
    db.refresh(user)

    token_data = {"sub": str(user.id_utilisateur), "role": user.role}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user": user
    }

@router.post("/connexion", response_model=ReponseToken)
def connexion(data: ConnexionUser, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.email == data.email).first()
    if not user or not verify_password(data.mot_de_passe, user.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not user.statut:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    
    token_data = {"sub": str(user.id_utilisateur), "role": user.role}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=ReponseToken)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="refresh token invalide")
    
    user = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == int(payload["sub"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur Introuvable")
    
    token_data = {"sub": str(user.id_utilisateur), "role": user.role}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user": user
    }

