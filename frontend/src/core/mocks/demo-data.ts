/**
 * FlowAgent — Demo Mock Data
 *
 * Centralized mock data for development and demo purposes.
 * This file is the SINGLE SOURCE for all mock data across the app.
 * Will be replaced by real Firestore data in production.
 */

import type { TransactionPayload, AgentAction } from "../types/schema";

export const MOCK_PAYLOAD: TransactionPayload = {
  type: "receivable_created",
  amount: 1250000,
  entity_name: "Toko Berkah",
  due_date: "2024-05-20",
  category: "Lainnya",
  confidence_score: 0.94,
};

export const MOCK_ACTIONS: AgentAction[] = [
  {
    id: "demo-001",
    action_type: "whatsapp_collection",
    status: "pending_review",
    target_entity: "Toko Makmur",
    message_body:
      "Selamat pagi Pak, mau konfirmasi soal tagihan kasbon Rp 2.000.000 yang jatuh tempo tanggal 22 Mei. Apakah bisa diproses minggu ini?",
    risk_context: "Kasbon Toko Makmur sudah lewat 15 hari dari jatuh tempo.",
    created_at: new Date().toISOString(),
  },
];
