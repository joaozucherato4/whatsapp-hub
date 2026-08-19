import { Router } from "express";
import { login } from "../auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await login(email, password);
  if (!result) return res.status(401).json({ error: "credenciais invalidas" });
  res.json(result);
});

export default router;
