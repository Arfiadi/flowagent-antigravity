# FlowAgent Frontend 📱
**Premium AI Financial Dashboard (PWA)**

Antarmuka FlowAgent dirancang untuk memberikan pengalaman *fintech* kelas atas dengan fokus pada kecepatan dan kemudahan penggunaan bagi pemilik UMKM.

## 🎨 Design System: Neon Glassmorphism
Aplikasi ini menggunakan sistem desain custom berbasis **Vanilla CSS** dengan prinsip:
- **Glassmorphism**: Lapisan transparan dengan efek *blur* mendalam (20px) untuk kesan modern.
- **Neon Accents**:
  - **Aqua (#00D8FF)**: Simbol pertumbuhan (Pemasukan/Cash).
  - **Pink (#FF3366)**: Simbol risiko/perhatian (Pengeluaran/Hutang).
  - **Gold (#FFB300)**: Simbol peringatan/sedang diproses.
- **Micro-animations**: Transisi halus pada kartu metrik dan bar progres.

## 🧱 Struktur Domain
Aplikasi dibagi menjadi beberapa modul fungsional:
- `liquidity`: Dashboard utama dengan *Gauge Chart* dan tren likuiditas.
- `history`: AI Extraction Feed (riwayat transaksi cerdas).
- `ingest`: Antarmuka input multimodal (Kamera/Voice).
- `agent`: Pusat Aksi (HITL) untuk menyetujui rekomendasi AI.
- `profile`: Konteks bisnis dan pengaturan toko.

## ⚡ Fitur Utama
1. **Real-time Synchronization**: Menggunakan Firebase SDK untuk memperbarui dashboard secara instan saat ada perubahan di database.
2. **AI Action Feedback**: Notifikasi interaktif dan draf pesan WhatsApp yang siap dikirim.
3. **PWA Capabilities**: Mendukung instalasi di ponsel sebagai aplikasi native dan akses kamera/mikrofon langsung dari browser.
4. **Interactive Gauge**: Visualisasi kesehatan keuangan yang intuitif dengan skala 5.00.

## 🛠️ Scripts
- `npm run dev`: Menjalankan server pengembangan.
- `npm run build`: Membuat *production bundle*.
- `npm run preview`: Meninjau hasil build secara lokal.

## 📁 Environment
Pastikan file `.env` diisi dengan kredensial Firebase:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
...
```
