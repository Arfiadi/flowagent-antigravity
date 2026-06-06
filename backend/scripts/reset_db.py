"""
Maintenance Script: Reset FlowAgent Database
Usage: python scripts/reset_db.py
"""

import sys
import os
from datetime import datetime, timezone

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_firestore_client
from firebase_admin import firestore

def reset_database(uid: str = "test-user-v050"):
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
        
    db = get_firestore_client()
    print(f"🚀 Starting database reset for user: {uid}")

    # 1. Clear Transactions
    print("🧹 Clearing transactions...")
    transactions = db.collection("transactions").where("uid", "==", uid).stream()
    count = 0
    for doc in transactions:
        doc.reference.delete()
        count += 1
    print(f"✅ Deleted {count} transactions.")

    # 2. Clear Agent Actions
    print("🧹 Clearing agent actions...")
    actions = db.collection("agent_actions").stream() # Global for now
    count = 0
    for doc in actions:
        doc.reference.delete()
        count += 1
    print(f"✅ Deleted {count} actions.")

    # 3. Reset Business State
    print("🔄 Resetting business state to zero...")
    now = datetime.now(timezone.utc).isoformat()
    
    initial_state = {
        "liquid_assets": {
            "cash_on_hand": 0,
            "bank_balance": 0,
            "uncategorized_inflows": 0,
            "last_updated": now
        },
        "trapped_capital": {
            "receivables": [],
            "receivables_total": 0,
            "aging_receivables_metrics": {
                "below_15d": 0,
                "15d_to_30d": 0,
                "above_30d": 0
            },
            "inventory_estimate": 0,
            "dead_stock_value": 0
        },
        "liabilities": {
            "payables": [],
            "payables_total": 0,
            "upcoming_opex": 0
        },
        "ai_metrics": {
            "cash_runway_days": 0,
            "liquidity_risk_level": "low",
            "health_score": 0,
            "gross_revenue": 0,
            "net_margin": 0,
            "days_sales_outstanding_dso": 0
        },
        "profile": {
            "business_name": "",
            "business_type": "",
            "location": "",
            "employee_count": 0,
            "primary_focus": ""
        }
    }
    
    db.collection("business_state").document(uid).set(initial_state)
    print(f"✅ Business state for '{uid}' has been reset to zero.")
    print("\n✨ Database is now clean and ready for a fresh start!")

if __name__ == "__main__":
    reset_database()
