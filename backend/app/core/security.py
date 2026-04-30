from fastapi import Request, HTTPException, status
import secrets
from app.core.config import settings

async def verify_service_key(request: Request):
    service_key = request.headers.get("X-Service-Key")
    if not service_key or not secrets.compare_digest(service_key, settings.SERVICE_API_KEY):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing service key")
