/** Text helpers for phrase matching. Matching is case-insensitive and ignores
 * differences in quote characters and whitespace. Phrases match whole words
 * only, so "school" does not match "preschool". */

export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePattern(phrase: string) {
  const body = escapeRegExp(normalize(phrase).trim()).replace(/ /g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu");
}

export type PhraseMatch = { phrase: string; index: number; length: number };

/** Returns the first match of each phrase found in the text. */
export function findPhrases(text: string, phrases: string[]): PhraseMatch[] {
  const haystack = normalize(text);
  const matches: PhraseMatch[] = [];
  for (const phrase of phrases) {
    if (!phrase.trim()) continue;
    const re = phrasePattern(phrase);
    const m = re.exec(haystack);
    if (m) matches.push({ phrase, index: m.index, length: m[0].length });
  }
  return matches;
}

/** A short excerpt around a match, for evidence. */
export function excerpt(text: string, match: PhraseMatch, radius = 40): string {
  const normalized = text.normalize("NFKC").replace(/\s+/g, " ");
  const start = Math.max(0, match.index - radius);
  const end = Math.min(normalized.length, match.index + match.length + radius);
  const before = normalized.slice(start, match.index);
  const hit = normalized.slice(match.index, match.index + match.length);
  const after = normalized.slice(match.index + match.length, end);
  return `${start > 0 ? "…" : ""}${before}«${hit}»${after}${end < normalized.length ? "…" : ""}`;
}

export function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function quoteList(phrases: string[]) {
  return phrases.map((p) => `“${p}”`).join(", ");
}
