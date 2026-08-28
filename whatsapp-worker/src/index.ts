import "dotenv/config";
import { env } from "./env.js";
import { criarApp } from "./httpApi.js";
import { dispararTick } from "./calindaClient.js";

const app = criarApp();

app.listen(env.port, () => {
  console.log(`[whatsapp-worker] ouvindo na porta ${env.port}`);
});

// Ver calindaClient.ts::dispararTick — esse worker é o único processo
// realmente persistente do sistema, então é ele quem garante que tarefas
// agendadas (resposta da IA) rodam na hora certa em produção.
const TICK_INTERVAL_MS = 20_000;
setInterval(() => {
  dispararTick();
}, TICK_INTERVAL_MS);
