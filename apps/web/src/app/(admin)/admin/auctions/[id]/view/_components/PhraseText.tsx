import type { Phrase } from '../_lib/phrase';

/** Renders a plain-language phrase, bolding its key facts. */
export function PhraseText({ phrase }: { phrase: Phrase }) {
  return (
    <>
      {phrase.map((part, index) =>
        typeof part === 'string' ? (
          part
        ) : (
          <strong key={index} className="font-semibold text-foreground">
            {part.strong}
          </strong>
        ),
      )}
    </>
  );
}
