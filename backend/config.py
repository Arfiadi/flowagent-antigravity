"""
FlowAgent — Centralized Configuration

Uses Pydantic Settings for validated, type-safe configuration.
All environment variables are loaded and validated at startup.
Singleton clients for GenAI and Firestore are created once and reused.
"""

import logging
import os
from functools import lru_cache

from dotenv import load_dotenv
from google import genai
from firebase_admin import credentials, firestore, initialize_app
import firebase_admin

load_dotenv()

logger = logging.getLogger("flowagent")


class Settings:
    """Application settings loaded from environment variables."""

    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS", "service_account.json"
    )
    VERTEX_AI_LOCATION: str = os.getenv("VERTEX_AI_LOCATION", "us-central1")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def validate(self) -> None:
        """Validate that all required settings are present."""
        if not self.FIREBASE_PROJECT_ID:
            raise ValueError("FIREBASE_PROJECT_ID is required in .env")
        if not os.path.exists(self.GOOGLE_APPLICATION_CREDENTIALS):
            raise FileNotFoundError(
                f"Credentials file not found: {self.GOOGLE_APPLICATION_CREDENTIALS}"
            )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings singleton."""
    settings = Settings()
    settings.validate()
    return settings


@lru_cache(maxsize=1)
def get_genai_client() -> genai.Client:
    """Return cached GenAI client singleton (Vertex AI mode)."""
    settings = get_settings()
    client = genai.Client(
        vertexai=True,
        project=settings.FIREBASE_PROJECT_ID,
        location=settings.VERTEX_AI_LOCATION,
    )
    logger.info(
        "GenAI client initialized (project=%s, location=%s)",
        settings.FIREBASE_PROJECT_ID,
        settings.VERTEX_AI_LOCATION,
    )
    return client


@lru_cache(maxsize=1)
def get_firestore_client() -> firestore.client:
    """Return cached Firestore client singleton."""
    settings = get_settings()
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.GOOGLE_APPLICATION_CREDENTIALS)
        initialize_app(cred)
    db = firestore.client()
    logger.info("Firestore client initialized (project=%s)", settings.FIREBASE_PROJECT_ID)
    return db
