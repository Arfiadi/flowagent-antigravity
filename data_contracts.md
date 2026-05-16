# Data Contracts: FlowAgent

Dokumen ini mendefinisikan **kontrak data ketat (strict data contracts)** yang menjembatani Frontend (React/TypeScript) dan Backend (Python/ADK). Semua koleksi Firestore, tipe data, dan literal string didefinisikan di sini sebagai **Single Source of Truth** untuk kedua sisi.

> [!IMPORTANT]
> Setiap perubahan pada skema data **HARUS** dimulai dari dokumen ini, lalu dipropagasi ke:
> - `frontend/src/core/types/schema.ts` (TypeScript)
> - `backend/models/state_models.py` (Pydantic V2)

---

## 1. Collection: `business_state/{uid}`
Singleton document per user. Merepresentasikan snapshot likuiditas real-time.

| Field Path | Type | Constraint | Contoh |
| :--- | :--- | :--- | :--- |
| `liquid_assets.cash_on_hand` | `float` | >= 0 | `2500000.0` |
| `liquid_assets.bank_balance` | `float` | >= 0 | `15000000.0` |
| `liquid_assets.last_updated` | `string` | ISO 8601 datetime | `"2026-05-15T12:00:00Z"` |
| `trapped_capital.receivables_total` | `float` | >= 0 | `8500000.0` |
| `trapped_capital.inventory_estimate` | `float` | >= 0 | `45000000.0` |
| `trapped_capital.dead_stock_value` | `float` | >= 0 | `12000000.0` |
| `liabilities.payables_total` | `float` | >= 0 | `9000000.0` |
| `liabilities.upcoming_opex` | `float` | >= 0 | `3000000.0` |
| `ai_metrics.cash_runway_days` | `integer` | >= 0 | `14` |
| `ai_metrics.liquidity_risk_level` | `Literal` | `"high"` \| `"medium"` \| `"low"` | `"high"` |
| `ai_metrics.health_score` | `float` | >= 0 | `0.85` |

---

## 2. Collection: `transactions/{auto_id}`
Event-sourced log. Setiap ingestion menghasilkan satu atau lebih dokumen di sini.

| Field | Type | Constraint | Contoh |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Firestore Auto-ID | `"abc123xyz"` |
| `type` | `Literal` | `"cash_in"` \| `"cash_out"` \| `"receivable_created"` \| `"receivable_paid"` \| `"payable_created"` \| `"payable_paid"` | `"receivable_created"` |
| `amount` | `float` | > 0 | `2000000.0` |
| `entity_name` | `string` | Non-empty | `"Pak Budi"` |
| `due_date` | `string \| null` | ISO 8601 date or null | `"2026-05-22"` |
| `source_modality` | `Literal` | `"voice"` \| `"photo"` \| `"text"` \| `"manual"` | `"voice"` |
| `confidence_score` | `float` | 0.0 – 1.0 | `0.95` |
| `created_at` | `string` | ISO 8601 datetime | `"2026-05-15T12:30:00Z"` |

---

## 3. Collection: `agent_actions/{auto_id}`
Draf aksi yang dihasilkan oleh THINK layer, menunggu persetujuan user.

| Field | Type | Constraint | Contoh |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Firestore Auto-ID | `"def456uvw"` |
| `action_type` | `Literal` | `"whatsapp_collection"` \| `"supplier_negotiation"` \| `"stock_warning"` | `"whatsapp_collection"` |
| `status` | `Literal` | `"pending_review"` \| `"approved"` \| `"rejected"` | `"pending_review"` |
| `target_entity` | `string` | Non-empty | `"Toko Makmur"` |
| `message_body` | `string` | Non-empty | `"Halo Bosku..."` |
| `risk_context` | `string` | Non-empty | `"Kasbon sudah lewat 30 hari..."` |
| `created_at` | `string` | ISO 8601 datetime | `"2026-05-15T13:00:00Z"` |

---

## 4. Payload: `TransactionPayload` (AI Extraction Output)
Skema output dari Gemini Flash saat mengekstraksi data dari foto/suara. Divalidasi oleh Pydantic di backend sebelum ditulis ke `transactions`.

| Field | Type | Constraint | Contoh |
| :--- | :--- | :--- | :--- |
| `type` | `Literal` | `"cash_in"` \| `"cash_out"` \| `"receivable_created"` \| `"payable_created"` | `"cash_in"` |
| `amount` | `float` | > 0 | `2000000.0` |
| `entity` | `string` | Non-empty | `"Pak Budi"` |
| `due_date` | `string \| null` | ISO 8601 date or null | `"2026-05-22"` |
| `confidence_score` | `float` | 0.0 – 1.0 | `0.95` |

---

## 5. Aturan Sinkronisasi

1. **Frontend → Firestore**: Hanya boleh menulis ke `transactions` (setelah user approve di ReviewCard).
2. **Backend → Firestore**: Boleh menulis ke `business_state` (update metrik) dan `agent_actions` (draf aksi baru).
3. **Frontend ← Firestore**: Membaca `business_state` dan `agent_actions` via `onSnapshot` (real-time).
4. **Confidence Guardrail**: Jika `confidence_score < 0.85`, Frontend **wajib** meminta verifikasi manual sebelum menyimpan ke `transactions`.
