from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth

# Importer les modèles pour que SQLAlchemy crée les tables
from app.models import user, refresh_token  # ← ajouter refresh_token

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EventHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)