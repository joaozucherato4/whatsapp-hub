import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

export async function login(email, password) {
  const { rows } = await pool.query("SELECT * FROM agents WHERE email=$1", [email]);
  const agent = rows[0];
  if (!agent) return null;
  const ok = await bcrypt.compare(password, agent.password_hash);
  if (!ok) return null;
  const token = jwt.sign({ id: agent.id, name: agent.name, email: agent.email }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
  return { token, agent: { id: agent.id, name: agent.name, email: agent.email } };
}

export async function createAgent(name, email, password) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    "INSERT INTO agents (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email",
    [name, email, hash]
  );
  return rows[0];
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "no token" });
  try {
    const token = header.replace("Bearer ", "");
    req.agent = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
}
