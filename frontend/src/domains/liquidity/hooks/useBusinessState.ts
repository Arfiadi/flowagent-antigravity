/**
 * useBusinessState — Real-time Firestore Hook
 * 
 * Subscribes to the 'business_state' collection for a specific user.
 * Automatically updates the UI when the AI backend recalculates metrics.
 */

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../core/config/firebase";
import type { BusinessState } from "../../../core/types/schema";

export function useBusinessState(uid: string = "demo-user") {
  const [state, setState] = useState<BusinessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reference to the singleton document for the user
    const docRef = doc(db, "business_state", uid);

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setState(snapshot.data() as BusinessState);
        } else {
          console.warn("No business state found for UID:", uid);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => unsubscribe();
  }, [uid]);

  return { state, loading, error };
}
