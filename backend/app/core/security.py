import jwt
from fastapi import Header, HTTPException, status

from app.core.config import get_settings

_jwks_clients: dict[str, jwt.PyJWKClient] = {}


class CurrentUser:
    def __init__(self, user_id: str, email: str | None):
        self.user_id = user_id
        self.email = email


def _get_jwks_client() -> jwt.PyJWKClient:
    jwks_url = get_settings().supabase_jwks_url
    client = _jwks_clients.get(jwks_url)
    if client is None:
        client = jwt.PyJWKClient(jwks_url)
        _jwks_clients[jwks_url] = client
    return client


def get_current_user(authorization: str = Header(default="")) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token de autenticación")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o expirado") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sin identificador de usuario")

    return CurrentUser(user_id=user_id, email=payload.get("email"))
