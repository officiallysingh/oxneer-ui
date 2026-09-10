'use client';

import { CSSProperties } from 'react';
import Select, { components } from 'react-select';
import type { StylesConfig, GroupBase, MultiValueRemoveProps } from 'react-select';
import type { CategoryVM } from '@repo/api';

interface Option {
  value: string;
  label: string;
}

interface GroupedOption {
  label: string;
  options: Option[];
}

const groupHeaderStyles: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const groupBadgeStyles: CSSProperties = {
  backgroundColor: 'hsl(var(--muted))',
  borderRadius: '2em',
  color: 'hsl(var(--muted-foreground))',
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 500,
  lineHeight: '1',
  minWidth: 1,
  padding: '0.16em 0.5em',
  textAlign: 'center',
};

/**
 * Builds a MultiValueRemove component that hides the "x" for options whose
 * value is in `lockedValues` — used to keep auto-filled tags/categories
 * (derived from a selected listing) from being manually removed.
 */
export function createLockedMultiValueRemove<
  OptionT extends { value: string },
  GroupT extends GroupBase<OptionT> = GroupBase<OptionT>,
>(lockedValues: string[]) {
  return function LockedMultiValueRemove(props: MultiValueRemoveProps<OptionT, true, GroupT>) {
    if (lockedValues.includes(props.data.value)) return null;
    return <components.MultiValueRemove {...props} />;
  };
}

function formatGroupLabel(group: GroupedOption) {
  return (
    <div style={groupHeaderStyles}>
      <span>{group.label}</span>
      <span style={groupBadgeStyles}>{group.options.length}</span>
    </div>
  );
}

export function makeReactSelectStyles<IsMulti extends boolean = false>(): StylesConfig<
  Option,
  IsMulti,
  GroupBase<Option>
> {
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.3)' : 'none',
      borderRadius: '6px',
      minHeight: '36px',
      fontSize: '14px',
      '&:hover': { borderColor: 'hsl(var(--ring))' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'hsl(var(--primary))'
        : state.isFocused
          ? 'hsl(var(--muted))'
          : 'transparent',
      color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
      fontSize: '13px',
      padding: '6px 12px',
      cursor: 'pointer',
      '&:active': { backgroundColor: 'hsl(var(--primary) / 0.85)' },
    }),
    groupHeading: (base) => ({
      ...base,
      fontSize: '11px',
      fontWeight: '600',
      color: 'hsl(var(--muted-foreground))',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '6px 12px 2px',
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--muted))',
      borderRadius: '9999px',
      padding: '0 2px',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '12px',
      padding: '1px 6px',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      borderRadius: '0 9999px 9999px 0',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'hsl(var(--destructive) / 0.15)',
        color: 'hsl(var(--destructive))',
      },
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '13px',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '13px',
    }),
    input: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '13px',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      padding: '0 6px',
      '&:hover': { color: 'hsl(var(--foreground))' },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      padding: '0 4px',
      cursor: 'pointer',
      '&:hover': { color: 'hsl(var(--foreground))' },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '13px',
    }),
  };
}

type MultiProps = {
  isMulti: true;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Values that were auto-filled from a selected listing — not user-removable */
  lockedValues?: string[];
};

type SingleProps = {
  isMulti?: false;
  value: string;
  onChange: (id: string) => void;
};

type CommonProps = {
  /** Categories with subCategories loaded (pass result of getCategories(true)) */
  categories: CategoryVM[];
  placeholder?: string;
  disabled?: boolean;
  noOptionsMessage?: string;
  instanceId?: string;
};

export type GroupedSubcategorySelectProps = CommonProps & (MultiProps | SingleProps);

export function GroupedSubcategorySelect(props: GroupedSubcategorySelectProps) {
  const {
    categories,
    placeholder,
    disabled,
    noOptionsMessage = 'No sub-categories found',
    instanceId,
  } = props;

  const groupedOptions: GroupedOption[] = categories
    .filter((c) => (c.subCategories?.length ?? 0) > 0)
    .map((c) => ({
      label: c.name,
      options: (c.subCategories ?? []).map((s) => ({ value: s.id, label: s.name })),
    }));

  const allOptions = groupedOptions.flatMap((g) => g.options);
  const portalTarget = typeof document !== 'undefined' ? document.body : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styles = makeReactSelectStyles<any>() as any;

  if (props.isMulti) {
    const selectedOpts = allOptions.filter((o) => props.value.includes(o.value));
    const lockedValues = props.lockedValues ?? [];
    return (
      <Select<Option, true, GroupedOption>
        isMulti
        instanceId={instanceId}
        options={groupedOptions}
        value={selectedOpts}
        onChange={(selected) => {
          const selectedIds = (selected ?? []).map((o) => o.value);
          props.onChange(Array.from(new Set([...lockedValues, ...selectedIds])));
        }}
        formatGroupLabel={formatGroupLabel}
        placeholder={placeholder ?? 'Select sub-categories...'}
        isDisabled={disabled}
        styles={styles}
        menuPortalTarget={portalTarget}
        noOptionsMessage={() => noOptionsMessage}
        components={
          lockedValues.length
            ? {
                MultiValueRemove: createLockedMultiValueRemove<Option, GroupedOption>(lockedValues),
              }
            : undefined
        }
      />
    );
  }

  const selectedOpt = allOptions.find((o) => o.value === props.value) ?? null;
  return (
    <Select<Option, false, GroupedOption>
      isMulti={false}
      instanceId={instanceId}
      options={groupedOptions}
      value={selectedOpt}
      onChange={(selected) => props.onChange(selected?.value ?? '')}
      formatGroupLabel={formatGroupLabel}
      placeholder={placeholder ?? 'Select sub-category...'}
      isDisabled={disabled}
      isClearable
      styles={styles}
      menuPortalTarget={portalTarget}
      noOptionsMessage={() => noOptionsMessage}
    />
  );
}
