"""FastAPI application entrypoint for the Tethread API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer

from app.core.config import settings
from app.database import Base, engine
import app.models  # Import all models so SQLAlchemy registers every table.
from app.routers.auth import router as auth_router
from app.routers.inventry import router as inventory_router
from app.routers.orders import router as orders_router
from app.routers.payment import router as payment_router
from app.routers.products import router as products_router
from app.routers.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
	"""Create database tables on startup and release resources on shutdown."""
	# Ensure all mapped models are created before the API begins serving traffic.
	async with engine.begin() as connection:
		await connection.run_sync(Base.metadata.create_all)
	print("Tethread API started successfully!")
	yield


app = FastAPI(
	title="Tethread API",
	description="Backend API for Tethread crochet keychain store",
	version="1.0.0",
	lifespan=lifespan,
	swagger_ui_oauth2_redirect_url="/docs/oauth2-redirect",
	swagger_ui_parameters={"persistAuthorization": True},
)

security = HTTPBearer()


def custom_openapi():
	if app.openapi_schema:
		return app.openapi_schema
	openapi_schema = get_openapi(
		title="Tethread API",
		version="1.0.0",
		description="Backend API for Tethread",
		routes=app.routes,
	)
	components = openapi_schema.setdefault("components", {})
	security_schemes = components.setdefault("securitySchemes", {})
	security_schemes["BearerAuth"] = {
		"type": "http",
		"scheme": "bearer",
		"bearerFormat": "JWT",
	}

	global_security = [{"BearerAuth": []}]
	if "OAuth2PasswordBearer" in security_schemes:
		global_security.append({"OAuth2PasswordBearer": []})
	openapi_schema["security"] = global_security

	app.openapi_schema = openapi_schema
	return app.openapi_schema


app.openapi = custom_openapi

# Allow the Tethread frontend to call the API from the browser.
app.add_middleware(
	CORSMiddleware,
	allow_origins=[settings.FRONTEND_URL],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Register all application routers under the versioned API prefix.
app.include_router(auth_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(inventory_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")


@app.get("/")
async def root():
	"""Return a simple health-style response for the API root."""
	return {
		"message": "Tethread API",
		"status": "running",
		"version": "1.0.0",
	}
