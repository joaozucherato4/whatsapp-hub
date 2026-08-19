import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";

import { authMiddleware } from "./auth.js";
import { initWs } from "./ws.js";

import authRoutes from "./routes/auth.js";
import instancesRoutes from "./routes/instances.js";
import conversationsRoutes from "./routes/conversations.js";
import webhooksRoutes from "./routes/webhooks.js";
import templatesRoutes from "./routes/templates.js";
import webhookInfoRoutes from "./routes/webhook-info.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Publicas
app.use("/auth", authRoutes);
app.use("/webhooks", webhooksRoutes); // Evolution + Hotmart + Kiwify validam por token proprio

// Protegidas (painel)
app.use("/api/instances", authMiddleware, instancesRoutes);
app.use("/api/conversations", authMiddleware, conversationsRoutes);
app.use("/api/templates", authMiddleware, templatesRoutes);
app.use("/api/webhook-info", authMiddleware, webhookInfoRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
initWs(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
