// PDF de Proposta Comercial — documento único e persuasivo (capa, diagnóstico,
// método, value stack, prova social, investimento, fechamento) que substitui
// o antigo orçamento simples. Usa @react-pdf/renderer (já era dependência do
// projeto). Fontes ficam restritas às 3 famílias padrão do PDF (Helvetica,
// Times-Roman, Courier) — carregar fontes do Google Fonts via rede durante a
// geração do PDF (como o app original fazia no navegador) seria um ponto a
// mais de falha num servidor que já teve problema de estabilidade de rede
// (ver histórico de P1001/connection pool), então a "fonte" vira uma escolha
// de família tipográfica, não um par web-font.

import type { ReactElement } from "react";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { TemaProposta, EstiloFonte, SecaoConfig, SectionId } from "@/lib/propostaTipos";

export type DeliverableProposta = { id: string; titulo: string; desc: string; valor: number; bonus?: boolean };
export type EtapaMetodo = { id: string; title: string };
export type Depoimento = { id: string; nome: string; empresa: string; resultado: string; texto: string };

export type DadosPropostaPdf = {
  empresaNome: string;
  empresaLogoUrl: string | null;
  tema: TemaProposta;
  fonte: EstiloFonte;
  corDestaque: string;
  criadoEm: Date;
  lead: { nome: string; telefone: string; email: string | null };
  consultorNome: string | null;
  validadeDias: number;
  valor: number;
  periodicidadeLabel: string;
  planoNome: string | null;

  capaEyebrow: string;
  capaHeadline: string;
  capaSubtitle: string;

  secoes: SecaoConfig[];

  diagnostico: string | null;
  custoMensal: number;

  metodoNome: string | null;
  metodoIntro: string | null;
  metodoEtapas: EtapaMetodo[];
  metodoMarcos: EtapaMetodo[];

  deliverables: DeliverableProposta[];

  provaBio: string | null;
  provaCredenciais: string | null;
  provaMetricas: string | null;
  depoimentos: Depoimento[];

  garantia: string | null;
  urgencia: string | null;

  fechamento: string | null;
  ctaTexto: string | null;
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

function somaDeliverables(itens: DeliverableProposta[]): number {
  return itens.reduce((acc, i) => acc + i.valor, 0);
}

const TEMA_CORES: Record<TemaProposta, { bg: string; ink: string; inkDim: string; borda: string; accentPadrao: string }> = {
  "dark-gold": { bg: "#0a0b0f", ink: "#eee9dc", inkDim: "#9a9689", borda: "#2a2a33", accentPadrao: "#d9a94a" },
  "dark-indigo": { bg: "#08080f", ink: "#ece9fc", inkDim: "#9995c0", borda: "#24243a", accentPadrao: "#7075f0" },
  "light-editorial": { bg: "#f4f1ea", ink: "#17150f", inkDim: "#6b6555", borda: "#e1ddd0", accentPadrao: "#a37918" },
  "minimal-mono": { bg: "#0a0a0a", ink: "#f5f5f5", inkDim: "#9e9e9e", borda: "#2a2a2a", accentPadrao: "#ffffff" },
};

const FONTE_FAMILIA: Record<EstiloFonte, string> = { moderno: "Helvetica", classico: "Times-Roman", mono: "Courier" };
function fonteNegrito(base: string): string {
  if (base === "Times-Roman") return "Times-Bold";
  if (base === "Courier") return "Courier-Bold";
  return "Helvetica-Bold";
}

function gerarStyles(tema: TemaProposta, fonte: EstiloFonte, accent: string) {
  const cores = TEMA_CORES[tema];
  const regular = FONTE_FAMILIA[fonte];
  const bold = fonteNegrito(regular);

  return StyleSheet.create({
    page: { padding: 40, fontSize: 10.5, color: cores.ink, backgroundColor: cores.bg, fontFamily: regular },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    logo: { width: 100, height: 36, objectFit: "contain" },
    marca: { fontSize: 16, fontFamily: bold, color: accent },
    tituloDoc: { fontSize: 9, fontFamily: bold, textAlign: "right", color: cores.inkDim, textTransform: "uppercase", letterSpacing: 1 },
    dataDoc: { fontSize: 9, color: cores.inkDim, textAlign: "right", marginTop: 2 },

    chip: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: accent, paddingVertical: 4, paddingHorizontal: 10, fontSize: 8, color: accent, fontFamily: bold, textTransform: "uppercase", letterSpacing: 1 },
    capaTitulo: { fontSize: 26, fontFamily: bold, marginTop: 16, marginBottom: 10, lineHeight: 1.3, color: cores.ink },
    capaSub: { fontSize: 12, color: cores.inkDim, marginBottom: 30, lineHeight: 1.5 },
    capaGrid: { flexDirection: "row", gap: 20, marginTop: 20, borderTop: `1px solid ${cores.borda}`, paddingTop: 16 },
    capaGridItem: { flex: 1 },
    capaGridLabel: { fontSize: 7.5, color: cores.inkDim, textTransform: "uppercase", marginBottom: 3, letterSpacing: 0.5 },
    capaGridValor: { fontSize: 10.5, fontFamily: bold, color: cores.ink },

    secaoNumero: { fontSize: 8.5, color: accent, fontFamily: bold, marginBottom: 2, letterSpacing: 1 },
    secaoTitulo: { fontSize: 16, fontFamily: bold, marginBottom: 12, color: cores.ink },
    paragrafo: { fontSize: 10.5, lineHeight: 1.6, color: cores.ink },
    paragrafoDim: { fontSize: 9.5, lineHeight: 1.5, color: cores.inkDim },

    cardsLinha: { flexDirection: "row", gap: 10, marginTop: 14 },
    card: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: cores.borda, padding: 12 },
    cardDestaque: { flex: 1, borderRadius: 8, borderWidth: 1.5, borderColor: accent, padding: 12 },
    cardLabel: { fontSize: 8, color: cores.inkDim, textTransform: "uppercase", marginBottom: 4 },
    cardValor: { fontSize: 14, fontFamily: bold, color: cores.ink },

    pilarChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: cores.borda, paddingVertical: 5, paddingHorizontal: 10, marginRight: 6, marginBottom: 6 },
    pilarNumero: { fontSize: 8, fontFamily: bold, color: accent },
    pilarTexto: { fontSize: 9, color: cores.ink },

    marcoLinha: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
    marcoBolinha: { width: 16, height: 16, borderRadius: 8, backgroundColor: accent, alignItems: "center", justifyContent: "center" },
    marcoBolinhaTexto: { fontSize: 8, fontFamily: bold, color: cores.bg },
    marcoTexto: { fontSize: 9.5, color: cores.ink, flex: 1 },

    itemLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottom: `1px solid ${cores.borda}` },
    itemTitulo: { fontSize: 10.5, fontFamily: bold, color: cores.ink },
    itemDesc: { fontSize: 9, color: cores.inkDim, marginTop: 1 },
    itemValor: { fontSize: 10, fontFamily: bold, color: accent },
    itemValorRiscado: { fontSize: 9, color: cores.inkDim, textDecoration: "line-through" },

    avatarCirculo: { width: 40, height: 40, borderRadius: 20, backgroundColor: accent, alignItems: "center", justifyContent: "center" },
    avatarTexto: { fontSize: 16, fontFamily: bold, color: cores.bg },
    depoimentoCard: { borderRadius: 8, borderWidth: 1, borderColor: cores.borda, padding: 12, marginBottom: 8 },
    depoimentoNome: { fontSize: 9.5, fontFamily: bold, color: cores.ink },
    depoimentoMeta: { fontSize: 8, color: accent, marginBottom: 4 },

    caixaDestaque: { backgroundColor: cores.borda, borderRadius: 10, padding: 18, marginTop: 10 },
    valorTotal: { fontSize: 24, fontFamily: bold, color: accent, marginTop: 4 },

    rodape: { position: "absolute", bottom: 28, left: 40, right: 40, borderTop: `1px solid ${cores.borda}`, paddingTop: 8, fontSize: 8, color: cores.inkDim, textAlign: "center" },
    assinaturas: { flexDirection: "row", gap: 30, marginTop: 40 },
    assinaturaLinha: { flex: 1, borderTop: `1px solid ${cores.borda}`, paddingTop: 6, fontSize: 9, color: cores.inkDim },
  });
}

type Styles = ReturnType<typeof gerarStyles>;

function Cabecalho({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  return (
    <View style={styles.header}>
      <View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer */}
        {dados.empresaLogoUrl ? <Image src={dados.empresaLogoUrl} style={styles.logo} /> : <Text style={styles.marca}>{dados.empresaNome}</Text>}
      </View>
      <View>
        <Text style={styles.tituloDoc}>Proposta Comercial</Text>
        <Text style={styles.dataDoc}>{formatarData(dados.criadoEm)}</Text>
      </View>
    </View>
  );
}

function Rodape({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  return <Text style={styles.rodape}>Proposta gerada automaticamente pelo CALINDA · {dados.empresaNome}</Text>;
}

function PaginaDiagnostico({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  if (!dados.diagnostico) return null;
  return (
    <Page size="A4" style={styles.page}>
      <Cabecalho dados={dados} styles={styles} />
      <Text style={styles.secaoNumero}>01 · DIAGNÓSTICO</Text>
      <Text style={styles.secaoTitulo}>O que estamos resolvendo</Text>
      <Text style={styles.paragrafo}>{dados.diagnostico}</Text>
      {dados.custoMensal > 0 && (
        <View style={styles.cardsLinha}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Custo por mês</Text>
            <Text style={styles.cardValor}>{formatarMoeda(dados.custoMensal)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Em 6 meses</Text>
            <Text style={styles.cardValor}>{formatarMoeda(dados.custoMensal * 6)}</Text>
          </View>
          <View style={styles.cardDestaque}>
            <Text style={styles.cardLabel}>Em 12 meses</Text>
            <Text style={styles.cardValor}>{formatarMoeda(dados.custoMensal * 12)}</Text>
          </View>
        </View>
      )}
      <Rodape dados={dados} styles={styles} />
    </Page>
  );
}

function PaginaMetodo({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  if (!dados.metodoNome && dados.metodoEtapas.length === 0) return null;
  return (
    <Page size="A4" style={styles.page}>
      <Cabecalho dados={dados} styles={styles} />
      <Text style={styles.secaoNumero}>02 · MÉTODO</Text>
      <Text style={styles.secaoTitulo}>{dados.metodoNome || "Como funciona"}</Text>
      {dados.metodoIntro && <Text style={[styles.paragrafo, { marginBottom: 14 }]}>{dados.metodoIntro}</Text>}
      {dados.metodoEtapas.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 20 }}>
          {dados.metodoEtapas.map((e, i) => (
            <View key={e.id} style={styles.pilarChip}>
              <Text style={styles.pilarNumero}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={styles.pilarTexto}>{e.title}</Text>
            </View>
          ))}
        </View>
      )}
      {dados.metodoMarcos.length > 0 && (
        <View>
          {dados.metodoMarcos.map((m, i) => (
            <View key={m.id} style={styles.marcoLinha}>
              <View style={styles.marcoBolinha}>
                <Text style={styles.marcoBolinhaTexto}>{i + 1}</Text>
              </View>
              <Text style={styles.marcoTexto}>{m.title}</Text>
            </View>
          ))}
        </View>
      )}
      <Rodape dados={dados} styles={styles} />
    </Page>
  );
}

function PaginaValueStack({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  if (dados.deliverables.length === 0) return null;
  const itensComuns = dados.deliverables.filter((d) => !d.bonus);
  const bonus = dados.deliverables.filter((d) => d.bonus);
  return (
    <Page size="A4" style={styles.page}>
      <Cabecalho dados={dados} styles={styles} />
      <Text style={styles.secaoNumero}>03 · O QUE ESTÁ INCLUSO</Text>
      <Text style={styles.secaoTitulo}>Tudo que você recebe</Text>
      {itensComuns.map((item) => (
        <View key={item.id} style={styles.itemLinha}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitulo}>{item.titulo}</Text>
            {item.desc && <Text style={styles.itemDesc}>{item.desc}</Text>}
          </View>
          <Text style={styles.itemValor}>{formatarMoeda(item.valor)}</Text>
        </View>
      ))}
      {bonus.map((item) => (
        <View key={item.id} style={styles.itemLinha}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitulo}>🎁 {item.titulo} (bônus)</Text>
            {item.desc && <Text style={styles.itemDesc}>{item.desc}</Text>}
          </View>
          <Text style={styles.itemValorRiscado}>{formatarMoeda(item.valor)}</Text>
        </View>
      ))}
      <View style={{ marginTop: 10, alignItems: "flex-end" }}>
        <Text style={[styles.cardLabel, { marginBottom: 2 }]}>Valor total se contratado separadamente</Text>
        <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", textDecoration: "line-through", color: TEMA_CORES[dados.tema].inkDim }}>
          {formatarMoeda(somaDeliverables(dados.deliverables))}
        </Text>
      </View>
      <Rodape dados={dados} styles={styles} />
    </Page>
  );
}

function PaginaProva({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  if (!dados.provaBio && dados.depoimentos.length === 0) return null;
  return (
    <Page size="A4" style={styles.page}>
      <Cabecalho dados={dados} styles={styles} />
      <Text style={styles.secaoNumero}>04 · PROVA SOCIAL</Text>
      <Text style={styles.secaoTitulo}>Quem está por trás</Text>
      {dados.provaBio && (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <View style={styles.avatarCirculo}>
            <Text style={styles.avatarTexto}>{(dados.consultorNome ?? dados.empresaNome).charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitulo}>{dados.consultorNome ?? dados.empresaNome}</Text>
            <Text style={styles.paragrafoDim}>{dados.provaBio}</Text>
            {dados.provaCredenciais && <Text style={[styles.paragrafoDim, { marginTop: 2 }]}>{dados.provaCredenciais}</Text>}
          </View>
        </View>
      )}
      {dados.provaMetricas && (
        <View style={[styles.caixaDestaque, { marginBottom: 16 }]}>
          <Text style={styles.paragrafo}>{dados.provaMetricas}</Text>
        </View>
      )}
      {dados.depoimentos.map((d) => (
        <View key={d.id} style={styles.depoimentoCard}>
          <Text style={styles.depoimentoNome}>{d.nome}{d.empresa ? ` · ${d.empresa}` : ""}</Text>
          {d.resultado && <Text style={styles.depoimentoMeta}>{d.resultado}</Text>}
          <Text style={styles.paragrafoDim}>{d.texto}</Text>
        </View>
      ))}
      <Rodape dados={dados} styles={styles} />
    </Page>
  );
}

function PaginaInvestimento({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  const validoAte = new Date(dados.criadoEm.getTime() + dados.validadeDias * 86_400_000);
  return (
    <Page size="A4" style={styles.page}>
      <Cabecalho dados={dados} styles={styles} />
      <Text style={styles.secaoNumero}>05 · INVESTIMENTO</Text>
      <Text style={styles.secaoTitulo}>{dados.planoNome ?? "Investimento"}</Text>
      <View style={styles.caixaDestaque}>
        <Text style={styles.cardLabel}>Valor</Text>
        <Text style={styles.valorTotal}>
          {formatarMoeda(dados.valor)}
          {dados.periodicidadeLabel}
        </Text>
        {dados.garantia && <Text style={[styles.paragrafo, { marginTop: 12 }]}>🛡️ {dados.garantia}</Text>}
        {dados.urgencia && <Text style={[styles.paragrafo, { marginTop: 6 }]}>⏳ {dados.urgencia}</Text>}
      </View>
      <Text style={[styles.paragrafoDim, { marginTop: 14 }]}>Proposta válida até {formatarData(validoAte)}.</Text>
      <Rodape dados={dados} styles={styles} />
    </Page>
  );
}

function PaginaFechamento({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  if (!dados.fechamento) return null;
  return (
    <Page size="A4" style={styles.page}>
      <Cabecalho dados={dados} styles={styles} />
      <Text style={styles.secaoNumero}>06 · FECHAMENTO</Text>
      <Text style={styles.paragrafo}>{dados.fechamento}</Text>
      {dados.ctaTexto && (
        <View style={[styles.chip, { marginTop: 16, alignSelf: "flex-start" }]}>
          <Text>{dados.ctaTexto}</Text>
        </View>
      )}
      <View style={styles.assinaturas}>
        <Text style={styles.assinaturaLinha}>Pela {dados.empresaNome}</Text>
        <Text style={styles.assinaturaLinha}>De acordo — {dados.lead.nome}</Text>
      </View>
      <Rodape dados={dados} styles={styles} />
    </Page>
  );
}

const PAGINAS_POR_SECAO: Record<SectionId, (props: { dados: DadosPropostaPdf; styles: Styles }) => ReactElement | null> = {
  diagnostico: PaginaDiagnostico,
  metodo: PaginaMetodo,
  valuestack: PaginaValueStack,
  prova: PaginaProva,
  investimento: PaginaInvestimento,
  fechamento: PaginaFechamento,
};

function Capa({ dados, styles }: { dados: DadosPropostaPdf; styles: Styles }) {
  const validoAte = new Date(dados.criadoEm.getTime() + dados.validadeDias * 86_400_000);
  return (
    <Page size="A4" style={styles.page}>
      <Cabecalho dados={dados} styles={styles} />
      <View style={styles.chip}>
        <Text>{dados.capaEyebrow}</Text>
      </View>
      <Text style={styles.capaTitulo}>{dados.capaHeadline}</Text>
      {dados.capaSubtitle && <Text style={styles.capaSub}>{dados.capaSubtitle}</Text>}
      <View style={styles.capaGrid}>
        <View style={styles.capaGridItem}>
          <Text style={styles.capaGridLabel}>Preparado para</Text>
          <Text style={styles.capaGridValor}>{dados.lead.nome}</Text>
        </View>
        <View style={styles.capaGridItem}>
          <Text style={styles.capaGridLabel}>Data</Text>
          <Text style={styles.capaGridValor}>{formatarData(dados.criadoEm)}</Text>
        </View>
        <View style={styles.capaGridItem}>
          <Text style={styles.capaGridLabel}>Válida até</Text>
          <Text style={styles.capaGridValor}>{formatarData(validoAte)}</Text>
        </View>
      </View>
      <Rodape dados={dados} styles={styles} />
    </Page>
  );
}

function PropostaDocumento({ dados }: { dados: DadosPropostaPdf }) {
  const styles = gerarStyles(dados.tema, dados.fonte, dados.corDestaque || TEMA_CORES[dados.tema].accentPadrao);
  const secoesHabilitadas = dados.secoes.filter((s) => s.enabled);

  return (
    <Document>
      <Capa dados={dados} styles={styles} />
      {secoesHabilitadas.map((s) => {
        const Pagina = PAGINAS_POR_SECAO[s.id];
        return <Pagina key={s.id} dados={dados} styles={styles} />;
      })}
    </Document>
  );
}

export async function gerarPropostaPdf(dados: DadosPropostaPdf): Promise<Buffer> {
  return renderToBuffer(<PropostaDocumento dados={dados} />);
}
