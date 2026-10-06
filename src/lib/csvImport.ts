// Parser de CSV pra importação de leads/clientes — escrito à mão (sem lib
// externa) de propósito: o pacote "xlsx" do npm (SheetJS) tem vulnerabilidades
// conhecidas (prototype pollution + ReDoS) sem correção disponível via npm;
// como o formato CSV é simples o bastante pra não precisar de um parser de
// planilha binária, evitamos essa dependência de risco. Quem tiver a
// planilha em .xlsx/.ods exporta como CSV antes de importar (um clique no
// Excel/Sheets/LibreOffice).

export type LinhaCsv = Record<string, string>;

/** Parser CSV básico: aspas duplas (com escaping ""), vírgula ou ponto-e-vírgula como separador (detecta automaticamente pela primeira linha), quebras de linha dentro de campo entre aspas. */
export function parsearCsv(texto: string): LinhaCsv[] {
  // Remove BOM (comum em CSV exportado do Excel) e normaliza quebras de linha.
  const limpo = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const separador = (limpo.split("\n")[0]?.split(";").length ?? 0) > (limpo.split("\n")[0]?.split(",").length ?? 0) ? ";" : ",";

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  const linhasNaoVazias = linhas.filter((l) => l.some((v) => v.trim() !== ""));
  if (linhasNaoVazias.length === 0) return [];

  const cabecalho = linhasNaoVazias[0].map((h) => h.trim());
  return linhasNaoVazias.slice(1).map((valores) => {
    const obj: LinhaCsv = {};
    cabecalho.forEach((h, i) => {
      obj[h] = (valores[i] ?? "").trim();
    });
    return obj;
  });
}

/** Acha o valor de uma linha procurando por qualquer um dos nomes de coluna aceitos (case-insensitive, ignora acento/espaço). */
function normalizarChave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function acharColuna(linha: LinhaCsv, aliases: string[]): string {
  const normalizados = aliases.map(normalizarChave);
  for (const chave of Object.keys(linha)) {
    if (normalizados.includes(normalizarChave(chave))) return linha[chave];
  }
  return "";
}

export type LeadParaImportar = {
  nome: string;
  telefone: string;
  email: string | null;
  origem: string | null;
  observacoes: string | null;
};

const ALIASES = {
  nome: ["nome", "cliente", "name", "nome completo", "contato"],
  telefone: ["telefone", "fone", "celular", "whatsapp", "phone", "numero", "número"],
  email: ["email", "e-mail", "mail"],
  origem: ["origem", "origin", "fonte", "canal"],
  observacoes: ["observacoes", "observações", "obs", "notas", "notes"],
};

/** Converte as linhas cruas do CSV em leads prontos pra importar, mapeando os nomes de coluna por alias. Linhas sem nome ou telefone ficam de fora (quem chama decide como contar/mostrar isso). */
export function mapearLinhasParaLeads(linhas: LinhaCsv[]): { validos: LeadParaImportar[]; semNome: number; semTelefone: number } {
  const validos: LeadParaImportar[] = [];
  let semNome = 0;
  let semTelefone = 0;

  for (const linha of linhas) {
    const nome = acharColuna(linha, ALIASES.nome).trim();
    const telefone = acharColuna(linha, ALIASES.telefone).trim();
    if (!nome) {
      semNome++;
      continue;
    }
    if (!telefone) {
      semTelefone++;
      continue;
    }
    validos.push({
      nome,
      telefone,
      email: acharColuna(linha, ALIASES.email).trim() || null,
      origem: acharColuna(linha, ALIASES.origem).trim() || null,
      observacoes: acharColuna(linha, ALIASES.observacoes).trim() || null,
    });
  }

  return { validos, semNome, semTelefone };
}

export function gerarCsvModelo(): string {
  return "nome,telefone,email,origem,observacoes\nMaria Silva,+5511999999999,maria@email.com,Indicação,Cliente antiga\n";
}
