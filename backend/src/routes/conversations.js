import { Router } from "express";
import { pool } from "../db.js";
import * as evo from "../evolution.js";
import { broadcast } from "../ws.js";

const router = Router();

// Lista conversas de uma instancia (sidebar)
router.get("/", async (req, res) => {
  const { instance_id } = req.query;
  const { rows } = await pool.query(
    `SELECT c.*, i.name as instance_name, i.country, i.flag_emoji,
       (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_preview
     FROM conversations c
     JOIN instances i ON i.id = c.instance_id
     WHERE ($1::int IS NULL OR c.instance_id = $1)
     ORDER BY c.last_message_at DESC`,
    [instance_id || null]
  );
  res.json(rows);
});

// Mensagens de uma conversa
router.get("/:id/messages", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC",
    [req.params.id]
  );
  res.json(rows);
});

// Atualiza status da conversa (aberto/pendente/resolvido)
router.patch("/:id", async (req, res) => {
  const { status } = req.body;
  const { rows } = await pool.query(
    "UPDATE conversations SET status=$1 WHERE id=$2 RETURNING *",
    [status, req.params.id]
  );
  res.json(rows[0]);
});

// Envia mensagem (agente respondendo pelo painel)
router.post("/:id/messages", async (req, res) => {
  const { body } = req.body;
  const { rows } = await pool.query(
    `SELECT c.*, i.name as instance_name FROM conversations c
     JOIN instances i ON i.id = c.instance_id WHERE c.id=$1`,
    [req.params.id]
  );
  const conv = rows[0];
  if (!conv) return res.status(404).json({ error: "not found" });

  await evo.sendText(conv.instance_name, conv.contact_jid, body);

  const { rows: msgRows } = await pool.query(
    `INSERT INTO messages (conversation_id, direction, body, sent_by_agent_id, status)
     VALUES ($1,'out',$2,$3,'sent') RETURNING *`,
    [conv.id, body, req.agent?.id || null]
  );
  await pool.query("UPDATE conversations SET last_message_at=now() WHERE id=$1", [conv.id]);

  broadcast({ type: "new_message", conversationId: conv.id, message: msgRows[0] });
  res.json(msgRows[0]);
});

export default router;
