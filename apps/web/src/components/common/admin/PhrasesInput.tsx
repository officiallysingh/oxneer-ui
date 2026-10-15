'use client';

import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select';
import { Search } from 'lucide-react';

interface PhrasesInputProps {
  value: string[];
  onChange: (phrases: string[]) => void;
  placeholder?: string;
  /** Maximum number of phrases; shows an "n/max" counter and blocks further entries. */
  maxPhrases?: number;
  /** Maximum characters per phrase; longer input shows an inline error and isn't added. */
  maxLength?: number;
  /** Shows a leading search icon. */
  showSearchIcon?: boolean;
  ariaLabel?: string;
}

interface Option {
  label: string;
  value: string;
}

export function PhrasesInput({
  value,
  onChange,
  placeholder = 'Type a phrase and press Enter...',
  maxPhrases,
  maxLength,
  showSearchIcon = false,
  ariaLabel,
}: PhrasesInputProps) {
  const [inputValue, setInputValue] = useState('');

  const options: Option[] = value.map((p) => ({ label: p, value: p }));
  const atLimit = maxPhrases !== undefined && value.length >= maxPhrases;
  const tooLong = maxLength !== undefined && inputValue.trim().length > maxLength;
  const invalid = tooLong || (atLimit && inputValue.length > 0);

  const addPhrase = (input: string) => {
    const phrase = input.trim();
    if (!phrase || value.includes(phrase) || atLimit || tooLong) return;
    onChange([...value, phrase]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!inputValue) return;
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addPhrase(inputValue);
    }
  };

  const handleChange = (selected: MultiValue<Option>) => {
    onChange(selected.map((s) => s.value));
  };

  const hasCounter = maxPhrases !== undefined;

  return (
    <div className="space-y-1">
      <div className="relative">
        {showSearchIcon && (
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        <CreatableSelect<Option, true>
          isMulti
          menuIsOpen={false}
          aria-label={ariaLabel}
          aria-invalid={invalid}
          components={{ DropdownIndicator: null }}
          inputValue={inputValue}
          onInputChange={(val) => setInputValue(val)}
          value={options}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => addPhrase(inputValue)}
          placeholder={atLimit ? `Limit of ${maxPhrases} terms reached` : placeholder}
          styles={{
            control: (base, state) => ({
              ...base,
              backgroundColor: 'hsl(var(--background))',
              borderColor: invalid
                ? 'hsl(var(--destructive))'
                : state.isFocused
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--input))',
              boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
              borderRadius: '0.375rem',
              minHeight: '2.5rem',
              paddingLeft: showSearchIcon ? '1.75rem' : undefined,
              paddingRight: hasCounter ? '2.5rem' : undefined,
              '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
            }),
            multiValue: (base) => ({
              ...base,
              backgroundColor: 'hsl(var(--primary) / 0.1)',
              border: '1px solid hsl(var(--primary) / 0.2)',
              borderRadius: '9999px',
              padding: '0 2px',
            }),
            multiValueLabel: (base) => ({
              ...base,
              color: 'hsl(var(--primary))',
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '1px 4px',
            }),
            multiValueRemove: (base) => ({
              ...base,
              color: 'hsl(var(--primary))',
              borderRadius: '9999px',
              '&:hover': {
                backgroundColor: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
              },
            }),
            input: (base) => ({
              ...base,
              color: 'hsl(var(--foreground))',
              fontSize: '0.875rem',
            }),
            placeholder: (base) => ({
              ...base,
              color: 'hsl(var(--muted-foreground))',
              fontSize: '0.875rem',
            }),
            menu: () => ({ display: 'none' }),
          }}
        />
        {hasCounter && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {value.length}/{maxPhrases}
          </span>
        )}
      </div>
      {tooLong && (
        <p className="flex justify-between text-xs font-medium text-destructive" role="alert">
          <span>Each term can be up to {maxLength} characters</span>
          <span className="font-semibold">
            {inputValue.trim().length}/{maxLength}
          </span>
        </p>
      )}
    </div>
  );
}
