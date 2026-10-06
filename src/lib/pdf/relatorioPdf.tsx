// PDF de relatório — identidade visual da Calinda (verde da marca, mesmo
// tom usado no app: #23864a). Seções escolhidas pelo usuário na tela de
// Relatórios (ver /api/relatorios/conversao/pdf).

import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { DadosRelatorio } from "@/lib/relatorios";

export type SecaoRelatorio = "conversao" | "tempo" | "performance" | "origem";

export type DadosRelatorioPdf = DadosRelatorio & {
  empresaNome: string;
  empresaLogoUrl: string | null;
  geradoEm: Date;
  secoes: SecaoRelatorio[];
};

const VERDE = "#23864a";
const TEXTO = "#172018";
const TEXTO_DIM = "#6B746D";
const BORDA = "#E1E9DC";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, color: TEXTO, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `2px solid ${VERDE}`,
  },
  logo: { width: 100, height: 36, objectFit: "contain" },
  marca: { fontSize: 18, fontFamily: "Helvetica-Bold", color: VERDE },
  tituloDoc: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  dataDoc: { fontSize: 9, color: TEXTO_DIM, textAlign: "right", marginTop: 2 },

  cardsLinha: { flexDirection: "row", gap: 10, marginBottom: 24 },
  card: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: BORDA, padding: 10 },
  cardLabel: { fontSize: 7.5, color: TEXTO_DIM, textTransform: "uppercase", marginBottom: 4 },
  cardValor: { fontSize: 16, fontFamily: "Helvetica-Bold", color: VERDE },

  secao: { marginBottom: 22 },
  secaoTitulo: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 10, color: TEXTO },

  linha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottom: `1px solid ${BORDA}` },
  linhaLabel: { fontSize: 10, color: TEXTO },
  linhaValor: { fontSize: 10, fontFamily: "Helvetica-Bold", color: VERDE },

  barraFundo: { height: 6, borderRadius: 3, backgroundColor: "#F0F3EE", marginTop: 3, overflow: "hidden" },
  barraPreenchida: { height: 6, borderRadius: 3, backgroundColor: VERDE },

  tabelaHeader: { flexDirection: "row", borderBottom: `1px solid ${TEXTO}`, paddingBottom: 6, marginBottom: 4 },
  tabelaHeaderTexto: { fontSize: 8, color: TEXTO_DIM, textTransform: "uppercase" },
  tabelaLinha: { flexDirection: "row", paddingVertical: 6, borderBottom: `1px solid ${BORDA}` },
  tabelaTexto: { fontSize: 9.5, color: TEXTO },

  rodape: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: `1px solid ${BORDA}`,
    paddingTop: 10,
    fontSize: 9,
    color: TEXTO_DIM,
    textAlign: "center",
  },
});

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

function Cabecalho({ dados }: { dados: DadosRelatorioPdf }) {
  return (
    <View style={styles.header}>
      <View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer */}
        {dados.empresaLogoUrl ? <Image src={dados.empresaLogoUrl} style={styles.logo} /> : <Text style={styles.marca}>{dados.empresaNome}</Text>}
      </View>
      <View>
        <Text style={styles.tituloDoc}>Relatório de Vendas</Text>
        <Text style={styles.dataDoc}>Gerado em {formatarData(dados.geradoEm)}</Text>
      </View>
    </View>
  );
}

function Rodape({ dados }: { dados: DadosRelatorioPdf }) {
  return <Text style={styles.rodape}>Relatório gerado automaticamente pelo Calinda · {dados.empresaNome}</Text>;
}

function RelatorioDocumento({ dados }: { dados: DadosRelatorioPdf }) {
  const totalLeads = dados.conversaoPorEtapa[0]?.alcancaram ?? 0;
  const fechados = dados.conversaoPorEtapa[dados.conversaoPorEtapa.length - 1]?.alcancaram ?? 0;
  const taxaConversao = totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0;
  const tempoMedioGeral =
    dados.tempoMedioPorEtapa.length > 0
      ? Math.round(dados.tempoMedioPorEtapa.reduce((s, e) => s + e.horasMedia, 0) / dados.tempoMedioPorEtapa.length)
      : 0;

  const maxHoras = Math.max(1, ...dados.tempoMedioPorEtapa.map((e) => e.horasMedia));
  const origensOrdenadas = [...dados.origemLeads].sort((a, b) => b.total - a.total);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Cabecalho dados={dados} />

        <View style={styles.cardsLinha}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total de Leads</Text>
            <Text style={styles.cardValor}>{totalLeads.toLocaleString("pt-BR")}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Taxa de Conversão</Text>
            <Text style={styles.cardValor}>{taxaConversao}%</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tempo Médio Geral</Text>
            <Text style={styles.cardValor}>{tempoMedioGeral}h</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Vendedores Ativos</Text>
            <Text style={styles.cardValor}>{dados.performancePorVendedor.length}</Text>
          </View>
        </View>

        {dados.secoes.includes("conversao") && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Conversão por Etapa</Text>
            {dados.conversaoPorEtapa.map((e) => (
              <View key={e.etapa} style={styles.linha}>
                <Text style={styles.linhaLabel}>{e.etapa}</Text>
                <Text style={styles.linhaValor}>{e.alcancaram} leads</Text>
              </View>
            ))}
          </View>
        )}

        {dados.secoes.includes("tempo") && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Tempo Médio por Etapa</Text>
            {dados.tempoMedioPorEtapa.map((e) => (
              <View key={e.etapa} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.linhaLabel}>{e.etapa}</Text>
                  <Text style={{ fontSize: 9, color: TEXTO_DIM }}>{e.horasMedia}h</Text>
                </View>
                <View style={styles.barraFundo}>
                  <View style={[styles.barraPreenchida, { width: `${Math.min(100, (e.horasMedia / maxHoras) * 100)}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {dados.secoes.includes("performance") && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Performance por Vendedor</Text>
            <View style={styles.tabelaHeader}>
              <Text style={[styles.tabelaHeaderTexto, { flex: 2 }]}>Vendedor</Text>
              <Text style={[styles.tabelaHeaderTexto, { flex: 1 }]}>Leads</Text>
              <Text style={[styles.tabelaHeaderTexto, { flex: 1 }]}>Reuniões</Text>
              <Text style={[styles.tabelaHeaderTexto, { flex: 1, textAlign: "right" }]}>Fechamento</Text>
            </View>
            {dados.performancePorVendedor.map((v) => (
              <View key={v.vendedorId} style={styles.tabelaLinha}>
                <Text style={[styles.tabelaTexto, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{v.nome}</Text>
                <Text style={[styles.tabelaTexto, { flex: 1 }]}>{v.leadsAtribuidos}</Text>
                <Text style={[styles.tabelaTexto, { flex: 1 }]}>{v.reunioesRealizadas}</Text>
                <Text style={[styles.tabelaTexto, { flex: 1, textAlign: "right", color: VERDE, fontFamily: "Helvetica-Bold" }]}>
                  {v.taxaFechamento}%
                </Text>
              </View>
            ))}
            {dados.performancePorVendedor.length === 0 && <Text style={{ fontSize: 9, color: TEXTO_DIM }}>Nenhum vendedor cadastrado.</Text>}
          </View>
        )}

        {dados.secoes.includes("origem") && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Origem dos Leads</Text>
            {origensOrdenadas.map((o) => (
              <View key={o.origem} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.linhaLabel}>{o.origem}</Text>
                  <Text style={{ fontSize: 9, color: TEXTO_DIM }}>
                    {o.total} · {o.percentual}%
                  </Text>
                </View>
                <View style={styles.barraFundo}>
                  <View style={[styles.barraPreenchida, { width: `${o.percentual}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        <Rodape dados={dados} />
      </Page>
    </Document>
  );
}

export async function gerarRelatorioPdf(dados: DadosRelatorioPdf): Promise<Buffer> {
  return renderToBuffer(<RelatorioDocumento dados={dados} />);
}
