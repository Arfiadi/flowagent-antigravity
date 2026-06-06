import sys
import os
import asyncio
from datetime import datetime

# Reconfigure stdout for UTF-8 encoding on Windows to prevent UnicodeEncodeError
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent dir to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.extraction_tool import extract_from_text
from models import TransactionPayload

async def test_text_extractions():
    print("--- Testing SENSE Layer: Text Extraction ---")

    # 1. Test Cash In
    input_cash_in = "Menerima pembayaran tunai sebesar 500.000 Rupiah dari Toko Raya untuk penjualan sembako"
    print(f"Testing input: '{input_cash_in}'")
    payload = await extract_from_text(input_cash_in)
    print("Result:", payload.model_dump())
    assert isinstance(payload, TransactionPayload), "Result is not a TransactionPayload instance"
    assert payload.type in ["cash_in", "receivable_paid"], f"Unexpected type: {payload.type}"
    assert payload.amount == 500000.0, f"Expected amount 500000.0, got {payload.amount}"
    assert "Toko Raya" in payload.entity_name, f"Expected entity_name to contain 'Toko Raya', got '{payload.entity_name}'"
    assert 0.0 <= payload.confidence_score <= 1.0, f"Confidence score out of range: {payload.confidence_score}"
    print("✔️ [PASS] Text Extraction: Cash In")

    # 2. Test Cash Out
    input_cash_out = "Membayar biaya listrik bulanan sebesar Rp 250000 ke PLN"
    print(f"\nTesting input: '{input_cash_out}'")
    payload = await extract_from_text(input_cash_out)
    print("Result:", payload.model_dump())
    assert isinstance(payload, TransactionPayload), "Result is not a TransactionPayload instance"
    assert payload.type in ["cash_out", "payable_paid"], f"Unexpected type: {payload.type}"
    assert payload.amount == 250000.0, f"Expected amount 250000.0, got {payload.amount}"
    assert "PLN" in payload.entity_name, f"Expected entity_name to contain 'PLN', got '{payload.entity_name}'"
    assert 0.0 <= payload.confidence_score <= 1.0, f"Confidence score out of range: {payload.confidence_score}"
    print("✔️ [PASS] Text Extraction: Cash Out")

    # 3. Test Receivable Created (Piutang)
    input_receivable = "Mencatat piutang baru Toko Mandiri sebesar 1.200.000 rupiah jatuh tempo tanggal 15 Juni 2026"
    print(f"\nTesting input: '{input_receivable}'")
    payload = await extract_from_text(input_receivable)
    print("Result:", payload.model_dump())
    assert isinstance(payload, TransactionPayload), "Result is not a TransactionPayload instance"
    assert payload.type == "receivable_created", f"Unexpected type: {payload.type}"
    assert payload.amount == 1200000.0, f"Expected amount 1200000.0, got {payload.amount}"
    assert "Toko Mandiri" in payload.entity_name, f"Expected entity_name to contain 'Toko Mandiri', got '{payload.entity_name}'"
    if payload.due_date:
        # Check that it parses due_date correctly (should contain '2026-06-15')
        assert "2026-06-15" in payload.due_date, f"Expected due_date to contain '2026-06-15', got '{payload.due_date}'"
    print("✔️ [PASS] Text Extraction: Receivable Created")

    # 4. Test Payable Created (Hutang)
    input_payable = "Menerima tagihan beras dari Agen Makmur sebesar Rp 3.500.000 yang harus dibayar tanggal 20-06-2026"
    print(f"\nTesting input: '{input_payable}'")
    payload = await extract_from_text(input_payable)
    print("Result:", payload.model_dump())
    assert isinstance(payload, TransactionPayload), "Result is not a TransactionPayload instance"
    assert payload.type == "payable_created", f"Unexpected type: {payload.type}"
    assert payload.amount == 3500000.0, f"Expected amount 3500000.0, got {payload.amount}"
    assert "Agen Makmur" in payload.entity_name, f"Expected entity_name to contain 'Agen Makmur', got '{payload.entity_name}'"
    if payload.due_date:
        assert "2026-06-20" in payload.due_date, f"Expected due_date to contain '2026-06-20', got '{payload.due_date}'"
    print("✔️ [PASS] Text Extraction: Payable Created")

if __name__ == "__main__":
    asyncio.run(test_text_extractions())
    print("\n✔️ [PASS] SENSE Layer: All text extraction tests completed successfully.")
