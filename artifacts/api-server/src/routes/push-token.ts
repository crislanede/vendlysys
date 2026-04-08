import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usuariosTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/push-token", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  const { push_token } = req.body ?? {};

  if (!push_token || typeof push_token !== "string") {
    res.status(400).json({ error: "push_token inválido" });
    return;
  }

  await db
    .update(usuariosTable)
    .set({ push_token })
    .where(eq(usuariosTable.id, usuario.id));

  res.json({ ok: true });
});

router.delete("/push-token", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  await db
    .update(usuariosTable)
    .set({ push_token: null })
    .where(eq(usuariosTable.id, usuario.id));
  res.json({ ok: true });
});

export default router;
