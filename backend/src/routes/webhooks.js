import { Router } from "express";
import { pool } from "../db.js";
import * as evo from "../evolution.js";
import { broadcast } from "../ws.js";

const router = Router();

// ---------- Evolution API: mensagens recebidas no WhatsApp ----------
router.post("/evolution", async (req, res) => {
  try {
    const body = req.body;
    const instanceName = body.instance;
    const msg = body.data;

    if (body.event !== "messages.upsert" || !msg || msg.key?.fromMe) {
      return res.json({ ok: true });
    }

    const { rows: instRows } = await pool.query("SELECT * FROM instances WHERE name=$1", [instanceName]);
    const instance = instRows[0];
    if (!instance) return res.json({ ok: true });

    const jid = msg.key.remoteJid;
    const contactName = msg.pushName || jid;
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "[mensagem nao suportada]";

    const { rows: convRows } = await pool.query(
      `INSERT INTO conversations (instance_id, contact_jid, contact_name)
       VALUES ($1,$2,$3)
       ON CONFLICT (instance_id, contact_jid)
       DO UPDATE SET last_message_at=now(), contact_name=EXCLUDED.contact_name
       RETURNING *`,
      [instance.id, jid, contactName]
    );
    const conv = convRows[0];

    const { rows: msgRows } = await pool.query(
      `INSERT INTO messages (conversation_id, direction, body, status)
       VALUES ($1,'in',$2,'received') RETURNING *`,
      [conv.id, text]
    );

    broadcast({ type: "new_message", conversationId: conv.id, message: msgRows[0], conversation: conv });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

// ---------- Helper: preenche template e envia via WhatsApp ----------
async function sendEventMessage(platform, eventType, firstName, jid, instanceId) {
  const { rows } = await pool.query(
    `SELECT * FROM event_templates WHERE platform=$1 AND event_type=$2 AND active=true
     AND (instance_id=$3 OR instance_id IS NULL) ORDER BY instance_id NULLS LAST LIMIT 1`,
    [platform, eventType, instanceId || null]
  );
  const template = rows[0];
  if (!template || !jid) return;

  const text = template.message_body.replaceAll("{first_name}", firstName || "");

  const { rows: instRows } = await pool.query("SELECT * FROM instances WHERE id=$1", [instanceId]);
  const instanceName = instRows[0]?.name;
  if (!instanceName) return;

  await evo.sendText(instanceName, jid, text);
}

// ---------- Hotmart ----------
router.post("/hotmart", async (req, res) => {
  const token = req.headers["x-webhook-token"] || req.query.token;
  if (token !== process.env.HOTMART_WEBHOOK_TOKEN) return res.status(401).json({ error: "invalid token" });

  const payload = req.body;
  await pool.query(
    "INSERT INTO webhook_events_log (platform, event_type, payload) VALUES ('hotmart',$1,$2)",
    [payload.event, payload]
  );

  const eventMap = {
    PURCHASE_APPROVED: "purchase_approved",
    PURCHASE_CANCELED: "purchase_canceled",
    PURCHASE_REFUNDED: "refund",
    PURCHASE_CHARGEBACK: "chargeback",
    CART_ABANDONMENT: "cart_abandoned",
  };
  const eventType = eventMap[payload.event];

  const firstName = payload.data?.buyer?.name?.split(" ")?.[0];
  const phone = payload.data?.buyer?.checkout_phone || payload.data?.buyer?.phone;
  const jid = phone ? `${phone.replace(/\D/g, "")}@s.whatsapp.net` : null;
  const instanceId = req.query.instance_id; // configurado na URL do webhook por produto/instancia

  if (eventType) {
    try {
      await sendEventMessage("hotmart", eventType, firstName, jid, instanceId);
    } catch (err) {
      console.error("erro ao enviar mensagem hotmart:", err.message);
    }
  }

  res.json({ ok: true });
});

// ---------- Kiwify ----------
router.post("/kiwify", async (req, res) => {
  const token = req.headers["x-webhook-token"] || req.query.token;
  if (token !== process.env.KIWIFY_WEBHOOK_TOKEN) return res.status(401).json({ error: "invalid token" });

  const payload = req.body;
  await pool.query(
    "INSERT INTO webhook_events_log (platform, event_type, payload) VALUES ('kiwify',$1,$2)",
    [payload.webhook_event_type || payload.order_status, payload]
  );

  const eventMap = {
    order_approved: "purchase_approved",
    order_refused: "purchase_canceled",
    order_refunded: "refund",
    chargedback: "chargeback",
    cart_abandoned: "cart_abandoned",
  };
  const eventType = eventMap[payload.webhook_event_type || payload.order_status];

  const firstName = payload.Customer?.full_name?.split(" ")?.[0] || payload.customer_name?.split(" ")?.[0];
  const phone = payload.Customer?.mobile || payload.customer_phone;
  const jid = phone ? `${phone.replace(/\D/g, "")}@s.whatsapp.net` : null;
  const instanceId = req.query.instance_id;

  if (eventType) {
    try {
      await sendEventMessage("kiwify", eventType, firstName, jid, instanceId);
    } catch (err) {
      console.error("erro ao enviar mensagem kiwify:", err.message);
    }
  }

  res.json({ ok: true });
});

export default router;
