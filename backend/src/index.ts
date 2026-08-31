import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleEvaluate } from "./routes/evaluate";
import { handleChat } from "./routes/chat";
import { handleResolve } from "./routes/resolve";

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Example API routes
app.get("/api/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});

app.get("/api/demo", handleDemo);
app.post("/api/evaluate", handleEvaluate);
app.post("/api/chat", handleChat);
app.post("/api/resolve", handleResolve);

const PORT = process.env.PORT || 8080;
// Only listen if not imported by node-build.ts
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
