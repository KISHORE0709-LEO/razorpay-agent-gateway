import { Request, Response } from "express";
import { db } from "../firebase";
import { collection, doc, getDocFromServer, getDocs, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";

export const handleListSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req.query.merchantId as string) || "demo_merchant";
    const sessionsRef = collection(db, `merchants/${merchantId}/chatSessions`);
    const q = query(sessionsRef, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);

    const sessions = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    res.json({ sessions });
  } catch (error: any) {
    console.error("Error listing chat sessions:", error);
    res.status(500).json({ error: error.message || "Failed to list chat sessions" });
  }
};

export const handleGetSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req.query.merchantId as string) || "demo_merchant";
    const { sessionId } = req.params;
    const sessionRef = doc(db, `merchants/${merchantId}/chatSessions/${sessionId}`);
    const snap = await getDocFromServer(sessionRef);

    if (!snap.exists()) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ session: { id: snap.id, ...snap.data() } });
  } catch (error: any) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: error.message || "Failed to fetch session" });
  }
};

export const handleSaveSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId = "demo_merchant", session } = req.body;
    if (!session || !session.id) {
      res.status(400).json({ error: "Missing session or session.id" });
      return;
    }

    const sessionRef = doc(db, `merchants/${merchantId}/chatSessions/${session.id}`);
    const now = new Date().toISOString();
    
    const payload = {
      id: session.id,
      title: session.title || "New Chat",
      createdAt: session.createdAt || now,
      updatedAt: now,
      messages: session.messages || []
    };

    await setDoc(sessionRef, payload, { merge: true });

    res.json({ success: true, session: payload });
  } catch (error: any) {
    console.error("Error saving chat session:", error);
    res.status(500).json({ error: error.message || "Failed to save chat session" });
  }
};

export const handleDeleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req.query.merchantId as string) || "demo_merchant";
    const { sessionId } = req.params;
    const sessionRef = doc(db, `merchants/${merchantId}/chatSessions/${sessionId}`);
    await deleteDoc(sessionRef);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: error.message || "Failed to delete session" });
  }
};
