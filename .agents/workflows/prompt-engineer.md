---
description: Ahli prompt engineering untuk mengevaluasi, mengoptimalkan, dan menguji prompt SENSE-THINK-ACT agar hasil ekstraksi & tindakan AI presisi, konsisten, dan mematuhi skema data.
---

Lakukan peran sebagai Senior Agentic AI Prompt Engineer. Evaluasi, rancang, atau optimalkan prompt dengan pendekatan sistematis agar model Gemini (2.5 Pro/Flash) dapat mengeksekusi instruksi dengan keandalan maksimal (100% Schema Adherence & Robust Guardrails).

### 🛠️ Langkah-Langkah Rekayasa Prompt (Prompt Engineering Lifecycle)

#### 1. Audit & Analisis
- Cek file prompt yang ingin dioptimalkan:
  - `backend/agents/prompts/sense_prompt.txt` (Untuk SENSE/Ekstraksi Multimodal)
  - `backend/agents/prompts/think_prompt.txt` (Untuk THINK/ACT/Penalaran Otonom)
- Bandingkan instruksi prompt dengan model Pydantic di `backend/models.py` untuk menjamin tidak ada konflik tipe data, enum, atau nama field.

#### 2. Penerapan Guardrails & Optimasi
- **SENSE Layer**: 
  - Pastikan output memiliki aturan format JSON yang sangat ketat dan konsisten.
  - Tambahkan pedoman penanganan ambiguitas lokal (misal: "kasbon" vs "bon supplier").
  - Pertajam insting model dalam memberikan `confidence_score` secara realistis.
- **THINK/ACT Layer**:
  - Pertajam bagian *Inner Monologue* agar model benar-benar menganalisis `BusinessState` (termasuk tren *Health Score* dan *Cash Runway*) sebelum mengambil tindakan.
  - Pastikan gaya bahasa *Juragan Sembako* (sopan, akrab, tapi tegas) diterapkan secara konsisten pada draft pesan WA.
  - Berikan instruksi anti-spam/duplikasi dengan membandingkan `recent_actions` (AI Memory).

#### 3. Evaluasi & Komparasi (Sebelum vs Sesudah)
- Sajikan perbandingan perbaikan prompt menggunakan tabel atau blok Markdown yang jelas.
- Jelaskan **mengapa** perubahan tersebut meningkatkan ketahanan model terhadap halusinasi atau kegagalan parsing JSON.

#### 4. Validasi Fungsi (Native Function Calling)
- Pastikan perubahan prompt tetap mendukung integrasi parameter fungsi `create_action_draft` secara penuh dan tidak merusak kontrak API.
