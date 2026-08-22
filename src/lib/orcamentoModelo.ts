// Modelo de orçamento: lista ordenada de LINHAS, cada uma com 1+ itens
// (parágrafo com formatação básica ou imagem) lado a lado, que o usuário
// monta em Orçamentos → Editar modelo, e que é renderizada dentro de todo
// PDF de orçamento gerado. Compartilhado entre o editor (client) e o
// gerador de PDF (server) — só usa regex/string, sem depender de DOM.

export type BlocoParagrafo = { id: string; tipo: "paragrafo"; html: string };
/** larguraPct: largura da imagem em % do espaço da linha (padrão 100 se ausente, pra modelos salvos antes disso existir). */
export type BlocoImagem = { id: string; tipo: "imagem"; dataUrl: string; larguraPct?: number };
export type BlocoConteudo = BlocoParagrafo | BlocoImagem;
export type LinhaModelo = { id: string; itens: BlocoConteudo[] };

/** Mantém só as tags de formatação permitidas (negrito/itálico/sublinhado/quebra de linha), sem atributos. */
export function sanitizarHtmlParagrafo(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, " BR ")
    .replace(/<\/?(b|strong|i|em|u)\b[^>]*>/gi, (m) => {
      const isClose = m.startsWith("</");
      const tag = m.replace(/[</>]/g, "").split(" ")[0].toLowerCase();
      return isClose ? ` C${tag} ` : ` O${tag} `;
    })
    .replace(/<[^>]+>/g, "")
    .replace(/ BR /g, "<br>")
    .replace(/ O(b|strong|i|em|u) /g, "<$1>")
    .replace(/ C(b|strong|i|em|u) /g, "</$1>");
}

export type Run = { texto: string; negrito: boolean; italico: boolean; sublinhado: boolean };

function decodeEntidades(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Converte o HTML sanitizado de um parágrafo em linhas de "runs" com estilo, pra renderizar no editor ou no PDF. */
export function paragrafoParaLinhas(html: string): Run[][] {
  const limpo = sanitizarHtmlParagrafo(html);
  const linhasHtml = limpo.split(/<br\s*\/?>/i);

  return linhasHtml.map((linhaHtml) => {
    const runs: Run[] = [];
    let negrito = 0;
    let italico = 0;
    let sublinhado = 0;
    const regex = /<(\/?)(b|strong|i|em|u)>|([^<]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(linhaHtml))) {
      if (m[2]) {
        const tag = m[2].toLowerCase();
        const delta = m[1] === "/" ? -1 : 1;
        if (tag === "b" || tag === "strong") negrito = Math.max(0, negrito + delta);
        else if (tag === "i" || tag === "em") italico = Math.max(0, italico + delta);
        else if (tag === "u") sublinhado = Math.max(0, sublinhado + delta);
      } else if (m[3]) {
        const texto = decodeEntidades(m[3]);
        if (texto) runs.push({ texto, negrito: negrito > 0, italico: italico > 0, sublinhado: sublinhado > 0 });
      }
    }
    return runs;
  });
}

function idAleatorio(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBlocoConteudoValido(b: unknown): b is BlocoConteudo {
  return !!b && typeof b === "object" && ((b as BlocoConteudo).tipo === "paragrafo" || (b as BlocoConteudo).tipo === "imagem") && typeof (b as BlocoConteudo).id === "string";
}

/** Compatibilidade com o campo de texto simples salvo antes desse editor existir. */
export function textoLegadoParaLinhas(texto: string): LinhaModelo[] {
  return texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragrafo, i) => ({
      id: `legado-${i}`,
      itens: [{ id: `legado-item-${i}`, tipo: "paragrafo" as const, html: paragrafo.split("\n").join("<br>") }],
    }));
}

/** Aceita tanto o formato novo (linhas com itens) quanto o formato antigo (array plano de blocos, 1 por linha). */
export function parseLinhasModelo(raw: string | null | undefined): LinhaModelo[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    if (parsed.every((e) => e && typeof e === "object" && Array.isArray(e.itens))) {
      return parsed
        .filter((l) => typeof l.id === "string")
        .map((l) => ({ id: l.id, itens: (l.itens as unknown[]).filter(isBlocoConteudoValido) }))
        .filter((l) => l.itens.length > 0);
    }

    // formato antigo: array plano de blocos -> cada um vira sua própria linha
    return parsed.filter(isBlocoConteudoValido).map((bloco) => ({ id: idAleatorio("linha"), itens: [bloco] }));
  } catch {
    return [];
  }
}
