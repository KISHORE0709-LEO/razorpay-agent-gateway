import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleEvaluate } from "./routes/evaluate";
import { handleChat } from "./routes/chat";
import { handleResolve } from "./routes/resolve";
import { handleGetRules, handleSaveRules, handleGetPolicyStrategies, handleResetDailySpend } from "./routes/rules";
import { handleDeleteSession, handleGetSession, handleListSessions, handleSaveSession } from "./routes/sessions";
import {
  handleListCampaigns,
  handleGenerateCampaigns,
  handleActivateCampaign,
  handleDeactivateCampaign,
} from "./routes/campaigns";
import { handleProductImage } from "./routes/product-image";

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
app.get("/api/product-image", handleProductImage);
app.post("/api/evaluate", handleEvaluate);
app.post("/api/chat", handleChat);
app.post("/api/resolve", handleResolve);
app.get("/api/rules", handleGetRules);
app.post("/api/rules", handleSaveRules);
app.get("/api/rules/advisor", handleGetPolicyStrategies);
app.post("/api/rules/reset-daily-spend", handleResetDailySpend);

// Chat session routes
app.get("/api/chat/sessions", handleListSessions);
app.get("/api/chat/sessions/:sessionId", handleGetSession);
app.post("/api/chat/sessions", handleSaveSession);
app.delete("/api/chat/sessions/:sessionId", handleDeleteSession);

// Campaign Orchestrator routes
app.get("/api/campaigns", handleListCampaigns);
app.post("/api/campaigns/generate", handleGenerateCampaigns);
app.post("/api/campaigns/activate", handleActivateCampaign);
app.post("/api/campaigns/deactivate", handleDeactivateCampaign);

// Health check endpoints for Render / cloud monitoring
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "sentrypay-agent-gateway-backend" });
});

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 SentryPay Backend server listening on port ${PORT}`);
  });
}
