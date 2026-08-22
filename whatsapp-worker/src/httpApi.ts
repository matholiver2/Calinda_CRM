import express, { type Request, type Response, type NextFunction } from "express";
import { env } from "./env.js";
import * as sessionManager from "./sessionManager.js";

export function criarApp() {
  const app = express();
  app.use(express.json({ limit: "15mb" })); // PDFs em base64 podem passar do limite padrão de 100kb

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers["x-worker-secret"] !== env.workerSecret) {
      res.status(401).json({ erro: "Não autorizado" });
      return;
    }
    next();
  });

  app.post("/sessions/:empresaId/connect", async (req, res) => {
    try {
      await sessionManager.connect(req.params.empresaId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ erro: (err as Error).message });
    }
  });

  app.get("/sessions/:empresaId/qr", async (req, res) => {
    const qr = await sessionManager.getQr(req.params.empresaId);
    res.json({ qr });
  });

  app.get("/sessions/:empresaId/status", (req, res) => {
    res.json(sessionManager.getStatus(req.params.empresaId));
  });

  app.post("/sessions/:empresaId/disconnect", async (req, res) => {
    try {
      await sessionManager.disconnect(req.params.empresaId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ erro: (err as Error).message });
    }
  });

  app.post("/sessions/:empresaId/send", async (req, res) => {
    const { telefone, texto } = req.body ?? {};
    if (!telefone || !texto) {
      res.status(400).json({ erro: "telefone e texto são obrigatórios" });
      return;
    }
    try {
      const resultado = await sessionManager.enviarMensagem(req.params.empresaId, telefone, texto);
      res.json(resultado);
    } catch (err) {
      res.status(502).json({ erro: (err as Error).message });
    }
  });

  app.post("/sessions/:empresaId/send-document", async (req, res) => {
    const { telefone, documentoBase64, fileName, mimetype } = req.body ?? {};
    if (!telefone || !documentoBase64 || !fileName) {
      res.status(400).json({ erro: "telefone, documentoBase64 e fileName são obrigatórios" });
      return;
    }
    try {
      const resultado = await sessionManager.enviarDocumento(
        req.params.empresaId,
        telefone,
        documentoBase64,
        fileName,
        mimetype ?? "application/pdf"
      );
      res.json(resultado);
    } catch (err) {
      res.status(502).json({ erro: (err as Error).message });
    }
  });

  return app;
}
