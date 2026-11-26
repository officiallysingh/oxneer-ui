import { countLabel, filterByName, toggleInSet } from '../tree-helpers';

describe('tree helpers', () => {
  const states = [{ name: 'Haryana' }, { name: 'Himachal Pradesh' }, { name: 'Kerala' }];

  it('filters by name, ignoring case and surrounding spaces', () => {
    expect(filterByName(states, '  h ').map((s) => s.name)).toEqual([
      'Haryana',
      'Himachal Pradesh',
    ]);
    expect(filterByName(states, 'KER').map((s) => s.name)).toEqual(['Kerala']);
  });

  it('keeps everything for a blank query', () => {
    expect(filterByName(states, '   ')).toBe(states);
  });

  it('toggles an id without mutating the original set', () => {
    const original = new Set(['a']);
    expect([...toggleInSet(original, 'b')]).toEqual(['a', 'b']);
    expect([...toggleInSet(original, 'a')]).toEqual([]);
    expect([...original]).toEqual(['a']);
  });

  it('pluralises the count label', () => {
    expect(countLabel(1, 'city', 'cities')).toBe('(1 city)');
    expect(countLabel(0, 'city', 'cities')).toBe('(0 cities)');
  });
});
