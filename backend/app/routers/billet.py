from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.billet import Billet
from app.models.event import Evenement
from app.models.user import Utilisateur
from app.schemas.billet import BilletCreate, BilletUpdate, BilletResponse
from app.core.security import decode_access_token

router = APIRouter(prefix="/billets", tags=["Billets"])


def get_current_user(request: Request, db: Session = Depends(get_db)) -> Utilisateur:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifie")
    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token invalide")
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


@router.get("/event/{event_id}", response_model=list[BilletResponse])
def get_billets_event(event_id: int, db: Session = Depends(get_db)):
    return db.query(Billet).filter(Billet.id_evenement == event_id).all()


@router.post("/", response_model=BilletResponse, status_code=201)
def create_billet(
    data: BilletCreate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    if user.role != "organisateur":
        raise HTTPException(status_code=403, detail="Acces reserve aux organisateurs")
    event = db.query(Evenement).filter(
        Evenement.id_evenement == data.id_evenement,
        Evenement.id_utilisateur == user.id_utilisateur,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evenement introuvable")
    billet = Billet(**data.model_dump())
    db.add(billet)
    db.commit()
    db.refresh(billet)
    return billet


@router.put("/{billet_id}", response_model=BilletResponse)
def update_billet(
    billet_id: int,
    data: BilletUpdate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    billet = db.query(Billet).filter(Billet.id_billet == billet_id).first()
    if not billet:
        raise HTTPException(status_code=404, detail="Billet introuvable")
    event = db.query(Evenement).filter(
        Evenement.id_evenement == billet.id_evenement,
        Evenement.id_utilisateur == user.id_utilisateur,
    ).first()
    if not event:
        raise HTTPException(status_code=403, detail="Acces interdit")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(billet, field, value)
    db.commit()
    db.refresh(billet)
    return billet


@router.delete("/{billet_id}", status_code=204)
def delete_billet(
    billet_id: int,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    billet = db.query(Billet).filter(Billet.id_billet == billet_id).first()
    if not billet:
        raise HTTPException(status_code=404, detail="Billet introuvable")
    event = db.query(Evenement).filter(
        Evenement.id_evenement == billet.id_evenement,
        Evenement.id_utilisateur == user.id_utilisateur,
    ).first()
    if not event:
        raise HTTPException(status_code=403, detail="Acces interdit")
    db.delete(billet)
    db.commit()
