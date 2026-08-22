# whatsapp-worker

Processo Node separado do app CALINDA (Next.js). Mantém uma conexão Baileys (WhatsApp não-oficial, via QR code) por empresa e faz a ponte HTTP com o CALINDA — não fica hospedado no Vercel/serverless, precisa rodar 24/7 numa VM.

⚠️ Uso não-oficial do WhatsApp: risco real de banimento do número, aceito conscientemente pelo time.

## Setup

```bash
cd whatsapp-worker
npm install
cp .env.example .env
# edite .env: WORKER_SHARED_SECRET (mesmo valor de WHATSAPP_WORKER_SECRET no .env do CALINDA)
#             CALINDA_BASE_URL (URL pública/da VM onde o CALINDA está rodando)
npm run dev
```

## No app CALINDA

Adicione no `.env` do CALINDA:

```
WHATSAPP_WORKER_URL=http://<host-do-worker>:4001
WHATSAPP_WORKER_SECRET=<mesmo valor do WORKER_SHARED_SECRET>
```

## Produção

```bash
npm run build
npm run start:prod
```

Mantenha o processo vivo com pm2/systemd (ou equivalente já usado na VM) — se o worker cair, as sessões precisam ser reconectadas manualmente (reescanear QR) pela tela Configurações → Integrações do CALINDA.
