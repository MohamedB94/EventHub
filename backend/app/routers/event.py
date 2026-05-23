from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.event import Evenement
from app.schemas.event import EventCreate, EventUpdate, EventResponse
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


@router.get("/public", response_model=list[EventResponse])
def list_public_events(db: Session = Depends(get_db)):
    return (
        db.query(Evenement)
        .filter(Evenement.statut == True)
        .order_by(Evenement.date_debut.asc())
        .all()
    )


@router.get("/public/{event_id}")
def get_public_event(event_id: int, db: Session = Depends(get_db)):
    from app.models.billet import Billet
    event = db.query(Evenement).filter(
        Evenement.id_evenement == event_id,
        Evenement.statut == True,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evenement introuvable")
    billets = db.query(Billet).filter(Billet.id_evenement == event_id).all()
    return {
        "id_evenement": event.id_evenement,
        "titre": event.titre,
        "description": event.description,
        "date_debut": event.date_debut,
        "date_fin": event.date_fin,
        "lieu": event.lieu,
        "capacite_max": event.capacite_max,
        "categorie": event.categorie,
        "statut": event.statut,
        "date_creation": event.date_creation,
        "billets": [
            {
                "id_billet": b.id_billet,
                "type": b.type,
                "prix": float(b.prix),
                "quantite_disponible": b.quantite_disponible,
                "dat_limite_vente": b.dat_limite_vente,
            }
            for b in billets
        ],
    }


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
        categorie=event.categorie,
        statut=event.statut,
        date_creation=datetime.utcnow(),
        id_utilisateur=user.id_utilisateur
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return new_event


@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    data: EventUpdate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    event = db.query(Evenement).filter(
        Evenement.id_evenement == event_id,
        Evenement.id_utilisateur == user.id_utilisateur,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evenement introuvable")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    event = db.query(Evenement).filter(
        Evenement.id_evenement == event_id,
        Evenement.id_utilisateur == user.id_utilisateur,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evenement introuvable")

    db.delete(event)
    db.commit()