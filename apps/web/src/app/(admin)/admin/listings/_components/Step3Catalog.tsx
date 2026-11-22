'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Search } from 'lucide-react';
import { Button, Label } from '@repo/ui';
import { ManagedTypeVM, ManagedTypeListItemFull, PropertyDef, metadataApi } from '@repo/api';
import ReactSelect from 'react-select';
import type { SingleValue } from 'react-select';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { AttrField } from '@/components/common/attributes/AttrField';

interface TypeOption {
  id: string;
  name: string;
  description?: string;
}

interface Step3Props {
  managedTypeId: string;
  selectedManagedType: ManagedTypeVM | null;
  loadingType: boolean;
  fieldValues: Record<string, unknown>;
  onTypeChange: (id: string) => void;
  onFieldChange: (name: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onCancel: () => void;
  onSkip?: () => void;
  saving: boolean;
  error: string | null;
}

export function Step3Catalog({
  managedTypeId,
  selectedManagedType,
  loadingType,
  fieldValues,
  onTypeChange,
  onFieldChange,
  onSubmit,
  onBack,
  onCancel,
  onSkip,
  saving,
  error,
}: Step3Props) {
  const [searchPhrases, setSearchPhrases] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<ManagedTypeListItemFull[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (phrases: string[]) => {
    setSearching(true);
    try {
      const results = await metadataApi.searchManagedTypeListItems({
        phrases,
        type: 'CATALOGUE',
      });
      setSearchResults(results);
    } catch {
      // silently ignore search errors
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-load all CATALOGUE types on mount
  useEffect(() => {
    doSearch([]);
  }, [doSearch]);

  // Options for react-select: search results + ensure selected type is always visible
  const options: TypeOption[] = (() => {
    const list = searchResults.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));
    // Ensure currently selected type is in the list (important for edit flow)
    if (selectedManagedType && !list.some((o) => o.id === selectedManagedType.id)) {
      list.unshift({
        id: selectedManagedType.id,
        name: selectedManagedType.name,
        description: selectedManagedType.description,
      });
    }
    return list;
  })();

  const selectValue: TypeOption | null =
    managedTypeId && selectedManagedType
      ? {
          id: selectedManagedType.id,
          name: selectedManagedType.name,
          description: selectedManagedType.description,
        }
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Catalog template</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search and select a template, then fill in its fields
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search templates</Label>
            <PhrasesInput
              value={searchPhrases}
              onChange={setSearchPhrases}
              placeholder="Template name or tag and press Enter..."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => doSearch(searchPhrases)}
            disabled={searching}
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Search
          </Button>
        </div>

        {/* Type dropdown */}
        <div className="space-y-1.5">
          <Label>Template</Label>
          <ReactSelect<TypeOption>
            options={options}
            value={selectValue}
            onChange={(opt: SingleValue<TypeOption>) => {
              if (opt) onTypeChange(opt.id);
            }}
            getOptionValue={(o) => o.id}
            getOptionLabel={(o) => o.name}
            formatOptionLabel={(o) => (
              <div className="py-0.5">
                <div className="text-sm font-medium leading-tight">{o.name}</div>
                {o.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                    {o.description}
                  </div>
                )}
              </div>
            )}
            placeholder={searching ? 'Loading...' : 'Select template...'}
            isLoading={searching}
            noOptionsMessage={() => 'No templates found. Try a different search.'}
            styles={{
              control: (base, state) => ({
                ...base,
                backgroundColor: 'hsl(var(--background))',
                borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
                boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
                borderRadius: '0.375rem',
                minHeight: '2.25rem',
                fontSize: '0.875rem',
                '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? 'hsl(var(--primary))'
                  : state.isFocused
                    ? 'hsl(var(--muted))'
                    : 'hsl(var(--background))',
                color: state.isSelected
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--foreground))',
                cursor: 'pointer',
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 4px 16px hsl(var(--foreground)/0.08)',
                zIndex: 50,
              }),
              singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
              input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
              placeholder: (base) => ({
                ...base,
                color: 'hsl(var(--muted-foreground))',
                fontSize: '0.875rem',
              }),
            }}
          />
        </div>

        {loadingType && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading type fields...
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-5">
            {selectedManagedType.description && (
              <p className="text-xs text-muted-foreground">{selectedManagedType.description}</p>
            )}
            {selectedManagedType.properties?.map((prop: PropertyDef) => (
              <AttrField
                key={prop.name}
                prop={prop}
                value={fieldValues[prop.name]}
                onChange={(value) => onFieldChange(prop.name, value)}
              />
            ))}
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">This type has no properties defined.</p>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {onSkip ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={saving}
            className="gap-2"
          >
            Skip <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save listing'
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
