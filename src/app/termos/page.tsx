import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Termos de Uso — CALINDA" };

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-display text-lg font-semibold tracking-[-0.02em] text-fg">CALINDA</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-fg">Termos de Uso</h1>
          <p className="mt-1 text-sm text-fg-subtle">Última atualização: agosto de 2026</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-fg-muted">
            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">1. Sobre o serviço</h2>
              <p>
                O CALINDA é um CRM com automação por IA que ajuda empresas a organizar leads, conduzir conversas via
                WhatsApp e agendar reuniões. O acesso é feito por convite, sob responsabilidade da empresa que
                contrata e administra o uso da plataforma.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">2. Conta e acesso</h2>
              <p>
                Cada usuário é responsável por manter a confidencialidade da sua senha e pelas ações realizadas com
                sua conta. O administrador da empresa é responsável por conceder e revogar o acesso de sua equipe.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">3. Uso aceitável</h2>
              <p>
                O CALINDA não deve ser usado para enviar mensagens não solicitadas em massa (spam), conteúdo
                ilegal, ou de qualquer forma que viole os termos de uso do WhatsApp, do Google ou de outros serviços
                integrados. O uso da integração de WhatsApp não-oficial é de responsabilidade do usuário, incluindo
                os riscos associados a essa modalidade de conexão.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">4. Integrações com terceiros</h2>
              <p>
                Ao conectar sua conta Google, você autoriza o CALINDA a usar as permissões concedidas conforme
                descrito na nossa{" "}
                <a href="/privacidade" className="text-accent hover:underline">
                  Política de Privacidade
                </a>
                . Você pode desconectar essas integrações a qualquer momento.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">5. Disponibilidade</h2>
              <p>
                Fazemos o possível para manter o serviço disponível, mas não garantimos operação ininterrupta.
                Funcionalidades que dependem de serviços de terceiros (WhatsApp, Google, provedores de IA) podem
                sofrer instabilidades fora do nosso controle.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">6. Alterações</h2>
              <p>
                Estes termos podem ser atualizados conforme o CALINDA evolui. Mudanças relevantes serão comunicadas
                aos usuários.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">7. Contato</h2>
              <p>
                Dúvidas sobre estes termos podem ser enviadas para{" "}
                <a href="mailto:sysdevenbr@gmail.com" className="text-accent hover:underline">
                  sysdevenbr@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
