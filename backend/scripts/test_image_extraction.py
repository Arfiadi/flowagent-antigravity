import sys
import os
import asyncio

# Reconfigure stdout for UTF-8 encoding on Windows to prevent UnicodeEncodeError
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent dir to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.extraction_tool import extract_from_image
from models import TransactionPayload

async def test_image_extraction():
    print("--- Testing SENSE Layer: Image Extraction ---")
    
    receipt_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_receipt.png")
    assert os.path.exists(receipt_path), f"Receipt file not found at {receipt_path}"
    
    print(f"Reading image file: {receipt_path}")
    with open(receipt_path, "rb") as f:
        image_bytes = f.read()
        
    print(f"Extracted image bytes size: {len(image_bytes)} bytes")
    
    # Run the image extraction
    payload = await extract_from_image(image_bytes, mime_type="image/png")
    
    print("Result payload:", payload.model_dump())
    
    # Assertions
    assert isinstance(payload, TransactionPayload), "Result is not a TransactionPayload instance"
    assert payload.type in ["cash_in", "cash_out", "payable_created", "receivable_created", "receivable_paid", "payable_paid"], f"Invalid transaction type: {payload.type}"
    assert payload.amount > 0, f"Expected amount > 0, got {payload.amount}"
    assert isinstance(payload.entity_name, str) and len(payload.entity_name) > 0, "Expected non-empty entity_name string"
    assert 0.0 <= payload.confidence_score <= 1.0, f"Confidence score out of range: {payload.confidence_score}"
    
    print("✔️ [PASS] Image Extraction: Receipt Parsed Successfully")

if __name__ == "__main__":
    asyncio.run(test_image_extraction())
    print("\n✔️ [PASS] SENSE Layer: Image extraction test completed successfully.")
