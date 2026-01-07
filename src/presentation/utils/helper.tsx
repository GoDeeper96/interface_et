export interface NivelItem {
  texto: string;
  subitems?: NivelItem[];
}
export function parseDetalleActividad(texto: string): NivelItem[] {
  if (!texto) return [];

  // Normalizar saltos reales
  const input = texto.replace(/\r/g, "");

  // Regex para detectar INICIOS válidos de ítems
  const tokenRegex =
    /(^|\n|\s)(\d+\.\s+|[a-zA-Z]\.\s+|-+\s+)/g;

  // Encontrar todos los tokens
  const matches = [...input.matchAll(tokenRegex)];

  const bloques: { tipo: string; contenido: string }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][1].length;
    const end =
      i + 1 < matches.length
        ? matches[i + 1].index!
        : input.length;

    const marcador = matches[i][2].trim();
    const contenido = input.slice(start, end).trim();

    bloques.push({ tipo: marcador, contenido });
  }

  const resultado: NivelItem[] = [];
  let actualNivel1: NivelItem | null = null;

  for (const bloque of bloques) {
    // 🔹 Nivel 1 → 1. 2. 3.
    if (/^\d+\./.test(bloque.tipo)) {
      actualNivel1 = {
        texto: bloque.contenido,
      };
      resultado.push(actualNivel1);
      continue;
    }

    // 🔸 Nivel 2 → a. b. -
    if (
      (/^[a-zA-Z]\./.test(bloque.tipo) || /^-+/.test(bloque.tipo)) &&
      actualNivel1
    ) {
      actualNivel1.subitems ??= [];
      actualNivel1.subitems.push({
        texto: bloque.contenido,
      });
    }
  }
  console.log(resultado)
  return resultado;
}