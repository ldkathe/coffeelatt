from fastapi import APIRouter, HTTPException, status

from app.core.supabase_client import get_supabase

router = APIRouter(prefix="/shop", tags=["shop"])


@router.get("/items")
def list_shop_items():
    supabase = get_supabase()
    result = supabase.table("upgrades").select("*").order("tier").execute()

    if result.data is None:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No se pudo leer el catálogo de mejoras")

    return result.data
