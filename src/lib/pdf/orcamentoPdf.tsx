import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { paragrafoParaLinhas, type LinhaModelo } from "@/lib/orcamentoModelo";

const CORES = {
  primaria: "#217940",
  texto: "#172018",
  textoSecundario: "#6B746D",
  borda: "#E1E9DC",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: CORES.texto, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 16,
    borderBottom: `2px solid ${CORES.primaria}`,
  },
  marca: { fontSize: 20, fontFamily: "Helvetica-Bold", color: CORES.primaria },
  marcaComLogo: { fontSize: 13, fontFamily: "Helvetica-Bold", color: CORES.texto, marginTop: 4 },
  logo: { width: 100, height: 40, objectFit: "contain" },
  blocoParagrafo: { marginBottom: 4, lineHeight: 1.5, fontSize: 10, color: CORES.texto },
  blocoImagem: { maxWidth: "100%", maxHeight: 260, marginVertical: 6, objectFit: "contain" },
  linhaModelo: { flexDirection: "row", gap: 12, marginBottom: 4 },
  itemLinha: { flex: 1, minWidth: 0 },
  tituloDoc: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  dataDoc: { fontSize: 10, color: CORES.textoSecundario, textAlign: "right", marginTop: 2 },
  secao: { marginBottom: 20 },
  rotuloSecao: {
    fontSize: 9,
    color: CORES.textoSecundario,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  linha: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: CORES.textoSecundario },
  valor: { fontFamily: "Helvetica-Bold" },
  caixaValor: {
    backgroundColor: "#F3F3F1",
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valorGrande: { fontSize: 22, fontFamily: "Helvetica-Bold", color: CORES.primaria },
  observacoes: { marginTop: 4, lineHeight: 1.5, color: CORES.texto },
  rodape: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: `1px solid ${CORES.borda}`,
    paddingTop: 10,
    fontSize: 9,
    color: CORES.textoSecundario,
    textAlign: "center",
  },
});

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

const PERIODICIDADE_LABEL: Record<string, string> = {
  mensal: "/mês",
  anual: "/ano",
  unico: " (pagamento único)",
};

export type DadosOrcamentoPdf = {
  empresaNome: string;
  empresaLogoUrl: string | null;
  criadoEm: Date;
  lead: { nome: string; telefone: string; email: string | null };
  plano: { nome: string; periodicidade: string } | null;
  valor: number;
  observacoes: string | null;
  linhasModelo: LinhaModelo[];
};

function BlocoParagrafoPdf({ html }: { html: string }) {
  const linhas = paragrafoParaLinhas(html);
  return (
    <Text style={styles.blocoParagrafo}>
      {linhas.map((runs, i) => (
        <Text key={i}>
          {runs.map((run, j) => (
            <Text
              key={j}
              style={{
                fontFamily: run.negrito && run.italico ? "Helvetica-BoldOblique" : run.negrito ? "Helvetica-Bold" : run.italico ? "Helvetica-Oblique" : "Helvetica",
                textDecoration: run.sublinhado ? "underline" : "none",
              }}
            >
              {run.texto}
            </Text>
          ))}
          {i < linhas.length - 1 ? "\n" : ""}
        </Text>
      ))}
    </Text>
  );
}

function OrcamentoDocumento({ dados }: { dados: DadosOrcamentoPdf }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {dados.empresaLogoUrl ? (
              <>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, não é <img> HTML */}
                <Image src={dados.empresaLogoUrl} style={styles.logo} />
                <Text style={styles.marcaComLogo}>{dados.empresaNome}</Text>
              </>
            ) : (
              <Text style={styles.marca}>{dados.empresaNome}</Text>
            )}
          </View>
          <View>
            <Text style={styles.tituloDoc}>Orçamento</Text>
            <Text style={styles.dataDoc}>{formatarData(dados.criadoEm)}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.rotuloSecao}>Cliente</Text>
          <View style={styles.linha}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.valor}>{dados.lead.nome}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Telefone</Text>
            <Text style={styles.valor}>{dados.lead.telefone}</Text>
          </View>
          {dados.lead.email && (
            <View style={styles.linha}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.valor}>{dados.lead.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.secao}>
          <Text style={styles.rotuloSecao}>Proposta</Text>
          {dados.plano && (
            <View style={styles.linha}>
              <Text style={styles.label}>Plano</Text>
              <Text style={styles.valor}>{dados.plano.nome}</Text>
            </View>
          )}
          <View style={styles.caixaValor}>
            <Text style={styles.label}>Valor</Text>
            <Text style={styles.valorGrande}>
              {formatarMoeda(dados.valor)}
              {dados.plano ? PERIODICIDADE_LABEL[dados.plano.periodicidade] ?? "" : ""}
            </Text>
          </View>
        </View>

        {dados.observacoes && (
          <View style={styles.secao}>
            <Text style={styles.rotuloSecao}>Observações</Text>
            <Text style={styles.observacoes}>{dados.observacoes}</Text>
          </View>
        )}

        {dados.linhasModelo.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.rotuloSecao}>Informações</Text>
            {dados.linhasModelo.map((linha) => (
              <View key={linha.id} style={styles.linhaModelo}>
                {linha.itens.map((item) => (
                  <View key={item.id} style={styles.itemLinha}>
                    {item.tipo === "paragrafo" ? (
                      <BlocoParagrafoPdf html={item.html} />
                    ) : (
                      // eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, não é <img> HTML
                      <Image src={item.dataUrl} style={[styles.blocoImagem, { width: `${item.larguraPct ?? 100}%` }]} />
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.rodape}>
          Orçamento gerado automaticamente pelo CALINDA · {dados.empresaNome}
        </Text>
      </Page>
    </Document>
  );
}

export async function gerarOrcamentoPdf(dados: DadosOrcamentoPdf): Promise<Buffer> {
  return renderToBuffer(<OrcamentoDocumento dados={dados} />);
}
