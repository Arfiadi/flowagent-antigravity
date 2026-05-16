import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../core/config/firebase";
import type { AgentAction } from "../../../core/types/schema";

export function useAgentActions(uid: string = "demo-user") {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "agent_actions"),
      where("uid", "==", uid),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedActions: AgentAction[] = [];
        snapshot.forEach((doc) => {
          fetchedActions.push({ id: doc.id, ...doc.data() } as AgentAction);
        });
        setActions(fetchedActions);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error (Agent Actions):", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const updateActionStatus = async (actionId: string, status: "approved" | "rejected") => {
    try {
      const docRef = doc(db, "agent_actions", actionId);
      if (status === "rejected") {
        await deleteDoc(docRef);
      } else {
        await updateDoc(docRef, { status });
      }
    } catch (err) {
      console.error("Failed to update action status:", err);
      alert("Gagal memperbarui status aksi.");
    }
  };

  return { actions, loading, error, updateActionStatus };
}
