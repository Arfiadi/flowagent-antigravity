import "@testing-library/jest-dom";
import { vi } from "vitest";
import * as mockFirebase from "./core/mocks/firebase";

// Mock window.alert globally
if (typeof window !== "undefined") {
  window.alert = vi.fn();
}

// Mock firebase/firestore module globally
vi.mock("firebase/firestore", () => {
  return {
    collection: mockFirebase.collection,
    doc: mockFirebase.doc,
    query: mockFirebase.query,
    where: mockFirebase.where,
    orderBy: mockFirebase.orderBy,
    onSnapshot: mockFirebase.onSnapshot,
    updateDoc: mockFirebase.updateDoc,
    deleteDoc: mockFirebase.deleteDoc,
    getFirestore: () => mockFirebase.db,
  };
});

// Mock firebase/app module globally
vi.mock("firebase/app", () => {
  return {
    initializeApp: vi.fn(() => ({})),
  };
});

// Mock firebase/storage module globally
vi.mock("firebase/storage", () => {
  return {
    getStorage: vi.fn(() => ({})),
  };
});
