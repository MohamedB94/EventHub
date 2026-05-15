from datetime import datetime, timedelta
from jose import JWTError, jwt
from dotenv import load_dotenv
import bcrypt
import hashlib
import base64
import os
import secrets

load_dotenv()

ACCESS_SECRET_KEY = os.getenv("ACCESS_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

if not ACCESS_SECRET_KEY or not REFRESH_SECRET_KEY:
    raise RuntimeError(
        "ACCESS_SECRET_KEY et REFRESH_SECRET_KEY doivent être définis dans le fichier .env"
    )

def _prehash(password: str) -> bytes:
    # SHA-256 avant bcrypt pour éviter la limite de 72 octets
    return base64.b64encode(hashlib.sha256(password.encode()).digest())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prehash(password), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prehash(plain), hashed.encode())
    except ValueError:
        return False

def hash_token(token: str) -> str:
    """Retourne le SHA-256 hex d'un token (pour stockage en base)."""
    return hashlib.sha256(token.encode()).hexdigest()

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, ACCESS_SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    # On inclut uniquement sub dans le refresh token (moins d'info exposée)
    refresh_data = {"sub": to_encode["sub"], "exp": expire, "iat": now, "type": "refresh"}
    return jwt.encode(refresh_data, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, ACCESS_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

def decode_refresh_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None