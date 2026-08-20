import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { instance_id } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM event_templates
     WHERE ($1::int IS NULL OR instance_id = $1)
     ORDER BY platform, event_type`,
    [instance_id || null]
  );
  res.json(rows);
});

router.patch("/:id", async (req, res) => {
  const { message_body, active, instance_id } = req.body;
  const { rows } = await pool.query(
    `UPDATE event_templates SET
       message_body = COALESCE($1, message_body),
       active = COALESCE($2, active),
       instance_id = $3
     WHERE id=$4 RETURNING *`,
    [message_body, active, instance_id ?? null, req.params.id]
  );
  res.json(rows[0]);
});

// Cria ou atualiza um template especifico de UMA instancia (nao mexe no padrao global das outras)
router.post("/upsert", async (req, res) => {
  const { platform, event_type, instance_id, message_body, active } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO event_templates (platform, event_type, instance_id, message_body, active)
     VALUES ($1,$2,$3,$4,COALESCE($5,true))
     ON CONFLICT (platform, event_type, instance_id)
     DO UPDATE SET message_body = EXCLUDED.message_body, active = EXCLUDED.active
     RETURNING *`,
    [platform, event_type, instance_id ?? null, message_body, active]
  );
  res.json(rows[0]);
});

// Remove a customizacao de uma instancia especifica (volta a usar o padrao global)
router.delete("/instance-override", async (req, res) => {
  const { platform, event_type, instance_id } = req.body;
  await pool.query(
    "DELETE FROM event_templates WHERE platform=$1 AND event_type=$2 AND instance_id=$3",
    [platform, event_type, instance_id]
  );
  res.json({ ok: true });
});

export default router;
