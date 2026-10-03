// PDF de "Proposta Comercial" — mais persuasivo/estruturado que o orçamento
// simples (src/lib/pdf/orcamentoPdf.tsx): capa, diagnóstico (custo de não
// agir), value stack (itens + bônus), investimento com garantia/urgência e
// fechamento com assinatura. Reaproveita @react-pdf/renderer, já usado pro
// orçamento — sem dependência nova. Estrutura inspirada num gerador de
// propostas genérico, adaptada pra puxar os dados já cadastrados no CALINDA
// (lead/orçamento) em vez de digitação manual.

import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export type DeliverableProposta = { id: string; titulo: string; desc: string; valor: number; bonus?: boolean };

export type DadosPropostaPdf = {
  empresaNome: string;
  empresaLogoUrl: string | null;
  corDestaque: string;
  criadoEm: Date;
  lead: { nome: string; telefone: string; email: string | null };
  consultorNome: string | null;
  validadeDias: number;
  valor: number;
  periodicidadeLabel: string;
  planoNome: string | null;
  diagnostico: string | null;
  deliverables: DeliverableProposta[];
  garantia: string | null;
  urgencia: string | null;
  fechamento: string | null;
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

function gerarStyles(cor: string) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 11, color: "#1A1A1A", fontFamily: "Helvetica" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    logo: { width: 100, height: 36, objectFit: "contain" },
    marca: { fontSize: 18, fontFamily: "Helvetica-Bold", color: cor },
    tituloDoc: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right", color: "#6B6B6B" },
    dataDoc: { fontSize: 9, color: "#9A9A9A", textAlign: "right", marginTop: 2 },

    capaTitulo: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 40, marginBottom: 10, lineHeight: 1.3 },
    capaSub: { fontSize: 12, color: "#4A4A4A", marginBottom: 30, lineHeight: 1.5 },
    capaGrid: { flexDirection: "row", gap: 20, marginTop: 20, borderTop: "1px solid #E5E5E5", paddingTop: 16 },
    capaGridItem: { flex: 1 },
    capaGridLabel: { fontSize: 8, color: "#9A9A9A", textTransform: "uppercase", marginBottom: 3 },
    capaGridValor: { fontSize: 11, fontFamily: "Helvetica-Bold" },

    secaoNumero: { fontSize: 9, color: cor, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    secaoTitulo: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 12 },
    paragrafo: { fontSize: 10.5, lineHeight: 1.6, color: "#2A2A2A" },

    itemLinha: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottom: "1px solid #EEEEEE",
    },
    itemTitulo: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
    itemDesc: { fontSize: 9, color: "#6B6B6B", marginTop: 1 },
    itemValor: { fontSize: 10, fontFamily: "Helvetica-Bold", color: cor },
    itemValorRiscado: { fontSize: 9, color: "#9A9A9A", textDecoration: "line-through" },

    caixaDestaque: { backgroundColor: "#F7F7F5", borderRadius: 10, padding: 18, marginTop: 10 },
    valorTotal: { fontSize: 26, fontFamily: "Helvetica-Bold", color: cor, marginTop: 4 },

    rodape: {
      position: "absolute",
      bottom: 28,
      left: 40,
      right: 40,
      borderTop: "1px solid #EEEEEE",
      paddingTop: 8,
      fontSize: 8,
      color: "#9A9A9A",
      textAlign: "center",
    },
    assinaturas: { flexDirection: "row", gap: 30, marginTop: 50 },
    assinaturaLinha: { flex: 1, borderTop: "1px solid #CCCCCC", paddingTop: 6, fontSize: 9, color: "#6B6B6B" },
  });
}

function Cabecalho({ dados, styles, rotulo }: { dados: DadosPropostaPdf; styles: ReturnType<typeof gerarStyles>; rotulo: string }) {
  return (
    <View style={styles.header}>
      <View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer */}
        {dados.empresaLogoUrl ? <Image src={dados.empresaLogoUrl} style={styles.logo} /> : <Text style={styles.marca}>{dados.empresaNome}</Text>}
      </View>
      <View>
        <Text style={styles.tituloDoc}>{rotulo}</Text>
        <Text style={styles.dataDoc}>{formatarData(dados.criadoEm)}</Text>
      </View>
    </View>
  );
}

function PropostaDocumento({ dados }: { dados: DadosPropostaPdf }) {
  const styles = gerarStyles(dados.corDestaque || "#217940");
  const itensComuns = dados.deliverables.filter((d) => !d.bonus);
  const bonus = dados.deliverables.filter((d) => d.bonus);
  const validoAte = new Date(dados.criadoEm.getTime() + dados.validadeDias * 86_400_000);

  return (
    <Document>
      {/* Página 1 — capa */}
      <Page size="A4" style={styles.page}>
        <Cabecalho dados={dados} styles={styles} rotulo="Proposta Comercial" />
        <Text style={styles.capaTitulo}>Uma proposta feita sob medida para {dados.lead.nome}</Text>
        <Text style={styles.capaSub}>
          Preparada por {dados.empresaNome}
          {dados.consultorNome ? ` — ${dados.consultorNome}` : ""}.
        </Text>
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

        {dados.diagnostico && (
          <View style={{ marginTop: 40 }}>
            <Text style={styles.secaoNumero}>01 · DIAGNÓSTICO</Text>
            <Text style={styles.secaoTitulo}>O que estamos resolvendo</Text>
            <Text style={styles.paragrafo}>{dados.diagnostico}</Text>
          </View>
        )}
        <Text style={styles.rodape}>Proposta gerada automaticamente pelo CALINDA · {dados.empresaNome}</Text>
      </Page>

      {/* Página 2 — value stack + investimento */}
      <Page size="A4" style={styles.page}>
        <Cabecalho dados={dados} styles={styles} rotulo="Proposta Comercial" />

        {dados.deliverables.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text style={styles.secaoNumero}>02 · O QUE ESTÁ INCLUSO</Text>
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
              <View key={item.id} style={[styles.itemLinha, { backgroundColor: "#FBF8F0" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitulo}>🎁 {item.titulo} (bônus)</Text>
                  {item.desc && <Text style={styles.itemDesc}>{item.desc}</Text>}
                </View>
                <Text style={styles.itemValorRiscado}>{formatarMoeda(item.valor)}</Text>
              </View>
            ))}
            <View style={{ marginTop: 10, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 9, color: "#9A9A9A" }}>Valor total se contratado separadamente</Text>
              <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", textDecoration: "line-through", color: "#9A9A9A" }}>
                {formatarMoeda(somaDeliverables(dados.deliverables))}
              </Text>
            </View>
          </View>
        )}

        <View>
          <Text style={styles.secaoNumero}>03 · INVESTIMENTO</Text>
          <Text style={styles.secaoTitulo}>{dados.planoNome ?? "Investimento"}</Text>
          <View style={styles.caixaDestaque}>
            <Text style={{ fontSize: 9, color: "#6B6B6B" }}>Valor</Text>
            <Text style={styles.valorTotal}>
              {formatarMoeda(dados.valor)}
              {dados.periodicidadeLabel}
            </Text>
            {dados.garantia && (
              <Text style={[styles.paragrafo, { marginTop: 12 }]}>🛡️ {dados.garantia}</Text>
            )}
            {dados.urgencia && <Text style={[styles.paragrafo, { marginTop: 6 }]}>⏳ {dados.urgencia}</Text>}
          </View>
        </View>

        {dados.fechamento && (
          <View style={{ marginTop: 30 }}>
            <Text style={styles.paragrafo}>{dados.fechamento}</Text>
            <View style={styles.assinaturas}>
              <Text style={styles.assinaturaLinha}>Pela {dados.empresaNome}</Text>
              <Text style={styles.assinaturaLinha}>De acordo — {dados.lead.nome}</Text>
            </View>
          </View>
        )}

        <Text style={styles.rodape}>Proposta válida até {formatarData(validoAte)} · {dados.empresaNome}</Text>
      </Page>
    </Document>
  );
}

export async function gerarPropostaPdf(dados: DadosPropostaPdf): Promise<Buffer> {
  return renderToBuffer(<PropostaDocumento dados={dados} />);
}
