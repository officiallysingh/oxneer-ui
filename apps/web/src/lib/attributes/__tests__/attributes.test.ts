import type { PropertyDef } from '@repo/api';
import { inactiveReason, resolveAttrs } from '../protocol';
import {
  coerceValue,
  embeddedToValues,
  formatPrice,
  formatValue,
  joinMulti,
  mergeDefs,
  parseOptions,
  parseToneMap,
  safeHref,
  splitMulti,
  truncate,
} from '../values';

describe('resolveAttrs', () => {
  it('keeps keys for the surface and drops the other surface and unknown keys', () => {
    const attrs = { 'form:size': 'lg', 'list:prefix': '#', 'html:min': '1', 'x:custom': 'y' };
    expect(resolveAttrs(attrs, 'form', 'COMPLEX_PROPERTY')).toEqual({
      'form:size': 'lg',
      'html:min': '1',
    });
    expect(resolveAttrs(attrs, 'list', 'COMPLEX_PROPERTY')).toEqual({
      'list:prefix': '#',
      'html:min': '1',
    });
  });

  it('applies showWhen blocks only when the trigger matches', () => {
    const attrs = { 'list:display': 'text', 'list:badge.color': 'success' };
    expect(resolveAttrs(attrs, 'list', 'COMPLEX_PROPERTY')['list:badge.color']).toBeUndefined();
    const pill = { ...attrs, 'list:display': 'pill' };
    expect(resolveAttrs(pill, 'list', 'COMPLEX_PROPERTY')['list:badge.color']).toBe('success');
  });

  it('applies type-triggered blocks to the right property types, including SET', () => {
    const attrs = { 'list:list.layout': 'bullets', 'list:composite.layout': 'card' };
    expect(resolveAttrs(attrs, 'list', 'SET_PROPERTY')).toEqual({ 'list:list.layout': 'bullets' });
    expect(resolveAttrs(attrs, 'list', 'COMPOSITE_PROPERTY')).toEqual({
      'list:composite.layout': 'card',
    });
  });

  it('explains why a stored key is ignored', () => {
    expect(inactiveReason('list:badge.color', {}, 'COMPLEX_PROPERTY')).toMatch(/list:display/);
    expect(inactiveReason('list:composite.layout', {}, 'COMPLEX_PROPERTY')).toMatch(/type/);
    expect(inactiveReason('foo:bar', {}, 'COMPLEX_PROPERTY')).toMatch(/Custom/);
    expect(inactiveReason('form:size', {}, 'COMPLEX_PROPERTY')).toBeNull();
  });
});

describe('parseOptions', () => {
  it('parses label:value and bare values', () => {
    expect(parseOptions('Active:active, Pending')).toEqual([
      { label: 'Active', value: 'active' },
      { label: 'Pending', value: 'Pending' },
    ]);
  });

  it('splits on the first colon and honours escapes', () => {
    expect(parseOptions('Morning:09:30,A\\, B,10\\:30')).toEqual([
      { label: 'Morning', value: '09:30' },
      { label: 'A, B', value: 'A, B' },
      { label: '10:30', value: '10:30' },
    ]);
  });

  it('returns null for blank input', () => {
    expect(parseOptions('  ')).toBeNull();
    expect(parseOptions(undefined)).toBeNull();
  });
});

describe('multi values and tone maps', () => {
  it('round-trips values containing commas', () => {
    const joined = joinMulti(['a', 'b, c']);
    expect(splitMulti(joined)).toEqual(['a', 'b, c']);
    expect(splitMulti(['x', 'y'])).toEqual(['x', 'y']);
  });

  it('maps values to known tones only', () => {
    expect(parseToneMap('active:success,old:destructive,odd:purple')).toEqual({
      active: 'success',
      old: 'danger',
    });
  });
});

describe('coerceValue', () => {
  const prop = (dataType: string) =>
    ({ type: 'COMPLEX_PROPERTY', name: 'x', label: 'X', dataType }) as PropertyDef;

  it('converts numeric and boolean strings', () => {
    expect(coerceValue(prop('INTEGER'), '42')).toBe(42);
    expect(coerceValue(prop('FLOAT'), '3.5')).toBe(3.5);
    expect(coerceValue(prop('BOOLEAN'), 'true')).toBe(true);
  });

  it('keeps partial input while the user types', () => {
    expect(coerceValue(prop('FLOAT'), '3.')).toBe('3.');
    expect(coerceValue(prop('INTEGER'), '')).toBe('');
    expect(coerceValue(prop('BOOLEAN'), '')).toBe('');
  });
});

describe('formatting', () => {
  it('formats numbers, percentages, bytes and case', () => {
    expect(formatValue('1234567', 'number', { locale: 'en-US' })).toBe('1,234,567');
    expect(formatValue('1234567', 'compact', { locale: 'en-US' })).toBe('1.2M');
    expect(formatValue('12.5', 'percentage', { locale: 'en-US' })).toBe('12.5%');
    expect(formatValue('2048', 'bytes', { locale: 'en-US' })).toBe('2 KB');
    expect(formatValue('hello world', 'capitalize')).toBe('Hello World');
    expect(formatValue('not a number', 'number')).toBe('not a number');
  });

  it('formats relative time', () => {
    const now = Date.parse('2026-01-10T00:00:00Z');
    expect(formatValue('2026-01-08T00:00:00Z', 'relative', { locale: 'en-US', now })).toBe(
      '2 days ago',
    );
  });

  it('formats prices with grouping and currency display', () => {
    expect(formatPrice('139900', { currency: 'INR', locale: 'en-IN' })).toBe('₹1,39,900');
    expect(formatPrice('1000', { currency: 'USD', display: 'code', locale: 'en-US' })).toMatch(
      /USD\s1,000/,
    );
    expect(formatPrice('1000', { currency: 'custom', locale: 'en-US' })).toBe('1,000');
    expect(formatPrice('9.5', { currency: 'EUR', locale: 'en-US' })).toBe('€9.50');
  });

  it('truncates with an ellipsis', () => {
    expect(truncate('abcdefgh', 4)).toBe('abcd…');
    expect(truncate('abc', 0)).toBe('abc');
  });
});

describe('safeHref', () => {
  it('allows web, mail and relative links and blocks script URLs', () => {
    expect(safeHref('https://a.com')).toBe('https://a.com');
    expect(safeHref('example.com/x')).toBe('https://example.com/x');
    expect(safeHref('/docs')).toBe('/docs');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,hi')).toBeNull();
  });
});

describe('embedded listing data', () => {
  const embedded = [
    { type: 'COMPLEX_PROPERTY', name: 'brand', label: 'Brand', value: 'Samsung' },
    {
      type: 'COMPOSITE_PROPERTY',
      name: 'dims',
      label: 'Dimensions',
      value: [{ type: 'COMPLEX_PROPERTY', name: 'width', label: 'Width', value: 7.9 }],
    },
    {
      type: 'LIST_PROPERTY',
      name: 'specs',
      label: 'Specs',
      value: [[{ type: 'COMPLEX_PROPERTY', name: 'k', label: 'K', value: 'v' }], { k: 'w' }],
    },
  ];

  it('normalizes composites and list items to plain objects', () => {
    expect(embeddedToValues(embedded)).toEqual({
      brand: 'Samsung',
      dims: { width: 7.9 },
      specs: [{ k: 'v' }, { k: 'w' }],
    });
  });

  it('keeps managed defs and appends unknown embedded props', () => {
    const defs = [{ type: 'COMPLEX_PROPERTY', name: 'brand', label: 'Make', dataType: 'STRING' }];
    const merged = mergeDefs(defs as PropertyDef[], embedded);
    expect(merged.map((d) => d.name)).toEqual(['brand', 'dims', 'specs']);
    expect(merged[0]!.label).toBe('Make');
    expect(merged[1]!.value?.map((c) => c.name)).toEqual(['width']);
  });
});
