from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routes import health, player, shop

settings = get_settings()

app = FastAPI(title="Buen Café, Gran Café API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(player.router, prefix="/api")
app.include_router(shop.router, prefix="/api")
