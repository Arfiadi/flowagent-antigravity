import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

def seed_data():
    # Initialize Firebase Admin
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(cred_path):
        print(f"Error: Credentials file not found at {cred_path}")
        return

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Initial state for demo-user
    # Matching the schema in data_contracts.md
    initial_state = {
        "liquid_assets": {
            "cash_on_hand": 5000000.0,
            "bank_balance": 25000000.0,
            "last_updated": firestore.SERVER_TIMESTAMP
        },
        "trapped_capital": {
            "receivables_total": 12000000.0,
            "inventory_estimate": 60000000.0,
            "dead_stock_value": 15000000.0
        },
        "liabilities": {
            "payables_total": 8000000.0,
            "upcoming_opex": 4500000.0
        },
        "ai_metrics": {
            "cash_runway_days": 21,
            "liquidity_risk_level": "low",
            "health_score": 1.65
        }
    }

    print("Seeding initial state to Firestore...")
    db.collection("business_state").document("demo-user").set(initial_state)
    print("✅ Success! demo-user state initialized.")

if __name__ == "__main__":
    seed_data()
