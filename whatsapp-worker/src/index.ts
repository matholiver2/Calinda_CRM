import "dotenv/config";
import { env } from "./env.js";
import { criarApp } from "./httpApi.js";

const app = criarApp();

app.listen(env.port, () => {
  console.log(`[whatsapp-worker] ouvindo na porta ${env.port}`);
});
