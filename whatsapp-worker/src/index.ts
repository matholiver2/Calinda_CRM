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
// agendadas (resposta da IA) rodam na hora certa em produção. 45s (não 20s)
// de propósito: cada tick faz o Vercel abrir conexões novas com o Postgres
// via pooler do Supabase, que tem um limite pequeno de conexões — bater
// forte demais aqui já esgotou o pool e derrubou o banco pra tudo (login
// incluso), não só pro que o tick processa.
const TICK_INTERVAL_MS = 45_000;
setInterval(() => {
  dispararTick();
}, TICK_INTERVAL_MS);
