// Client mínimo da API da Apify — usado pela prospecção de leads (Google
// Maps). Sem SDK, mesmo estilo dos outros clients REST do projeto
// (googleCalendar.ts etc). Ator usado: compass/crawler-google-places
// (scraper de Google Maps mais usado/estável na Apify Store).

const ATOR = "compass~crawler-google-places";
const APIFY_BASE = "https://api.apify.com/v2";

export type FiltrosProspeccao = {
  avaliacaoMinima?: number;
  avaliacoesMinimas?: number;
  somenteComTelefone?: boolean;
  somenteComSite?: boolean;
  somenteSemSite?: boolean;
};

export type LeadProspectado = {
  nome: string;
  categoria: string | null;
  endereco: string | null;
  telefone: string | null;
  site: string | null;
  avaliacao: number | null;
  totalAvaliacoes: number | null;
  googleUrl: string | null;
};

/** Dispara o scraper e devolve o runId — o chamador faz polling em consultarRun. */
export async function iniciarBuscaApify(
  token: string,
  nicho: string,
  localizacao: string,
  maxResultados: number
): Promise<{ runId: string; datasetId: string }> {
  const res = await fetch(`${APIFY_BASE}/acts/${ATOR}/runs?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      searchStringsArray: [`${nicho} em ${localizacao}`],
      maxCrawledPlacesPerSearch: Math.min(Math.max(maxResultados, 1), 500),
      language: "pt-BR",
    }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Token da Apify inválido");
    throw new Error(`Apify respondeu ${res.status} ao iniciar a busca`);
  }
  const data = (await res.json()) as { data: { id: string; defaultDatasetId: string } };
  return { runId: data.data.id, datasetId: data.data.defaultDatasetId };
}

export async function consultarRunApify(
  token: string,
  runId: string
): Promise<{ status: "RUNNING" | "READY" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT"; datasetId: string }> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`Apify respondeu ${res.status} ao consultar a busca`);
  const data = (await res.json()) as { data: { status: string; defaultDatasetId: string } };
  return { status: data.data.status as never, datasetId: data.data.defaultDatasetId };
}

type ItemBrutoApify = {
  title?: string;
  categoryName?: string;
  address?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  url?: string;
};

export async function buscarResultadosApify(
  token: string,
  datasetId: string,
  filtros: FiltrosProspeccao = {}
): Promise<LeadProspectado[]> {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`Apify respondeu ${res.status} ao buscar os resultados`);
  const itens = (await res.json()) as ItemBrutoApify[];

  return itens
    .map((item) => ({
      nome: item.title ?? "Sem nome",
      categoria: item.categoryName ?? null,
      endereco: item.address ?? null,
      telefone: item.phoneUnformatted ?? item.phone ?? null,
      site: item.website ?? null,
      avaliacao: typeof item.totalScore === "number" ? item.totalScore : null,
      totalAvaliacoes: typeof item.reviewsCount === "number" ? item.reviewsCount : null,
      googleUrl: item.url ?? null,
    }))
    .filter((l) => {
      if (filtros.avaliacaoMinima && (l.avaliacao ?? 0) < filtros.avaliacaoMinima) return false;
      if (filtros.avaliacoesMinimas && (l.totalAvaliacoes ?? 0) < filtros.avaliacoesMinimas) return false;
      if (filtros.somenteComTelefone && !l.telefone) return false;
      if (filtros.somenteComSite && !l.site) return false;
      if (filtros.somenteSemSite && l.site) return false;
      return true;
    });
}
