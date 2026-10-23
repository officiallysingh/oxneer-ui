import type { PriceWindow, ScheduleState, WizardState } from './types';

export function formatMoney(value: string | number, currency = 'INR'): string {
  const amount = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
}

export function formatDateTime(value: string): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatTime(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatShortDate(value: string): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
}

export function parseDuration(duration: string): { hours: number; minutes: number } {
  const h = duration.match(/(\d+)H/);
  const m = duration.match(/(\d+)M/);
  const s = duration.match(/(\d+)S/);
  return {
    hours: h ? Number(h[1]) : 0,
    minutes: m ? Number(m[1]) : s && Number(s[1]) > 0 ? 1 : 0,
  };
}

export function formatDuration(duration: string): string {
  const { hours, minutes } = parseDuration(duration);
  if (duration === 'PT0S') return 'to the close';
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours} h`;
  if (minutes) return `${minutes} min`;
  return 'to the close';
}

export function windowSummary(window: PriceWindow, currency = '₹'): string {
  if (window.type === 'STEP')
    return `${currency}${Number(window.value || 0).toLocaleString('en-IN')} steps`;
  if (window.type === 'RANGE') return `${window.value || 0}–${window.maxValue || 0}%`;
  return `${window.value || 0}%`;
}

export function endTimeFor(schedule: ScheduleState): string {
  if (schedule.endMode === 'FIXED') return schedule.endTime;
  if (!schedule.startTime) return '';
  const date = new Date(schedule.startTime);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(date.getHours() + (parseInt(schedule.durationHours, 10) || 0));
  date.setMinutes(date.getMinutes() + (parseInt(schedule.durationMinutes, 10) || 0));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Latest possible close once a soft-close extension can fire. */
export function latestCloseFor(schedule: ScheduleState): string {
  const closing = endTimeFor(schedule);
  if (!closing || !schedule.softCloseEnabled) return closing;
  const date = new Date(closing);
  if (Number.isNaN(date.getTime())) return closing;
  const extensions = schedule.limitEnabled ? parseInt(schedule.extensionLimit, 10) || 0 : 0;
  date.setMinutes(date.getMinutes() + (parseInt(schedule.extendMinutes, 10) || 0) * extensions);
  return date.toISOString();
}

export function softCloseLabel(schedule: ScheduleState): string {
  if (!schedule.softCloseEnabled) return 'Off';
  return `+${schedule.extendMinutes || 0} min, ${
    schedule.limitEnabled ? `up to ${schedule.extensionLimit || 0} times` : 'no limit'
  }`;
}

export function winWord(state: WizardState): string {
  if (state.offer.mechanism === 'CLOCK') return 'last bidder left';
  return state.basics.direction === 'FORWARD' ? 'bid' : 'ask';
}

export function priceLabel(kth: string): string {
  const rank = parseInt(kth, 10) || 1;
  if (rank === 1) return 'own price';
  if (rank === 2) return '2nd price';
  if (rank === 3) return '3rd price';
  return `${rank}th price`;
}

/** "The highest bid" / "The 2nd-lowest ask" / "Last one left". */
export function winnerBase(state: WizardState): string {
  if (state.offer.mechanism === 'CLOCK') return 'Last one left';
  const kth = parseInt(state.award.winnerKth, 10) || 1;
  const suffix =
    kth === 1
      ? 'highest'
      : kth === 2
        ? '2nd-highest'
        : kth === 3
          ? '3rd-highest'
          : `${kth}th-highest`;
  if (state.basics.direction === 'FORWARD') return `The ${suffix} bid`;
  const reverse =
    kth === 1 ? 'lowest' : kth === 2 ? '2nd-lowest' : kth === 3 ? '3rd-lowest' : `${kth}th-lowest`;
  return `The ${reverse} ask`;
}

export function winnerLabel(state: WizardState): string {
  if (state.offer.mechanism === 'CLOCK') return 'Last one left · clock price';
  return `${winnerBase(state)} · ${priceLabel(state.award.winnerPriceKth)}`;
}

export function tiesLabel(state: WizardState): string {
  if (state.award.ties === 'RANDOM') return 'Picked at random';
  if (state.award.ties === 'REBID') return 'Tied bidders bid again';
  return 'Earliest bid wins';
}

export function noSaleLabel(state: WizardState): string {
  if (state.award.noSale === 'REAUCTION') return 'Re-auction it';
  if (state.award.noSale === 'ACCEPT_BEST') return 'Accept the best bid below the reserve';
  return 'Mark the unit unsold';
}

export function confirmationLabel(state: WizardState): string {
  if (state.award.confirmation === 'MANUAL') {
    return `You confirm it within ${state.award.confirmDays || 0} day${
      state.award.confirmDays === '1' ? '' : 's'
    }`;
  }
  return 'Automatic at the close';
}

export function minimumLabel(state: WizardState): string {
  if (!state.participation.minimumEnabled) return 'Off';
  const { checkDays, checkHours, checkMinutes } = state.participation;
  const parts = [
    Number(checkDays) ? `${checkDays}d` : '',
    Number(checkHours) ? `${checkHours}h` : '',
    Number(checkMinutes) ? `${checkMinutes} min` : '',
  ].filter(Boolean);
  return `${state.participation.minimumCount || 0}, checked ${
    parts.length ? parts.join(' ') : 'at start'
  } before start`;
}

export function offsetDuration(state: ParticipationStateLike): string {
  const days = parseInt(state.checkDays, 10) || 0;
  const hours = parseInt(state.checkHours, 10) || 0;
  const minutes = parseInt(state.checkMinutes, 10) || 0;
  const totalHours = days * 24 + hours;
  if (totalHours && minutes) return `PT${totalHours}H${minutes}M`;
  if (totalHours) return `PT${totalHours}H`;
  if (minutes) return `PT${minutes}M`;
  return 'PT0S';
}

interface ParticipationStateLike {
  checkDays: string;
  checkHours: string;
  checkMinutes: string;
}

/** Human label for a workflow step deadline relative to the auction start. */
export function offsetLabelParts(value: string | undefined, reference = 'start'): string {
  if (!value || value === 'PT0S') return '';
  const days = value.match(/(\d+)D/);
  const hours = value.match(/(\d+)H/);
  const minutes = value.match(/(\d+)M/);
  const parts = [
    days && Number(days[1]) > 0 ? `${days[1]} d` : '',
    hours && Number(hours[1]) > 0 ? `${hours[1]} h` : '',
    minutes && Number(minutes[1]) > 0 ? `${minutes[1]} min` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `${parts.join(' ')} before ${reference}`;
}
