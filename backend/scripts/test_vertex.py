import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load env variables
load_dotenv()

def test_vertex_connection():
    project_id = os.getenv("FIREBASE_PROJECT_ID") # gen-lang-client-0964227719
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") # service_account.json
    
    print(f"--- Vertex AI Unified SDK Connection Test ---")
    print(f"Project ID: {project_id}")
    
    if not cred_path or not os.path.exists(cred_path):
        print(f"Error: Credentials file not found at {cred_path}")
        return

    try:
        # Menginisialisasi Client baru yang otomatis membaca GOOGLE_APPLICATION_CREDENTIALS
        # Kita set langsung ke mode Vertex AI dengan menentukan project dan location
        client = genai.Client(
            vertexai=True,
            project=project_id,
            location="us-central1"
        )
        
        # Gunakan Gemini 2.5 Flash sesuai dengan PRD FlowAgent
        model_name = "gemini-2.5-flash"
        
        print(f"Mencoba memanggil {model_name} via Vertex AI...")
        response = client.models.generate_content(
            model=model_name,
            contents="Katakan 'Koneksi SDK Baru Berhasil!'"
        )
        
        print(f"Response: {response.text}")
        print("SUCCESS: Vertex AI & FlowAgent Brain are officially connected!")
        
    except Exception as e:
        print(f"FAILED: Connection error.")
        print(f"Error detail: {str(e)}")

if __name__ == "__main__":
    test_vertex_connection()
