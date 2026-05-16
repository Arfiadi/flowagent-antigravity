/**
 * useTransactions — Real-time Firestore subscription for transaction history.
 *
 * Follows the same pattern as useAgentActions.ts:
 * subscribes to the 'transactions' collection filtered by uid,
 * ordered newest-first, with real-time updates via onSnapshot.
 */

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../core/config/firebase";
import type { Transaction } from "../../../core/types/schema";

export function useTransactions(uid: string = "demo-user") {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      where("uid", "==", uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Transaction[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        
        // Sort in memory to avoid needing a Firestore composite index
        fetched.sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA; // Descending
        });
        
        setTransactions(fetched);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error (Transactions):", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { transactions, loading, error };
}
