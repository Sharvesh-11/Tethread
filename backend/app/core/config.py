from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	# PostgreSQL connection URL used by SQLAlchemy.y
	DATABASE_URL: str

	# Secret used to sign JWT access tokens.
	SECRET_KEY: str

	# JWT signing algorithm.
	ALGORITHM: str = "HS256"

	# Access token expiration time in minutes.
	ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

	# Secret API key used to authenticate Stripe requests (optional).
	STRIPE_SECRET_KEY: str = "sk_test_dummy_stripe_key"

	# Secret used to verify incoming Stripe webhook signatures (optional).
	STRIPE_WEBHOOK_SECRET: str = "whsec_test_dummy_webhook"

	# Razorpay API key ID for payment gateway integration (optional).
	RAZORPAY_KEY_ID: str = "rzp_test_SmoNU0OcMM8HJO"

	# Razorpay API secret key for payment verification (optional).
	RAZORPAY_KEY_SECRET: str = "Bp9y0loKeMRlX3jnieEnuaAw"

	# Frontend origin used for redirects and CORS-related settings.
	FRONTEND_URL: str = "http://localhost:3000"
    
	N8N_WEBHOOK_URL: str = "https://n8n.zenith-labs.app/webhook/checkout"

	# Service API key for automation integrations (n8n, etc).
	SERVICE_API_KEY: str = ""

	# Load configuration values from a local .env file.
	model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

	# In app/core/config.py, add these fields to your Settings class:
	cloudinary_cloud_name: str = ""
	cloudinary_api_key: str = ""
	cloudinary_api_secret: str = ""


# Single settings instance imported across the app.
settings = Settings()
