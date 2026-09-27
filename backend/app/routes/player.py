from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import CurrentUser, get_current_user
from app.core.supabase_client import get_supabase

router = APIRouter(prefix="/player", tags=["player"])

DEFAULT_STATE = {
    "coins": 0,
    "click_power": 1,
    "passive_income": 0,
    "upgrades": {},
}


class PlayerState(BaseModel):
    coins: float = Field(ge=0)
    click_power: float = Field(ge=1)
    passive_income: float = Field(ge=0)
    upgrades: dict[str, int]


def _validate_upgrade_levels(upgrades: dict[str, int], catalog: dict[str, dict]) -> None:
    for upgrade_id, level in upgrades.items():
        if upgrade_id not in catalog:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Mejora desconocida: {upgrade_id}")
        if level < 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Nivel inválido para {upgrade_id}")


@router.get("/me")
def get_my_state(current_user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase()
    result = (
        supabase.table("players")
        .select("*")
        .eq("id", current_user.user_id)
        .maybe_single()
        .execute()
    )

    if result.data:
        return result.data

    new_row = {"id": current_user.user_id, "display_name": current_user.email, **DEFAULT_STATE}
    created = supabase.table("players").insert(new_row).execute()
    return created.data[0]


@router.put("/state")
def save_my_state(
    state: PlayerState,
    current_user: CurrentUser = Depends(get_current_user),
):
    supabase = get_supabase()

    catalog_rows = supabase.table("upgrades").select("id").execute().data or []
    catalog = {row["id"]: row for row in catalog_rows}
    _validate_upgrade_levels(state.upgrades, catalog)

    updated = (
        supabase.table("players")
        .update(
            {
                "coins": state.coins,
                "click_power": state.click_power,
                "passive_income": state.passive_income,
                "upgrades": state.upgrades,
                "updated_at": "now()",
            }
        )
        .eq("id", current_user.user_id)
        .execute()
    )

    if not updated.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Jugador no encontrado, llama primero a GET /player/me")

    return updated.data[0]
