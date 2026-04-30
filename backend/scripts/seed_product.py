
import asyncio
import os
import uuid
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Import models
from app.models.product import Product, Base

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Please define it in your .env file.")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

PRODUCTS_DATA = [
    {
        "id": uuid.UUID("550e8400-e29b-41d4-a716-446655440000"),
        "name": "Spider-Man",
        "price": 799,
        "category": "spider-verse",
        "description": "A cute hand-stitched Spider-Man crochet keychain made with soft premium yarn and tiny heroic details.",
        "image_url": "/images/products/spider-man.jpg",
        "stock_quantity": 3,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8"),
        "name": "Turtle",
        "price": 499,
        "category": "animals",
        "description": "A cheerful crochet turtle keychain handcrafted with love and soft yarn.",
        "image_url": "/images/products/turtle.jpg",
        "stock_quantity": 5,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d479"),
        "name": "Bouquet",
        "price": 399,
        "category": "accessories",
        "description": "A beautiful handmade crochet flower bouquet keychain that never wilts.",
        "image_url": "/images/products/bouquet.jpg",
        "stock_quantity": 15,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("9f8c6d7e-1234-4abc-8def-1234567890ab"),
        "name": "Penguin",
        "price": 899,
        "category": "animals",
        "description": "A pocket-sized penguin lovingly crocheted to be hugged and cherished.",
        "image_url": "/images/products/Penguin.jpg",
        "stock_quantity": 6,
        "is_active": True,
        "is_featured": False,
    },
    {
        "id": uuid.UUID("3d594650-3436-453b-bbb7-5f4d6f2f9a1c"),
        "name": "Panda",
        "price": 1499,
        "category": "animals",
        "description": "A sweet crochet panda keychain made with black and white premium yarn.",
        "image_url": "/images/products/panda.jpg",
        "stock_quantity": 7,
        "is_active": True,
        "is_featured": False,
    },
    {
        "id": uuid.UUID("1c6f2b90-7f3e-4d21-9a6e-c0b1e2d3f4a5"),
        "name": "Duck",
        "price": 299,
        "category": "animals",
        "description": "A compact handmade duck keychain with neat stitches and a sweet everyday feel.",
        "image_url": "/images/products/duck.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("2a1b3c4d-5e6f-4789-8abc-def012345678"),
        "name": "Gwen Stacy",
        "price": 799,
        "category": "spider-verse",
        "description": "A cute hand-stitched Spider-Man crochet keychain made with soft premium yarn and tiny heroic details.",
        "image_url": "/images/products/gwen-stacy.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("7d9e1f20-3a4b-4c5d-9e0f-112233445566"),
        "name": "Miles morales",
        "price": 799,
        "category": "spider-verse",
        "description": "A cute hand-stitched Spider-Man crochet keychain made with soft premium yarn and tiny heroic details.",
        "image_url": "/images/products/miles-morales.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("8c7b6a59-4d3e-42f1-a0b9-998877665544"),
        "name": "Pikachu",
        "price": 799,
        "category": "pokemon",
        "description": "A cute hand-stitched pokemon crochet keychain made with soft premium yarn.",
        "image_url": "/images/products/pickachu.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("d290f1ee-6c54-4b01-90e6-d701748f0851"),
        "name": "Gengar",
        "price": 799,
        "category": "pokemon",
        "description": "A cute hand-stitched pokemon crochet keychain made with soft premium yarn.",
        "image_url": "/images/products/gengar.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("a987fbc9-4bed-4078-8f07-9141ba07c9f3"),
        "name": "Jigglypuff",
        "price": 799,
        "category": "pokemon",
        "description": "A cute hand-stitched pokemon crochet keychain made with soft premium yarn.",
        "image_url": "/images/products/jigglypuff.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("16fd2706-8baf-433b-82eb-8c7fada847da"),
        "name": "Evee",
        "price": 799,
        "category": "pokemon",
        "description": "A cute hand-stitched pokemon crochet keychain made with soft premium yarn.",
        "image_url": "/images/products/evee.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("886313e1-3b8a-5372-9b90-0c9aee199e5d"),
        "name": "Meowth",
        "price": 799,
        "category": "pokemon",
        "description": "A cute hand-stitched pokemon crochet keychain made with soft premium yarn.",
        "image_url": "/images/products/Meowth.jpg",
        "stock_quantity": 11,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("c56a4180-65aa-42ec-a945-5fd21dec0538"),
        "name": "Bow",
        "price": 399,
        "category": "accessories",
        "description": "A beautiful handmade crochet flower bow keychain that never wilts.",
        "image_url": "/images/products/bow.jpg",
        "stock_quantity": 15,
        "is_active": True,
        "is_featured": True,
    },
    {
        "id": uuid.UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        "name": "Octopus",
        "price": 399,
        "category": "animals",
        "description": "A cheerful crochet octopus keychain handcrafted with love and soft yarn.",
        "image_url": "/images/products/octo.jpg",
        "stock_quantity": 15,
        "is_active": True,
        "is_featured": True,
    },
]


async def seed_products():
    """Clear existing products and seed new ones into the database."""
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        try:
            # Delete order_items first (foreign key dependency)
            await session.execute(text("DELETE FROM order_items"))
            await session.commit()
            print("✓ Cleared existing order items")

            # Delete existing products
            await session.execute(text("DELETE FROM products"))
            await session.commit()
            print("✓ Cleared existing products")

            # Insert new products
            for product_data in PRODUCTS_DATA:
                product = Product(
                    **product_data,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(product)

            await session.commit()
            print(f"✓ Successfully seeded {len(PRODUCTS_DATA)} products!")

        except Exception as e:
            await session.rollback()
            print(f"✗ Error seeding products: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_products())