from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth
from app.routers import event as event_router
from app.routers import admin as admin_router
from app.routers import organisateurs as organisateurs_router
from app.routers import billet as billet_router
from app.routers import reserver as reserver_router

from app.models import user, refresh_token, bruteforce, event, billet, reserver  # noqa: F401

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
app.include_router(event_router.router)
app.include_router(admin_router.router)
app.include_router(organisateurs_router.router)
app.include_router(billet_router.router)
app.include_router(reserver_router.router)
