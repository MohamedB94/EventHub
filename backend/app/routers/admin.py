from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

class RefusBody(BaseModel):
    message: str

from app.core.security import decode_access_token
from app.database import get_db
from app.models.bruteforce import BruteForce
from app.models.event import Evenement
from app.models.refresh_token import RefreshToken
from app.models.user import Utilisateur

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> Utilisateur:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifie")

    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token invalide")

    user = (
        db.query(Utilisateur)
        .filter(Utilisateur.id_utilisateur == int(payload["sub"]))
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    role = str(user.role or "").strip().lower()
    if role not in ["admin", "administrateur"]:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")

    return user


@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    _admin: Utilisateur = Depends(get_current_admin),
):
    total_users = db.query(Utilisateur).count()
    total_events = db.query(Evenement).count()
    total_bruteforce = db.query(BruteForce).count()
    total_refresh_tokens = db.query(RefreshToken).count()

    active_users = db.query(Utilisateur).filter(Utilisateur.statut == True).count()
    active_events = db.query(Evenement).filter(Evenement.statut == True).count()
    blocked_accounts = (
        db.query(BruteForce).filter(BruteForce.blocked_until.isnot(None)).count()
    )
    active_refresh_tokens = (
        db.query(RefreshToken).filter(RefreshToken.revoked == False).count()
    )

    recent_users = (
        db.query(Utilisateur)
        .order_by(Utilisateur.id_utilisateur.desc())
        .limit(8)
        .all()
    )
    recent_events = (
        db.query(Evenement)
        .order_by(Evenement.date_creation.desc())
        .limit(8)
        .all()
    )
    recent_bruteforce = (
        db.query(BruteForce)
        .order_by(BruteForce.updated_at.desc())
        .limit(8)
        .all()
    )
    recent_refresh_tokens = (
        db.query(RefreshToken)
        .order_by(RefreshToken.created_at.desc())
        .limit(8)
        .all()
    )

    return {
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "total_events": total_events,
            "active_events": active_events,
            "total_bruteforce": total_bruteforce,
            "blocked_accounts": blocked_accounts,
            "total_refresh_tokens": total_refresh_tokens,
            "active_refresh_tokens": active_refresh_tokens,
            "total_billets": 0,
            "total_reservations": 0,
        },
        "users": [
            {
                "id_utilisateur": u.id_utilisateur,
                "nom": u.nom,
                "prenom": u.prenom,
                "email": u.email,
                "role": u.role,
                "statut": bool(u.statut),
                "date_inscription": u.date_inscription,
            }
            for u in recent_users
        ],
        "events": [
            {
                "id_evenement": e.id_evenement,
                "titre": e.titre,
                "lieu": e.lieu,
                "date_debut": e.date_debut,
                "date_fin": e.date_fin,
                "capacite_max": e.capacite_max,
                "statut": bool(e.statut),
                "id_utilisateur": e.id_utilisateur,
                "date_creation": e.date_creation,
            }
            for e in recent_events
        ],
        "bruteforce": [
            {
                "id": b.id,
                "email": b.email,
                "ip_address": b.ip_address,
                "failed_attempts": b.failed_attempts,
                "blocked_until": b.blocked_until,
                "last_attempt_at": b.last_attempt_at,
            }
            for b in recent_bruteforce
        ],
        "refresh_tokens": [
            {
                "id": t.id,
                "id_utilisateur": t.id_utilisateur,
                "expire_at": t.expire_at,
                "revoked": bool(t.revoked),
                "created_at": t.created_at,
            }
            for t in recent_refresh_tokens
        ],
        "notes": {
            "billet": "Table Billet non branchee dans cette version.",
            "reserver": "Table Reserver non branchee dans cette version.",
        },
    }


@router.get("/organisateurs/en-attente")
def organisateurs_en_attente(
    db: Session = Depends(get_db),
    _admin: Utilisateur = Depends(get_current_admin),
):
    pending = (
        db.query(Utilisateur)
        .filter(Utilisateur.role == "organisateur", Utilisateur.statut_validation == "en_attente")
        .order_by(Utilisateur.id_utilisateur.desc())
        .all()
    )
    return [
        {
            "id_utilisateur": u.id_utilisateur,
            "nom": u.nom,
            "prenom": u.prenom,
            "email": u.email,
            "date_inscription": u.date_inscription,
        }
        for u in pending
    ]


@router.post("/organisateurs/{user_id}/approuver")
def approuver_organisateur(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: Utilisateur = Depends(get_current_admin),
):
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.statut_validation = "approuve"
    user.message_refus = None
    db.commit()
    return {"message": f"{user.prenom} {user.nom} approuvé."}


@router.post("/organisateurs/{user_id}/refuser")
def refuser_organisateur(
    user_id: int,
    body: RefusBody,
    db: Session = Depends(get_db),
    _admin: Utilisateur = Depends(get_current_admin),
):
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.statut_validation = "refuse"
    user.message_refus = body.message
    db.commit()
    return {"message": f"{user.prenom} {user.nom} refusé."}


@router.delete("/cleanup-tokens")
def cleanup_tokens(
    db: Session = Depends(get_db),
    _admin: Utilisateur = Depends(get_current_admin),
):
    deleted = (
        db.query(RefreshToken)
        .filter(
            (RefreshToken.revoked == True) |
            (RefreshToken.expire_at < datetime.utcnow())
        )
        .delete()
    )
    db.commit()
    return {"deleted": deleted, "message": f"{deleted} token(s) supprimé(s)."}
