import { auctionTiming } from '../auction-timing';

const NOW = new Date('2026-11-23T10:00:00Z').getTime();
const at = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

describe('auctionTiming', () => {
  it('says the schedule is still to come when there is no start', () => {
    expect(auctionTiming({}, NOW)).toMatchObject({ phase: 'unscheduled', timeLeft: '' });
  });

  it('counts down to a start within a day', () => {
    const timing = auctionTiming({ schedule: { startTime: at(3), endTime: at(10) } }, NOW);
    expect(timing).toEqual({ phase: 'upcoming', label: 'Starts in 3h 0m', timeLeft: '3h 0m' });
  });

  it('shows a date for a start more than a day out', () => {
    const timing = auctionTiming({ schedule: { startTime: at(48), endTime: at(60) } }, NOW);
    expect(timing.phase).toBe('upcoming');
    expect(timing.label).toMatch(/^Starts /);
    expect(timing.timeLeft).toBe('');
  });

  it('counts down to the close while live, preferring the extended close', () => {
    const timing = auctionTiming(
      { schedule: { startTime: at(-1), endTime: at(2) }, closesAt: at(5) },
      NOW,
    );
    expect(timing).toEqual({ phase: 'live', label: 'Ends in 5h 0m', timeLeft: '5h 0m' });
  });

  it('reports an auction past its close as ended', () => {
    const timing = auctionTiming({ schedule: { startTime: at(-5), endTime: at(-1) } }, NOW);
    expect(timing.phase).toBe('ended');
    expect(timing.label).toMatch(/^Ended /);
  });
});
