from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from app.database import get_db
from app.models.bruteforce import BruteForce
from app.models.user import Utilisateur
from app.models.refresh_token import RefreshToken
from app.schemas.user import InscriptionUser as UserRegister, ConnexionUser as UserLogin, ReponseUser as UserResponse
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)

router = APIRouter(prefix="/auth", tags=["Authentification"])

REFRESH_TOKEN_EXPIRE_DAYS = 7
MAX_FAILED_LOGIN_ATTEMPTS = 3
LOGIN_BLOCK_SECONDS = 60
ATTEMPT_WINDOW_MINUTES = 10


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _login_key(email: str, request: Request) -> str:
    return f"{email.strip().lower()}::{_get_client_ip(request)}"


def _split_login_key(key: str) -> tuple[str, str]:
    return key.split("::", 1)


def _get_bruteforce_entry(db: Session, key: str) -> BruteForce | None:
    email, ip_address = _split_login_key(key)
    return db.query(BruteForce).filter(
        BruteForce.email == email,
        BruteForce.ip_address == ip_address,
    ).first()


def _seconds_left(until: datetime) -> int:
    seconds = int((until - datetime.utcnow()).total_seconds())
    return seconds if seconds > 0 else 1


def _clear_login_attempts(db: Session, key: str):
    entry = _get_bruteforce_entry(db, key)
    if not entry:
        return

    db.delete(entry)
    db.commit()


def _apply_sliding_window(entry: BruteForce, now: datetime):
    if not entry.last_attempt_at:
        return

    if now - entry.last_attempt_at > timedelta(minutes=ATTEMPT_WINDOW_MINUTES):
        entry.failed_attempts = 0
        entry.blocked_until = None


def _register_failed_login(db: Session, key: str):
    now = datetime.utcnow()
    email, ip_address = _split_login_key(key)
    entry = _get_bruteforce_entry(db, key)

    if not entry:
        entry = BruteForce(
            email=email,
            ip_address=ip_address,
            failed_attempts=0,
        )
        db.add(entry)

    _apply_sliding_window(entry, now)

    entry.failed_attempts += 1
    entry.last_attempt_at = now

    attempt_count = entry.failed_attempts
    blocked_until = None
    if attempt_count >= MAX_FAILED_LOGIN_ATTEMPTS:
        blocked_until = now + timedelta(seconds=LOGIN_BLOCK_SECONDS)
        entry.blocked_until = blocked_until

    db.commit()
    return blocked_until, attempt_count


def _check_login_blocked(db: Session, key: str):
    now = datetime.utcnow()
    entry = _get_bruteforce_entry(db, key)
    if not entry:
        return None

    _apply_sliding_window(entry, now)

    if not entry.blocked_until:
        db.commit()
        return None

    if now >= entry.blocked_until:
        entry.blocked_until = None
        db.commit()
        return None

    return entry.blocked_until

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
def login(data: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    key = _login_key(data.email, request)
    blocked_until = _check_login_blocked(db, key)
    if blocked_until:
        retry_after = _seconds_left(blocked_until)
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Compte temporairement verrouillé.",
                "retry_after": retry_after,
                "locked_until": blocked_until.isoformat(),
            },
            headers={"Retry-After": str(retry_after)},
        )

    user = db.query(Utilisateur).filter(Utilisateur.email == data.email).first()
    if not user or not verify_password(data.mot_de_passe, user.mot_de_passe):
        blocked_until, attempt_count = _register_failed_login(db, key)
        attempts_left = MAX_FAILED_LOGIN_ATTEMPTS - attempt_count
        if attempts_left < 0:
            attempts_left = 0

        if blocked_until:
            retry_after = _seconds_left(blocked_until)
            raise HTTPException(
                status_code=423,
                detail={
                    "message": "Trop de tentatives. Compte bloque pendant 60 secondes.",
                    "attempts_left": 0,
                    "retry_after": retry_after,
                    "locked_until": blocked_until.isoformat(),
                },
                headers={"Retry-After": str(retry_after)},
            )

        raise HTTPException(
            status_code=401,
            detail={
                "message": "Email ou mot de passe incorrect",
                "attempts_left": attempts_left,
            },
        )

    if not user.statut:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    _clear_login_attempts(db, key)

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