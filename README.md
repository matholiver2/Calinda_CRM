# CALINDA

CRM automatizado com IA para times de vendas pequenos, agora multi-empresa
(multi-tenant). Um agente de IA conversa livremente com o lead pelo
WhatsApp, conduz o funil de vendas e decide quando avançar de etapa — até o
agendamento de uma reunião, quando o vendedor humano assume a conversa.

## Stack

- **Frontend + Backend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Banco de dados**: Prisma ORM + SQLite (dev). Trocar `provider` em
  `prisma/schema.prisma` para `postgresql` e ajustar `DATABASE_URL` para produção.
- **Autenticação**: JWT em cookie httpOnly (e-mail/senha ou Google OAuth), papéis
  `super_admin` (plataforma) / `admin`, `gestor`, `vendedor` (por empresa)
- **Acesso**: somente por convite — um admin convida por e-mail, a pessoa aceita o
  convite (ou entra direto com Google, se o e-mail já tiver convite pendente)
- **UI**: Kanban com drag-and-drop (`@dnd-kit`), gráficos (`recharts`), tema
  claro/escuro/sistema
- **Motor de IA**: usa a API da Anthropic se `ANTHROPIC_API_KEY` estiver definido;
  caso contrário roda em modo demo com um simulador local de conversa (`src/lib/ai/engine.ts`)
- **WhatsApp**: abstração de provedor (`src/lib/whatsapp/provider.ts`) com um mock
  ativo por padrão; implementação de referência para Meta Cloud API incluída

## Multi-tenant (multi-empresa)

Cada **empresa** tem seus próprios usuários, etapas de funil, agentes de IA,
leads e configurações — completamente isolados entre si. Um usuário
**super_admin** não pertence a nenhuma empresa: ele cadastra empresas em
`/empresas` e pode "entrar" em qualquer uma delas para visualizar/operar o
CRM daquela empresa (com um aviso no topo indicando o modo de visualização).

Dentro de uma empresa, o **admin/gestor** convida novos usuários (Configurações
→ Usuários), definindo e-mail e papel (admin/gestor/vendedor). A pessoa
convidada usa o link do convite para criar sua senha, ou entra direto com o
Google usando o mesmo e-mail — a conta é criada automaticamente.

## Como rodar

```bash
npm install
npm run db:push    # cria o banco SQLite a partir do schema
npm run db:seed    # popula dados de demonstração (super admin + 2 empresas)
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Contas de demonstração

| Papel | E-mail | Senha |
|---|---|---|
| Super Admin (todas as empresas) | admin@calinda.com | calinda@12 |
| Admin — empresa CALINDA | admin@calinda-demo.com | calinda123 |
| Gestor — empresa CALINDA | gestor@calinda-demo.com | calinda123 |
| Vendedor — empresa CALINDA | camila@calinda-demo.com | calinda123 |
| Vendedor — empresa CALINDA | bruno@calinda-demo.com | calinda123 |
| Admin — empresa Acme Vendas | admin@acme-demo.com | calinda123 |

O seed também cria um convite pendente de exemplo em Configurações → Usuários
(empresa CALINDA), para testar o fluxo de aceite em `/convite/[token]`.

## Testando o fluxo de automação sem WhatsApp real

Na tela de um lead (ou em "Conversas com IA"), use **"Simular resposta do
lead"** para simular uma mensagem recebida via WhatsApp. Isso aciona o mesmo
caminho que o webhook real usaria: o motor de automação chama a IA, registra a
resposta, decide se avança de etapa e — quando o lead demonstra intenção de
agendar — cria a reunião automaticamente e faz o handoff para um vendedor.

## Variáveis de ambiente (`.env`)

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="troque-em-producao"
ANTHROPIC_API_KEY=""        # opcional — sem isso, usa o simulador local de IA
WHATSAPP_PROVIDER="mock"    # "meta" para usar a Meta Cloud API
WHATSAPP_TOKEN=""
WHATSAPP_PHONE_ID=""
GOOGLE_CLIENT_ID=""         # opcional — sem isso, o botão "Entrar com Google" fica oculto
GOOGLE_CLIENT_SECRET=""
```

## Estrutura

```
prisma/schema.prisma          # modelo de dados (empresas, usuários, convites, etapas, leads, mensagens, reuniões, agentes de IA)
prisma/seed.ts                # dados de demonstração
src/lib/ai/engine.ts          # motor de IA (Anthropic ou simulador local)
src/lib/whatsapp/provider.ts  # abstração de provedor de WhatsApp
src/lib/googleAuth.ts         # login com Google (OAuth 2.0, sem SDK)
src/lib/tenant.ts             # resolução de empresa ativa (multi-tenant)
src/lib/conversationService.ts # orquestra: mensagem recebida -> IA -> transição de etapa
src/app/api/                  # endpoints REST (auth, convites, empresas, leads, etapas, webhooks, dashboard, relatórios...)
src/app/empresas/             # tela do super_admin: listar/criar empresas e "entrar" nelas
src/app/convite/[token]/      # tela pública de aceite de convite
src/app/(app)/                # telas autenticadas e escopadas por empresa (dashboard, funil, leads, conversas, remarketing, relatórios, configurações)
```

## Fases

Esta é a **Fase 1 (MVP)** do descritivo técnico original, estendida com
multi-tenant, convites e login social. A **Fase 2** (gestão de preços/planos,
timeline avançada do cliente, relatórios de performance mais profundos,
configuração avançada de agentes sem suporte técnico) fica para uma próxima
iteração.
