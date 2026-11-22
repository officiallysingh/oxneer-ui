'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@oxneer/ui';
import { PhrasesInput } from './PhrasesInput';

interface PhraseSearchBarProps {
  phrases: string[];
  onPhrasesChange: (phrases: string[]) => void;
  onSearch: () => void;
  onReset: () => void;
  placeholder?: string;
  /** Extra filter controls rendered between the phrases input and the Search button */
  extraFilters?: React.ReactNode;
  /** Extra controls rendered after the Reset button (e.g. column toggles) */
  children?: React.ReactNode;
}

export function PhraseSearchBar({
  phrases,
  onPhrasesChange,
  onSearch,
  onReset,
  placeholder = 'Type phrase and press Enter...',
  extraFilters,
  children,
}: PhraseSearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[240px]">
        <PhrasesInput value={phrases} onChange={onPhrasesChange} placeholder={placeholder} />
      </div>
      {extraFilters}
      <Button size="sm" onClick={onSearch} className="gap-1.5">
        <Search className="h-3.5 w-3.5" />
        Search
      </Button>
      <Button size="sm" variant="outline" onClick={onReset} className="gap-1.5">
        <X className="h-3.5 w-3.5" />
        Reset
      </Button>
      {children}
    </div>
  );
}
