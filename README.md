# FlowAgent - AI-Powered Financial & Business Agent

FlowAgent adalah platform AI Agentic mutakhir yang dirancang untuk memberdayakan bisnis dengan analisis keuangan otonom, pelacakan metrik real-time, dan pengambilan keputusan cerdas. Dibangun dengan stack web modern yang tangguh, FlowAgent mengintegrasikan frontend React yang dinamis, backend FastAPI berkinerja tinggi, dan ekosistem Firebase untuk manajemen state yang mulus dan seketika (real-time).

## 🌟 Fitur Utama

- **Manajemen Profil Bisnis**: Antarmuka interaktif yang memudahkan pemilik bisnis untuk mengatur dan mengelola profil, tujuan (goals), dan batasan (constraints) usaha mereka.
- **Alur Kerja (Workflows) AI Agentic**: Memanfaatkan agent AI otonom untuk menganalisis kesehatan keuangan, mengidentifikasi modal yang terperangkap (trapped capital), dan memberikan rekomendasi optimasi.
- **Dashboard Keuangan Real-time**: Pembaruan langsung atas aset likuid, liabilitas, dan metrik yang dihasilkan oleh AI menggunakan sistem *real-time listener* dari Firestore.
- **UI/UX Modern & Responsif**: Dirancang menggunakan React, Tailwind CSS, dan komponen shadcn/ui untuk pengalaman pengguna yang premium, estetik, dan dinamis.
- **Backend Skalabel**: API REST berbasis FastAPI dan runtime agent yang siap berjalan secara konkuren, di-deploy di Google Cloud Run untuk kinerja maksimal dan penskalaan otomatis.

## 🏗️ Arsitektur & Stack Teknologi

### Frontend
- **Framework**: React 18 dengan Vite
- **Styling**: Tailwind CSS & shadcn/ui
- **State & Data**: Firebase SDK (Firestore Real-time Listeners)
- **Testing**: Vitest & React Testing Library
- **Hosting**: Firebase Hosting

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: Firebase Admin SDK (Firestore)
- **AI/Agents**: Agentic workflows dengan integrasi model AI terkini
- **Testing**: Pytest
- **Deployment**: Google Cloud Run (Docker Containerized)

## 🚀 Panduan Memulai (Getting Started)

### Prasyarat (Prerequisites)
- Node.js (v18 atau lebih baru)
- Python (v3.10 atau lebih baru)
- Firebase CLI
- Google Cloud SDK (opsional, untuk deployment manual)

### 1. Kloning Repositori
```bash
git clone https://github.com/your-org/flowagent-antigravity.git
cd flowagent-antigravity
```

### 2. Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Untuk Windows: venv\Scripts\activate
pip install -r requirements.txt

# Menjalankan server backend secara lokal
uvicorn main:app --reload --port 8000
```

### 3. Setup Frontend
```bash
cd frontend
npm install

# Menjalankan Vite development server
npm run dev
```

## 🧪 Testing

Sistem ini memiliki *test coverage* yang sangat baik untuk memastikan setiap komponen dan logika bisnis berjalan dengan benar.

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## 📦 Deployment

- **Backend**: Di-deploy sebagai microservice di Google Cloud Run. (`gcloud run deploy`)
- **Frontend**: Di-deploy sebagai SPA (Single Page Application) di Firebase Hosting. (`firebase deploy --only hosting`)

## 🛡️ Lisensi & Hak Cipta
Hak Cipta Dilindungi. Kode ini adalah milik eksklusif dan tidak untuk didistribusikan secara publik tanpa izin.
