import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM event_templates ORDER BY platform, event_type");
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

export default router;
