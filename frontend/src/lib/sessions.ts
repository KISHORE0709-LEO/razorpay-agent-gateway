import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, query, orderBy, onSnapshot, Unsubscribe } from "firebase/firestore";
import { SubmitResult } from "./store";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  transactionId?: string;
  result?: SubmitResult;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "msg_welcome",
  role: "agent",
  content: "Hi! I’m your autonomous AI buyer powered by Groq and the SentryPay firewall. Tell me what product you’d like to purchase and I’ll extract your intent and submit it through policy verification.",
  timestamp: new Date().toISOString(),
};

export function createNewSessionObject(): ChatSession {
  const now = new Date().toISOString();
  const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: "New purchase inquiry",
    createdAt: now,
    updatedAt: now,
    messages: [DEFAULT_WELCOME_MESSAGE],
  };
}

export async function persistSession(merchantId: string, session: ChatSession): Promise<void> {
  const sessionRef = doc(db, `merchants/${merchantId}/chatSessions/${session.id}`);
  const payload = {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: new Date().toISOString(),
    messages: session.messages,
  };

  try {
    await setDoc(sessionRef, payload, { merge: true });
  } catch (err) {
    console.warn("Direct Firestore setDoc failed, saving via /api/chat/sessions fallback:", err);
    await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId, session: payload }),
    });
  }
}

export function subscribeSessions(
  merchantId: string,
  onUpdate: (sessions: ChatSession[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const sessionsRef = collection(db, `merchants/${merchantId}/chatSessions`);
  const q = query(sessionsRef, orderBy("updatedAt", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      const items: ChatSession[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      onUpdate(items);
    },
    async (err) => {
      console.warn("Firestore snapshot error on chatSessions, falling back to REST API:", err);
      if (onError) onError(err);
      try {
        const res = await fetch(`/api/chat/sessions?merchantId=${merchantId}`);
        if (res.ok) {
          const data = await res.json();
          onUpdate(data.sessions || []);
        }
      } catch (fetchErr) {
        console.error("Failed to load sessions from fallback API:", fetchErr);
      }
    }
  );
}

export async function removeSession(merchantId: string, sessionId: string): Promise<void> {
  const sessionRef = doc(db, `merchants/${merchantId}/chatSessions/${sessionId}`);
  try {
    await deleteDoc(sessionRef);
  } catch (err) {
    console.warn("Direct deleteDoc failed, using /api/chat/sessions DELETE fallback:", err);
    await fetch(`/api/chat/sessions/${sessionId}?merchantId=${merchantId}`, {
      method: "DELETE",
    });
  }
}
