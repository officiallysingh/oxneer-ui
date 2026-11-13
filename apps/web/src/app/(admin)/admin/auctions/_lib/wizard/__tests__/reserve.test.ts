/** @jest-environment node */
import { buildReservePricePolicy, reserveFromPolicy } from '../payload';
import { initialWizardState, type BasicsState } from '../types';

const basics = (patch: Partial<BasicsState>): BasicsState => ({
  ...initialWizardState.basics,
  reserveEnabled: true,
  ...patch,
});

describe('reserve price round trip', () => {
  it('forward: sends the margin above the opening price and reads the price back', () => {
    const form = basics({
      direction: 'FORWARD',
      openingPrice: '1000',
      reserveAmount: '1200',
      reserveVisibility: 'MET_ONLY',
    });
    const policy = buildReservePricePolicy(form)!;
    expect(policy).toMatchObject({ value: 200, visibility: 'VISIBLE_ONCE_MET' });
    expect(reserveFromPolicy(policy, '1000', 'FORWARD')).toEqual({
      reserveAmount: '1200',
      reserveVisibility: 'MET_ONLY',
    });
  });

  it('reverse: the maximum price sits below the starting price', () => {
    const form = basics({
      direction: 'REVERSE',
      openingPrice: '5000',
      reserveAmount: '4500',
      reserveVisibility: 'SHOWN',
    });
    const policy = buildReservePricePolicy(form)!;
    expect(policy.value).toBe(500);
    expect(reserveFromPolicy(policy, '5000', 'REVERSE')).toEqual({
      reserveAmount: '4500',
      reserveVisibility: 'SHOWN',
    });
  });

  it('reads a percentage-based reserve and an enum-object visibility', () => {
    expect(
      reserveFromPolicy(
        { basis: 'PERCENTAGE_BASED', value: 10, visibility: { HIDDEN: 'Hidden' } },
        '2000',
        'FORWARD',
      ),
    ).toEqual({ reserveAmount: '2200', reserveVisibility: 'HIDDEN' });
  });

  it('sends nothing when the reserve is switched off', () => {
    expect(buildReservePricePolicy(basics({ reserveEnabled: false }))).toBeUndefined();
  });
});
