'use client';

import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  placeholder?: string;
}

interface Option {
  label: string;
  value: string;
}

export function TagInput({
  value,
  onChange,
  max = 5,
  placeholder = 'Type and press Enter...',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const options: Option[] = value.map((t) => ({ label: t, value: t }));

  const addTag = (input: string) => {
    const tag = input.trim();
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!inputValue) return;
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleChange = (selected: MultiValue<Option>) => {
    onChange(selected.map((s) => s.value));
  };

  return (
    <CreatableSelect<Option, true>
      isMulti
      menuIsOpen={false}
      components={{ DropdownIndicator: null }}
      inputValue={inputValue}
      onInputChange={(val) => setInputValue(val)}
      value={options}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={() => addTag(inputValue)}
      placeholder={value.length >= max ? `Max ${max} tags` : placeholder}
      isDisabled={false}
      styles={{
        control: (base, state) => ({
          ...base,
          backgroundColor: 'var(--background)',
          borderColor: state.isFocused ? 'var(--primary)' : 'var(--input)',
          boxShadow: state.isFocused
            ? '0 0 0 2px color-mix(in oklab, var(--primary) 20%, transparent)'
            : 'none',
          borderRadius: '0.375rem',
          minHeight: '2.25rem',
          '&:hover': { borderColor: 'color-mix(in oklab, var(--primary) 50%, transparent)' },
        }),
        multiValue: (base) => ({
          ...base,
          backgroundColor: 'color-mix(in oklab, var(--primary) 10%, transparent)',
          border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)',
          borderRadius: '9999px',
          padding: '0 2px',
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: 'var(--primary)',
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '1px 4px',
        }),
        multiValueRemove: (base) => ({
          ...base,
          color: 'var(--primary)',
          borderRadius: '9999px',
          '&:hover': {
            backgroundColor: 'color-mix(in oklab, var(--destructive) 10%, transparent)',
            color: 'var(--destructive)',
          },
        }),
        input: (base) => ({
          ...base,
          color: 'var(--foreground)',
          fontSize: '0.875rem',
        }),
        placeholder: (base) => ({
          ...base,
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem',
        }),
        menu: () => ({ display: 'none' }),
      }}
    />
  );
}
