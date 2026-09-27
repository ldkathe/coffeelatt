import jwt
from fastapi import Header, HTTPException, status

from app.core.config import get_settings


class CurrentUser:
    def __init__(self, user_id: str, email: str | None):
        self.user_id = user_id
        self.email = email


def get_current_user(authorization: str = Header(default="")) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token de autenticación")

    token = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o expirado") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sin identificador de usuario")

    return CurrentUser(user_id=user_id, email=payload.get("email"))
