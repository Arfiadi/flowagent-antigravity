# FlowAgent Backend 🧠
**The Agentic Core: FastAPI + Gemini 2.0**

Direktori ini berisi logika pusat dari FlowAgent yang mengimplementasikan siklus hidup agen cerdas.

## 🧱 Arsitektur Agentic
Backend FlowAgent dirancang untuk kemandirian dan keamanan:

### 1. SENSE (Extraction Tool)
Menggunakan **Gemini 2.5 Flash** untuk kecepatan tinggi dalam memproses file multimedia.
- **Input**: Foto nota, Audio (Voice Note), atau Chat mentah.
- **Output**: Validated Pydantic models (TransactionPayload).
- **Guardrails**: Skor kepercayaan (*confidence score*) minimum 0.85 untuk *automatic approval*.

### 2. THINK & ACT (Action Tool)
Menggunakan **Gemini 2.5 Pro** untuk penalaran mendalam.
- **Native Function Calling**: Menggunakan fungsi `create_action_draft` secara asli di dalam model AI untuk menjamin struktur output.
- **Self-Correction Loop**: Jika output AI melanggar skema data, sistem akan memberikan umpan balik ke AI dan meminta perbaikan otomatis (maks 2 kali *retry*).
- **Autonomous Planning**: Agent memiliki otonomi untuk memutuskan "Tidak Ada Aksi" jika kondisi keuangan dinilai aman.

### 3. State Management (Firestore Tool)
- Setiap transaksi memicu kalkulasi ulang metrik bisnis secara *real-time*:
  - *Health Score* (Skala 0-5.00)
  - *Cash Runway Days*
  - *Liquidity Risk Level*

## 🛠️ API Endpoints
- `POST /api/extract`: Mengubah input multimodal menjadi data transaksi terstruktur.
- `POST /api/analyze`: Menyimpan transaksi, memperbarui state, dan memicu penalaran AI untuk aksi mitigasi.
- `GET /api/health`: Monitor status layanan dan model AI yang aktif.

## 🚀 Deployment (Google Cloud Run)
File `Dockerfile` telah tersedia untuk deployment ke Cloud Run. Sistem mendukung **Application Default Credentials (ADC)** sehingga tidak memerlukan file `service_account.json` manual saat berjalan di infrastruktur Google Cloud.

## ⚙️ Environment Variables
| Variable | Deskripsi |
| --- | --- |
| `FIREBASE_PROJECT_ID` | ID Project Google Cloud/Firebase |
| `VERTEX_AI_LOCATION` | Region (default: `us-central1`) |
| `GEMINI_SENSE_MODEL` | Model untuk ekstraksi (Flash) |
| `GEMINI_THINK_MODEL` | Model untuk penalaran (Pro) |
