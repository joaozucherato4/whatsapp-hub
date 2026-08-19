import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  res.json({
    hotmartToken: process.env.HOTMART_WEBHOOK_TOKEN,
    kiwifyToken: process.env.KIWIFY_WEBHOOK_TOKEN,
  });
});

export default router;
