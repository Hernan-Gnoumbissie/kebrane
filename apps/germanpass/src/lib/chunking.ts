/**
 * Chunking ~512 tokens (approximation : 1 token ≈ 4 caractères) avec
 * découpe préférentielle aux frontières de paragraphes puis de phrases,
 * et chevauchement léger pour préserver le contexte.
 */
export type Chunk = { content: string; tokenCount: number; position: number };

const TARGET_TOKENS = 512;
const TARGET_CHARS = TARGET_TOKENS * 4;
const OVERLAP_CHARS = 200;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(raw: string): Chunk[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!text) return [];
  if (text.length <= TARGET_CHARS) {
    return [{ content: text, tokenCount: estimateTokens(text), position: 0 }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let position = 0;

  while (start < text.length) {
    let end = Math.min(start + TARGET_CHARS, text.length);
    if (end < text.length) {
      // frontière de paragraphe, sinon de phrase, sinon d'espace
      const slice = text.slice(start, end);
      const para = slice.lastIndexOf("\n\n");
      const sentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
      const space = slice.lastIndexOf(" ");
      const cut = para > TARGET_CHARS / 2 ? para : sentence > TARGET_CHARS / 2 ? sentence + 1 : space;
      if (cut > 0) end = start + cut;
    }
    const content = text.slice(start, end).trim();
    if (content) {
      chunks.push({ content, tokenCount: estimateTokens(content), position });
      position += 1;
    }
    if (end >= text.length) break;
    start = Math.max(end - OVERLAP_CHARS, start + 1);
  }
  return chunks;
}
