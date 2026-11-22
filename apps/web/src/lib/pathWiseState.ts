import type { ManagedTypeVM, PropertyDef } from '@oxneer/api';

const INTEGER_DATA_TYPES = new Set(['BYTE', 'SHORT', 'INTEGER', 'LONG', 'BIG_INTEGER']);

const DECIMAL_DATA_TYPES = new Set(['FLOAT', 'DOUBLE', 'BIG_DECIMAL']);
const BOOLEAN_DATA_TYPES = new Set(['BOOLEAN']);

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function normalizeValue(prop: PropertyDef, value: unknown): unknown {
  if (isEmptyValue(value)) return undefined;

  if (BOOLEAN_DATA_TYPES.has(prop.dataType)) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    if (typeof value === 'number') return value !== 0;
  }

  if (INTEGER_DATA_TYPES.has(prop.dataType)) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : value;
    }
  }

  if (DECIMAL_DATA_TYPES.has(prop.dataType)) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
  }

  return value;
}

function flattenProperties(
  props: PropertyDef[],
  values: Record<string, unknown>,
  prefix: string,
  out: Record<string, unknown>,
) {
  props.forEach((prop) => {
    const fieldKey = prefix ? `${prefix}.${prop.name}` : prop.name;
    const rawValue = values[prop.name];

    if (prop.type === 'COMPOSITE_PROPERTY') {
      const childValues =
        rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
          ? (rawValue as Record<string, unknown>)
          : {};

      if (Array.isArray(prop.value)) {
        flattenProperties(prop.value, childValues, fieldKey, out);
      }
      return;
    }

    if (prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') {
      const listValue = Array.isArray(rawValue) ? rawValue : [];
      if (listValue.length > 0) {
        out[fieldKey] = listValue;
      }
      return;
    }

    const normalized = normalizeValue(prop, rawValue);
    if (normalized !== undefined) {
      out[fieldKey] = normalized;
    }
  });
}

export function buildPathWiseState(
  values: Record<string, unknown>,
  managedType: ManagedTypeVM | null | undefined,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (!managedType?.properties?.length) {
    return payload;
  }

  flattenProperties(managedType.properties, values, '', payload);
  return payload;
}
