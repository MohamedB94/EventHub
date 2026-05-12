from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from app.database import get_db
from app.models.user import Utilisateur
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserRegister, UserLogin, UserResponse
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)

router = APIRouter(prefix="/auth", tags=["Authentification"])

REFRESH_TOKEN_EXPIRE_DAYS = 7

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,       # True en production
        samesite="lax",
        max_age=30 * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,       # True en production
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

def save_refresh_token(db: Session, user_id: int, token: str):
    # Révoquer tous les anciens refresh tokens de l'utilisateur
    db.query(RefreshToken).filter(
        RefreshToken.id_utilisateur == user_id,
        RefreshToken.revoked == False
    ).update({"revoked": True})

    # Sauvegarder le nouveau
    new_token = RefreshToken(
        token=token,
        id_utilisateur=user_id,
        expire_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False
    )
    db.add(new_token)
    db.commit()

@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, response: Response, db: Session = Depends(get_db)):
    existing = db.query(Utilisateur).filter(Utilisateur.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

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
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    save_refresh_token(db, user.id_utilisateur, refresh_token)
    set_auth_cookies(response, access_token, refresh_token)
    return user

@router.post("/login", response_model=UserResponse)
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.email == data.email).first()
    if not user or not verify_password(data.mot_de_passe, user.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not user.statut:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    token_data = {"sub": str(user.id_utilisateur), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    save_refresh_token(db, user.id_utilisateur, refresh_token)
    set_auth_cookies(response, access_token, refresh_token)
    return user

@router.post("/refresh", response_model=UserResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token manquant")

    # Vérifier en base
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.revoked == False
    ).first()

    if not db_token:
        raise HTTPException(status_code=401, detail="Refresh token invalide ou révoqué")

    if db_token.expire_at < datetime.utcnow():
        db_token.revoked = True
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expiré")

    # Vérifier la signature JWT aussi
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token invalide")

    user = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == db_token.id_utilisateur
    ).first()
    if not user or not user.statut:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable ou inactif")

    # Rotation du refresh token
    token_data = {"sub": str(user.id_utilisateur), "role": user.role}
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    # Révoquer l'ancien et sauvegarder le nouveau
    db_token.revoked = True
    db.commit()
    save_refresh_token(db, user.id_utilisateur, new_refresh)
    set_auth_cookies(response, new_access, new_refresh)
    return user

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        db.query(RefreshToken).filter(
            RefreshToken.token == token
        ).update({"revoked": True})
        db.commit()

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Déconnecté avec succès"}

@router.get("/me", response_model=UserResponse)
def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token invalide")

    user = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == int(payload["sub"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user