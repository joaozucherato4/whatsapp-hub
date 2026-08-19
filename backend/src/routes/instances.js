import { Router } from "express";
import { pool } from "../db.js";
import * as evo from "../evolution.js";

const router = Router();

// Lista todas as instancias
router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM instances ORDER BY created_at DESC");
  res.json(rows);
});

// Cria uma nova instancia (pais + idioma) e ja pede o QR code pra Evolution API
router.post("/", async (req, res) => {
  const { country, language, flag_emoji } = req.body;
  const name = `wh_${country.toLowerCase()}_${Date.now()}`;

  await evo.createInstance(name);

  const { rows } = await pool.query(
    `INSERT INTO instances (name, country, language, flag_emoji, status)
     VALUES ($1,$2,$3,$4,'connecting') RETURNING *`,
    [name, country, language, flag_emoji || null]
  );

  res.json(rows[0]);
});

// Retorna o QR code atual pra escanear
router.get("/:id/qrcode", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM instances WHERE id=$1", [req.params.id]);
  const instance = rows[0];
  if (!instance) return res.status(404).json({ error: "not found" });

  const data = await evo.getQrCode(instance.name);
  res.json(data);
});

// Checa status de conexao (chamar periodicamente do frontend ate status = connected)
router.get("/:id/status", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM instances WHERE id=$1", [req.params.id]);
  const instance = rows[0];
  if (!instance) return res.status(404).json({ error: "not found" });

  const data = await evo.getInstanceStatus(instance.name);
  const status = data?.instance?.state === "open" ? "connected" : instance.status;

  if (status !== instance.status) {
    await pool.query("UPDATE instances SET status=$1 WHERE id=$2", [status, instance.id]);
  }
  res.json({ status });
});

router.delete("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM instances WHERE id=$1", [req.params.id]);
  const instance = rows[0];
  if (!instance) return res.status(404).json({ error: "not found" });

  await evo.deleteInstance(instance.name);
  await pool.query("DELETE FROM instances WHERE id=$1", [instance.id]);
  res.json({ ok: true });
});

export default router;
