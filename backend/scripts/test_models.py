import os
from google.cloud import aiplatform
from dotenv import load_dotenv

load_dotenv()

def list_models():
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    print(f"Checking available models for project: {project_id}...")
    
    try:
        aiplatform.init(project=project_id, location="us-central1")
        # List foundational models is not direct in SDK, 
        # but we can try a simple prediction to see if it's a model issue or auth issue
        from vertexai.generative_models import GenerativeModel
        
        # Try several common names
        models_to_try = ["gemini-1.5-flash-002", "gemini-1.5-flash", "gemini-1.0-pro"]
        
        for m_name in models_to_try:
            try:
                print(f"Testing model: {m_name}...")
                model = GenerativeModel(m_name)
                response = model.generate_content("Hi")
                print(f"SUCCESS with {m_name}! Response: {response.text}")
                return
            except Exception as e:
                print(f"Failed with {m_name}: {str(e)[:100]}...")
                
    except Exception as e:
        print(f"General Error: {str(e)}")

if __name__ == "__main__":
    list_models()
