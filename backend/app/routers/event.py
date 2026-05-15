from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.event import Evenement
from app.schemas.event import EventCreate, EventResponse
from app.models.user import Utilisateur
from app.core.security import decode_access_token

router = APIRouter(prefix="/events", tags=["Evenements"])

def get_current_user(request: Request, db: Session = Depends(get_db)) -> Utilisateur:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifie")

    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token invalide")

    user = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == int(payload["sub"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


@router.get("/mine", response_model=list[EventResponse])
def list_my_events(
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    if user.role != "organisateur":
        raise HTTPException(status_code=403, detail="Acces reserve aux organisateurs")

    events = (
        db.query(Evenement)
        .filter(Evenement.id_utilisateur == user.id_utilisateur)
        .order_by(Evenement.date_debut.desc())
        .all()
    )
    return events


@router.post("/create", response_model=EventResponse, status_code=201)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    if user.role != "organisateur":
        raise HTTPException(status_code=403, detail="Acces reserve aux organisateurs")

    new_event = Evenement(
        titre=event.titre,
        description=event.description,
        date_debut=event.date_debut,
        date_fin=event.date_fin,
        lieu=event.lieu,
        capacite_max=event.capacite_max,
        statut=event.statut,
        date_creation=datetime.utcnow(),
        id_utilisateur=user.id_utilisateur
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return new_event