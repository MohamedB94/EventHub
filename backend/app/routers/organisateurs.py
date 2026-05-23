from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import Utilisateur
from app.models.event import Evenement

router = APIRouter(prefix="/organisateurs", tags=["Organisateurs"])


@router.get("")
def list_organisateurs(db: Session = Depends(get_db)):
    organisateurs = (
        db.query(Utilisateur)
        .filter(Utilisateur.role == "organisateur", Utilisateur.statut == True)
        .order_by(Utilisateur.date_inscription.desc())
        .all()
    )

    result = []
    for org in organisateurs:
        nb_events = (
            db.query(Evenement)
            .filter(Evenement.id_utilisateur == org.id_utilisateur)
            .count()
        )
        result.append({
            "id_utilisateur": org.id_utilisateur,
            "nom": org.nom,
            "prenom": org.prenom,
            "nb_evenements": nb_events,
            "date_inscription": org.date_inscription,
        })

    return result
