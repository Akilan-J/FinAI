from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.services.currency import SUPPORTED_CURRENCIES

router = APIRouter()


@router.get("", response_model=ResponseEnvelope[list[dict]])
async def list_currencies(current_user: User = Depends(get_current_user)):
    data = [
        {"code": code, "symbol": info["symbol"], "name": info["name"]}
        for code, info in SUPPORTED_CURRENCIES.items()
    ]
    return ResponseEnvelope(data=data)
