/** A sentence with emphasised parts, so plain-language copy can stay in pure
 *  helpers and still render with <strong> where the design bolds key facts. */
export type Phrase = Array<string | { strong: string }>;

export function strong(text: string): { strong: string } {
  return { strong: text };
}

/** The phrase as plain text, e.g. for aria labels and tests. */
export function phraseText(phrase: Phrase): string {
  return phrase.map((part) => (typeof part === 'string' ? part : part.strong)).join('');
}
