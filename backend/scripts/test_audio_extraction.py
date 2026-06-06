import sys
import os
import asyncio
import wave
import struct

# Reconfigure stdout for UTF-8 encoding on Windows to prevent UnicodeEncodeError
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent dir to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.extraction_tool import extract_from_audio
from models import TransactionPayload

def create_dummy_wav(filepath):
    """Create a 1-second dummy WAV audio file of silence."""
    sample_rate = 44100
    duration = 1.0
    num_samples = int(sample_rate * duration)
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2) # 16-bit audio
        wav_file.setframerate(sample_rate)
        # Write silent samples
        for _ in range(num_samples):
            data = struct.pack('<h', 0)
            wav_file.writeframesraw(data)

async def test_audio_extraction():
    print("--- Testing SENSE Layer: Audio Extraction ---")
    
    wav_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_audio.wav")
    create_dummy_wav(wav_path)
    print(f"Created dummy WAV file: {wav_path}")
    
    with open(wav_path, "rb") as f:
        audio_bytes = f.read()
        
    print(f"Extracted audio bytes size: {len(audio_bytes)} bytes")
    
    # Run the audio extraction
    payload = await extract_from_audio(audio_bytes, mime_type="audio/wav")
    
    print("Result payload:", payload.model_dump())
    
    # Assertions
    assert isinstance(payload, TransactionPayload), "Result is not a TransactionPayload instance"
    assert payload.type in ["cash_in", "cash_out", "payable_created", "receivable_created", "receivable_paid", "payable_paid"], f"Invalid transaction type: {payload.type}"
    assert payload.amount > 0, f"Expected amount > 0, got {payload.amount}"
    assert isinstance(payload.entity_name, str) and len(payload.entity_name) > 0, "Expected non-empty entity_name string"
    assert 0.0 <= payload.confidence_score <= 1.0, f"Confidence score out of range: {payload.confidence_score}"
    
    print("✔️ [PASS] Audio Extraction: Audio Parsed Successfully")

if __name__ == "__main__":
    asyncio.run(test_audio_extraction())
    print("\n✔️ [PASS] SENSE Layer: Audio extraction test completed successfully.")
