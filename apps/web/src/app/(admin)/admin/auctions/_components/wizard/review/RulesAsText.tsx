'use client';

import { ChevronDown } from 'lucide-react';
import type { WizardState } from '../../../_lib/wizard/types';
import { exampleSentence, type RulesSection } from './rules';

/** Collapsible plain-text version of the auction rules. */
export function RulesAsText({ sections, state }: { sections: RulesSection[]; state: WizardState }) {
  return (
    <details className="group border-t border-border">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium text-foreground">
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        Show the rules as text
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[11px] font-semibold text-foreground">{section.title}</p>
            <ul className="mt-1 space-y-1 text-[11px] leading-snug text-muted-foreground">
              {section.lines.map((line, index) => (
                <li key={`${section.title}-${index}`}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
        <p className="rounded bg-muted/50 px-2.5 py-1.5 text-[10px] text-muted-foreground">
          EXAMPLE {exampleSentence(state)}
        </p>
      </div>
    </details>
  );
}
