import type { PropertyType, DataType, PropertyDef, ValidatorDef } from '@oxneer/api';

export interface KV {
  key: string;
  value: string;
}

export const PROPERTY_TYPES: KV[] = [
  { key: 'SIMPLE_PROPERTY', value: 'Simple' },
  { key: 'COMPOSITE_PROPERTY', value: 'Composite' },
  { key: 'COMPLEX_PROPERTY', value: 'Complex' },
  { key: 'LIST_PROPERTY', value: 'List' },
];

export const HAS_CHILDREN: PropertyType[] = ['COMPOSITE_PROPERTY', 'LIST_PROPERTY'];

export function emptyProperty(dataTypes: KV[]): PropertyDef {
  return {
    type: 'SIMPLE_PROPERTY',
    name: '',
    label: '',
    dataType: (dataTypes[0]?.key ?? 'STRING') as DataType,
    validators: [],
  };
}

/** Extract the plain enum key from either a string "STRING" or an object {STRING: "Text"}. */
export function extractDataTypeKey(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') return Object.keys(raw as object)[0] ?? '';
  return '';
}

/** Normalize raw API properties: resolve object-shaped dataType/validator.type to plain strings. */
export function normalizeProperties(properties: PropertyDef[]): PropertyDef[] {
  return properties.map(normalizeProperty);
}

function normalizeProperty(prop: PropertyDef): PropertyDef {
  const dataType = extractDataTypeKey(prop.dataType as unknown) as DataType;
  const validators = (prop.validators ?? []).map((v) => ({
    ...v,
    type: extractValidatorType(v.type) as ValidatorDef['type'],
  }));
  return {
    ...prop,
    dataType,
    validators,
    value: prop.value ? prop.value.map(normalizeProperty) : prop.value,
    subProperties: prop.subProperties ? normalizeProperty(prop.subProperties) : prop.subProperties,
  };
}

/** Strip dataType from any property whose type is a container (HAS_CHILDREN), recursively. */
export function sanitizeProperties(properties: PropertyDef[]): PropertyDef[] {
  return properties.map(sanitizeProperty);
}

/** Build a backend-safe create/update payload from a managed type returned by the API. */
export function prepareManagedTypeForCreate<
  T extends {
    name: string;
    description?: string;
    type: string;
    tags?: string[];
    properties?: PropertyDef[];
  },
>(
  managedType: T,
): {
  name: string;
  description: string;
  type: T['type'];
  tags?: string[];
  properties: PropertyDef[];
} {
  return {
    name: managedType.name,
    description: managedType.description ?? '',
    type: managedType.type,
    tags: managedType.tags?.length ? managedType.tags : undefined,
    properties: sanitizeProperties(managedType.properties ?? []),
  };
}

/** Extract a plain string type key from whatever the server/state gives us. */
function extractValidatorType(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj['type'] === 'string') return obj['type'].trim();
    const firstKey = Object.keys(obj)[0];
    if (firstKey) return firstKey.trim();
  }
  return '';
}

/** Strip validators with no type and omit empty arrays recursively. */
function sanitizeProperty(prop: PropertyDef): PropertyDef {
  const isContainer = HAS_CHILDREN.includes(prop.type);

  const validators = (prop.validators ?? [])
    .map((v) => {
      const typeKey = extractValidatorType(v.type);
      if (!typeKey) return null;
      return {
        type: typeKey as unknown as ValidatorDef['type'],
        ...(v.message && String(v.message).trim() ? { message: String(v.message).trim() } : {}),
        ...(v.max !== undefined && v.max !== '' ? { max: v.max } : {}),
        ...(v.min !== undefined && v.min !== '' ? { min: v.min } : {}),
        ...(v.regex !== undefined && v.regex !== '' ? { regex: v.regex } : {}),
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return {
    ...prop,
    ...(isContainer
      ? { dataType: undefined as unknown as DataType }
      : { dataType: extractDataTypeKey(prop.dataType) as DataType }),
    validators: validators.length > 0 ? validators : undefined,
    value: prop.value ? prop.value.map(sanitizeProperty) : undefined,
    subProperties: prop.subProperties ? sanitizeProperty(prop.subProperties) : undefined,
  };
}
