from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.billet import Billet
from app.models.reserver import Reserver
from app.models.user import Utilisateur
from app.schemas.reserver import ReserverCreate, ReserverResponse
from app.core.security import decode_access_token

router = APIRouter(prefix="/reservations", tags=["Reservations"])


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


@router.get("/mine", response_model=list[ReserverResponse])
def mes_reservations(
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    return db.query(Reserver).filter(Reserver.id_utilisateur == user.id_utilisateur).all()


@router.post("/", response_model=ReserverResponse, status_code=201)
def reserver_billet(
    data: ReserverCreate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    billet = db.query(Billet).filter(Billet.id_billet == data.id_billet).first()
    if not billet:
        raise HTTPException(status_code=404, detail="Billet introuvable")
    if billet.quantite_disponible <= 0:
        raise HTTPException(status_code=400, detail="Plus de billets disponibles")

    existing = db.query(Reserver).filter(
        Reserver.id_utilisateur == user.id_utilisateur,
        Reserver.id_billet == data.id_billet,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez deja reserve ce billet")

    reservation = Reserver(
        id_utilisateur=user.id_utilisateur,
        id_billet=data.id_billet,
        date_reservation=date.today(),
        mode_paiement=data.mode_paiement,
    )
    billet.quantite_disponible -= 1
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


@router.delete("/{billet_id}", status_code=204)
def annuler_reservation(
    billet_id: int,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    reservation = db.query(Reserver).filter(
        Reserver.id_utilisateur == user.id_utilisateur,
        Reserver.id_billet == billet_id,
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation introuvable")
    billet = db.query(Billet).filter(Billet.id_billet == billet_id).first()
    if billet:
        billet.quantite_disponible += 1
    db.delete(reservation)
    db.commit()
