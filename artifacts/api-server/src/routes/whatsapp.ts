import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { zapiConfigurado, enviarMensagem } from "../services/whatsapp.js";
import { enviarLembretes } from "../jobs/lembretes.js";

const router: IRouter = Router();

router.get("/whatsapp/status", requireAuth, (_req, res) => {
  res.json({ configurado: zapiConfigurado() });
});

router.post("/whatsapp/testar", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  if (usuario?.perfil !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem testar." });
    return;
  }

  const { telefone } = req.body;
  if (!telefone) {
    res.status(400).json({ error: "Informe o telefone para teste." });
    return;
  }

  const ok = await enviarMensagem(
    telefone,
    "✅ Teste de conexão VendlySys!\n\nSe você recebeu esta mensagem, a integração com WhatsApp está funcionando corretamente. 🎉"
  );

  res.json({ ok });
});

router.post("/whatsapp/disparar-lembretes", requireAuth, async (req, res): Promise<void> => {
  const usuario = (req as any).usuario;
  if (usuario?.perfil !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem executar." });
    return;
  }

  try {
    await enviarLembretes();
    res.json({ ok: true, mensagem: "Lembretes enviados com sucesso." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao enviar lembretes." });
  }
});

export default router;
