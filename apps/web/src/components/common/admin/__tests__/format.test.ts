import { formatCompactMoney, formatMoney, formatTimeLeft } from '../format';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatMoney', () => {
  it('groups INR amounts the Indian way with the rupee symbol', () => {
    expect(formatMoney(8500000)).toBe('₹85,00,000');
  });

  it('accepts numeric strings', () => {
    expect(formatMoney('1275000')).toBe('₹12,75,000');
  });

  it('returns a dash for non-numeric input', () => {
    expect(formatMoney('abc')).toBe('—');
  });
});

describe('formatCompactMoney', () => {
  it('uses lakh and crore for INR', () => {
    expect(formatCompactMoney(8500000)).toBe('₹85L');
    expect(formatCompactMoney(92000000)).toBe('₹9.2Cr');
  });

  it('keeps up to two decimals', () => {
    expect(formatCompactMoney(1275000)).toBe('₹12.75L');
  });

  it('returns a dash for non-numeric input', () => {
    expect(formatCompactMoney('n/a')).toBe('—');
  });
});

describe('formatTimeLeft', () => {
  it('shows days and hours when more than a day is left', () => {
    expect(formatTimeLeft(4 * DAY + 20 * HOUR + 39 * MINUTE)).toBe('4d 20h');
  });

  it('shows hours and minutes within the last day', () => {
    expect(formatTimeLeft(3 * HOUR + 12 * MINUTE + 40 * SECOND)).toBe('3h 12m');
  });

  it('shows padded seconds only within the last hour', () => {
    expect(formatTimeLeft(12 * MINUTE + 5 * SECOND)).toBe('12m 05s');
  });

  it('returns an empty string once the time has passed', () => {
    expect(formatTimeLeft(0)).toBe('');
    expect(formatTimeLeft(-5 * SECOND)).toBe('');
  });
});
