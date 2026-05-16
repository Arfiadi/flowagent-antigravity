# FlowAgent 🚀
**Autonomous Financial Assistant for Indonesian SMEs**

FlowAgent adalah asisten keuangan berbasis **Agentic AI** yang dirancang khusus untuk membantu UMKM di Indonesia (khususnya sektor grosir/distribusi) mengelola likuiditas kas secara otonom. Sistem ini tidak hanya mencatat transaksi, tetapi "berpikir" dan "bertindak" untuk memitigasi risiko keuangan.

## 🌟 Fitur Utama
- **Multi-modal Ingestion (SENSE)**: Ekstraksi data transaksi secara otomatis melalui foto nota, rekaman suara, atau teks menggunakan Gemini 2.0 Flash.
- **Autonomous Planning (THINK)**: Agent secara mandiri menganalisis kesehatan keuangan (*Health Score*) dan memutuskan apakah perlu tindakan intervensi.
- **AI Action Center (ACT)**: Menghasilkan draf aksi nyata seperti penagihan piutang otomatis melalui WhatsApp atau negosiasi tempo ke supplier.
- **Human-in-the-Loop (HITL)**: Semua tindakan AI tetap memerlukan persetujuan pengguna sebelum dieksekusi, menjamin keamanan finansial.
- **Premium Dashboard**: Visualisasi *real-time* dengan skema desain *Neon Glassmorphism* yang modern.

## 🏗️ Arsitektur Sistem
FlowAgent menggunakan pola desain **SENSE-THINK-ACT**:
1. **SENSE Layer**: Gemini 2.0 Flash mengekstrak entitas dari input berantakan menjadi skema Pydantic yang valid.
2. **THINK Layer**: Gemini 2.0 Pro melakukan penalaran (*Inner Monologue*) terhadap *business state* saat ini.
3. **ACT Layer**: Menggunakan **Native Function Calling** untuk menghasilkan draf aksi mitigasi dengan mekanisme *Self-Correction*.

## 📂 Struktur Proyek
- `/backend`: FastAPI Server, Agentic Tools, & Firestore Logic.
- `/frontend`: React (Vite) PWA dengan sistem desain custom.
- `/Proposal.pdf`: Dokumentasi konsep bisnis dan teknis lengkap.

## 🚀 Cara Menjalankan

### Backend
1. Masuk ke direktori `backend`.
2. Install dependensi: `pip install -r requirements.txt`.
3. Salin `.env.example` ke `.env` dan isi kredensial yang diperlukan.
4. Jalankan server: `python main.py`.

### Frontend
1. Masuk ke direktori `frontend`.
2. Install dependensi: `npm install`.
3. Jalankan development server: `npm run dev`.

## 🛠️ Tech Stack
- **AI**: Google Gemini 2.0 (Pro & Flash) via Vertex AI.
- **Backend**: Python 3.11, FastAPI, Pydantic V2.
- **Database**: Firebase Firestore (Real-time).
- **Frontend**: React, Vite, Recharts, Vanilla CSS.

---
*FlowAgent — Mengubah Data Menjadi Aksi, Menghidupkan Kas UMKM.*
