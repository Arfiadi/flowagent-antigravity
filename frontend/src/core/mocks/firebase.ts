import { vi } from "vitest";

// In-memory representation of Firestore database
export interface MockStore {
  [collectionPath: string]: {
    [docId: string]: any;
  };
}

export let mockDbStore: MockStore = {
  business_state: {
    "test-user-v050": {
      liquid_assets: {
        cash_on_hand: 50000000,
        bank_balance: 150000000,
        uncategorized_inflows: 12000000,
        last_updated: new Date().toISOString(),
      },
      trapped_capital: {
        receivables: [
          { entity_name: "Toko Berkah", amount: 1250000, due_date: "2024-05-20", created_at: new Date().toISOString() }
        ],
        receivables_total: 1250000,
        aging_receivables_metrics: {
          below_15d: 1250000,
          "15d_to_30d": 0,
          above_30d: 0,
        },
        inventory_estimate: 25000000,
        dead_stock_value: 2000000,
      },
      liabilities: {
        payables: [
          { entity_name: "Supplier Utama", amount: 5000000, due_date: "2024-05-25", created_at: new Date().toISOString() }
        ],
        payables_total: 5000000,
        upcoming_opex: 15000000,
      },
      ai_metrics: {
        cash_runway_days: 45,
        liquidity_risk_level: "low",
        health_score: 88,
        gross_revenue: 45000000,
        net_margin: 0.15,
        days_sales_outstanding_dso: 14,
      },
      profile: {
        business_name: "Toko Sejahtera",
        business_type: "Distributor Sembako & Ritel",
        location: "Bandung, Jawa Barat",
        employee_count: 3,
        primary_focus: "Perputaran Kas Cepat",
      },
    },
  },
  transactions: {
    "tx-001": {
      uid: "test-user-v050",
      type: "receivable_created",
      amount: 1250000,
      entity_name: "Toko Berkah",
      category: "Penjualan",
      due_date: "2024-05-20",
      source_modality: "photo",
      confidence_score: 0.94,
      created_at: new Date().toISOString(),
    },
  },
  agent_actions: {
    "demo-001": {
      uid: "test-user-v050",
      action_type: "whatsapp_collection",
      status: "pending_review",
      target_entity: "Toko Makmur",
      message_body: "Selamat pagi Pak, mau konfirmasi soal tagihan kasbon Rp 2.000.000...",
      risk_context: "Kasbon Toko Makmur sudah lewat 15 hari dari jatuh tempo.",
      created_at: new Date().toISOString(),
    },
  },
};

const listeners = new Set<() => void>();

export function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      // ignore listener errors during test lifecycle
    }
  });
}

export function resetMockDb(initialStore?: MockStore) {
  mockDbStore = initialStore || {
    business_state: {
      "test-user-v050": {
        liquid_assets: {
          cash_on_hand: 50000000,
          bank_balance: 150000000,
          uncategorized_inflows: 12000000,
          last_updated: new Date().toISOString(),
        },
        trapped_capital: {
          receivables: [
            { entity_name: "Toko Berkah", amount: 1250000, due_date: "2024-05-20", created_at: new Date().toISOString() }
          ],
          receivables_total: 1250000,
          aging_receivables_metrics: {
            below_15d: 1250000,
            "15d_to_30d": 0,
            above_30d: 0,
          },
          inventory_estimate: 25000000,
          dead_stock_value: 2000000,
        },
        liabilities: {
          payables: [
            { entity_name: "Supplier Utama", amount: 5000000, due_date: "2024-05-25", created_at: new Date().toISOString() }
          ],
          payables_total: 5000000,
          upcoming_opex: 15000000,
        },
        ai_metrics: {
          cash_runway_days: 45,
          liquidity_risk_level: "low",
          health_score: 88,
          gross_revenue: 45000000,
          net_margin: 0.15,
          days_sales_outstanding_dso: 14,
        },
        profile: {
          business_name: "Toko Sejahtera",
          business_type: "Distributor Sembako & Ritel",
          location: "Bandung, Jawa Barat",
          employee_count: 3,
          primary_focus: "Perputaran Kas Cepat",
        },
      },
    },
    transactions: {
      "tx-001": {
        uid: "test-user-v050",
        type: "receivable_created",
        amount: 1250000,
        entity_name: "Toko Berkah",
        category: "Penjualan",
        due_date: "2024-05-20",
        source_modality: "photo",
        confidence_score: 0.94,
        created_at: new Date().toISOString(),
      },
    },
    agent_actions: {
      "demo-001": {
        uid: "test-user-v050",
        action_type: "whatsapp_collection",
        status: "pending_review",
        target_entity: "Toko Makmur",
        message_body: "Selamat pagi Pak, mau konfirmasi soal tagihan kasbon Rp 2.000.000...",
        risk_context: "Kasbon Toko Makmur sudah lewat 15 hari dari jatuh tempo.",
        created_at: new Date().toISOString(),
      },
    },
  };
  notifyListeners();
}

export const db = { type: "firestore-db" };

export const collection = vi.fn((_db: any, path: string) => {
  return { type: "collection", path };
});

export const doc = vi.fn((_db: any, path: string, docId?: string) => {
  let collPath = path;
  let id = docId;
  // If first parameter is a collection reference instead of db
  if (typeof _db === "object" && _db && _db.type === "collection") {
    collPath = _db.path;
    id = path;
  }
  return { type: "doc", collectionPath: collPath, id };
});

export const query = vi.fn((ref: any, ...constraints: any[]) => {
  return { type: "query", ref, constraints };
});

export const where = vi.fn((field: string, op: string, value: any) => {
  return { type: "where", field, op, value };
});

export const orderBy = vi.fn((field: string, direction: string = "asc") => {
  return { type: "orderBy", field, direction };
});

export const onSnapshot = vi.fn((ref: any, callback: any, errorCallback?: any) => {
  const handler = () => {
    try {
      if (ref.type === "doc") {
        const collectionData = mockDbStore[ref.collectionPath] || {};
        const data = collectionData[ref.id];
        const snapshot = {
          exists: () => data !== undefined,
          data: () => data,
          id: ref.id,
        };
        callback(snapshot);
      } else if (ref.type === "collection" || ref.type === "query") {
        const targetRef = ref.type === "query" ? ref.ref : ref;
        const collectionData = mockDbStore[targetRef.path] || {};
        
        let docs = Object.keys(collectionData).map((id) => ({
          id,
          data: () => collectionData[id],
        }));

        // Apply filters if it's a query
        if (ref.type === "query" && ref.constraints) {
          ref.constraints.forEach((constraint: any) => {
            if (constraint.type === "where") {
              const { field, op, value } = constraint;
              docs = docs.filter((d) => {
                const docVal = d.data()[field];
                if (op === "==") return docVal === value;
                return true;
              });
            }
          });
        }

        const snapshot = {
          forEach: (cb: any) => docs.forEach(cb),
          docs,
          size: docs.length,
        };
        callback(snapshot);
      }
    } catch (err: any) {
      if (errorCallback) {
        errorCallback(err);
      }
    }
  };

  // Run immediately
  handler();

  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
});

export const updateDoc = vi.fn(async (docRef: any, data: any) => {
  const { collectionPath, id } = docRef;
  if (!id) return;
  if (!mockDbStore[collectionPath]) {
    mockDbStore[collectionPath] = {};
  }
  mockDbStore[collectionPath][id] = {
    ...mockDbStore[collectionPath][id],
    ...data,
  };
  notifyListeners();
});

export const deleteDoc = vi.fn(async (docRef: any) => {
  const { collectionPath, id } = docRef;
  if (id && mockDbStore[collectionPath] && mockDbStore[collectionPath][id]) {
    delete mockDbStore[collectionPath][id];
  }
  notifyListeners();
});
