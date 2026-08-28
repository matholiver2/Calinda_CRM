import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Política de Privacidade — CALINDA" };

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-display text-lg font-semibold tracking-[-0.02em] text-fg">CALINDA</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-fg">Política de Privacidade</h1>
          <p className="mt-1 text-sm text-fg-subtle">Última atualização: agosto de 2026</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-fg-muted">
            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">1. Quem somos</h2>
              <p>
                O CALINDA é um CRM (sistema de gestão de relacionamento com clientes) com automação por IA, usado por
                empresas para organizar leads, conversar via WhatsApp e agendar reuniões. Esta política descreve como
                tratamos os dados de quem usa a plataforma (equipes das empresas clientes) e, quando aplicável, dos
                contatos/leads que essas empresas gerenciam no sistema.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">2. Dados que coletamos</h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Dados de conta: nome, e-mail, senha (armazenada de forma criptografada) e papel do usuário na empresa.</li>
                <li>Dados de leads/clientes cadastrados pela empresa: nome, telefone, e-mail e histórico de conversas.</li>
                <li>Mensagens trocadas via integração com WhatsApp, usadas para dar continuidade ao atendimento e permitir a automação por IA.</li>
                <li>Arquivos enviados pela empresa (ex: portfólio, orçamentos) para uso dentro da própria plataforma.</li>
                <li>Dados técnicos básicos de uso (ex: registros de acesso), para segurança e diagnóstico de problemas.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">3. Uso de dados da conta Google</h2>
              <p className="mb-2">
                Quando você conecta sua conta Google ao CALINDA, usamos as permissões concedidas exclusivamente para:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <span className="font-medium text-fg">Login (identidade):</span> confirmar quem você é (nome, e-mail e
                  foto de perfil), pra criar/acessar sua conta no CALINDA.
                </li>
                <li>
                  <span className="font-medium text-fg">Google Agenda (calendar.events):</span> criar, atualizar e
                  cancelar eventos de reunião que você agenda dentro do CALINDA, e sincronizar mudanças feitas
                  diretamente na sua agenda de volta pro sistema. Não acessamos outros eventos ou informações da sua
                  agenda além dos criados pelo próprio CALINDA.
                </li>
                <li>
                  <span className="font-medium text-fg">Gmail (gmail.send):</span> enviar, a seu pedido, e-mails com
                  orçamentos ou arquivos pra um cliente, usando sua própria conta como remetente. Não lemos, buscamos
                  ou armazenamos o conteúdo da sua caixa de entrada — essa permissão só permite enviar, nunca ler.
                </li>
              </ul>
              <p className="mt-2">
                Você pode revogar esse acesso a qualquer momento em{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  myaccount.google.com/permissions
                </a>
                , ou desconectando a integração dentro do próprio CALINDA (Configurações → Integrações).
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">4. Onde os dados ficam armazenados</h2>
              <p>
                Os dados são armazenados em um banco de dados PostgreSQL hospedado pelo Supabase, com acesso
                restrito por autenticação. Arquivos enviados pelas empresas ficam em um armazenamento privado
                (Supabase Storage), isolado por empresa.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">5. Compartilhamento de dados</h2>
              <p>
                Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade. Dados só são
                enviados a serviços estritamente necessários pro funcionamento do CALINDA (ex: provedor de IA para
                gerar respostas automáticas, provedor de WhatsApp para envio/recebimento de mensagens), sempre
                limitados ao necessário pra prestar o serviço.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">6. Retenção e exclusão</h2>
              <p>
                Mantemos os dados enquanto a conta estiver ativa. Você pode solicitar a exclusão da sua conta e dos
                dados associados a qualquer momento pelo contato abaixo.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">7. Seus direitos</h2>
              <p>
                Em conformidade com a LGPD (Lei Geral de Proteção de Dados), você pode solicitar acesso, correção,
                portabilidade ou exclusão dos seus dados a qualquer momento.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-fg">8. Contato</h2>
              <p>
                Dúvidas sobre privacidade ou solicitações relacionadas aos seus dados podem ser enviadas para{" "}
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
