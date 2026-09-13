'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownResult {
  timeLeft: string;
  isEnded: boolean;
  isStarting: boolean;
  hours: number;
  minutes: number;
  seconds: number;
}

export function useCountdown(targetDate: Date | string | undefined): CountdownResult {
  const calculate = useCallback((): CountdownResult => {
    const target = targetDate ? new Date(targetDate) : undefined;
    if (!target || isNaN(target.getTime())) {
      return { timeLeft: '—', isEnded: false, isStarting: false, hours: 0, minutes: 0, seconds: 0 };
    }
    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      return {
        timeLeft: 'Ended',
        isEnded: true,
        isStarting: false,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return {
      timeLeft: `${h}h ${m}m ${s}s`,
      isEnded: false,
      isStarting: diff > 0 && h > 24,
      hours: h,
      minutes: m,
      seconds: s,
    };
  }, [targetDate]);

  const [result, setResult] = useState<CountdownResult>(calculate);

  useEffect(() => {
    const tick = () => setResult(calculate());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [calculate]);

  return result;
}

export function useCountdownRange(
  startIso: string | undefined,
  endIso: string | undefined,
): { label: React.ReactNode; status: 'upcoming' | 'live' | 'ended' } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!startIso) {
    return {
      label: <span className="text-muted-foreground text-xs">Not scheduled</span>,
      status: 'upcoming',
    };
  }

  const startMs = new Date(startIso).getTime();
  const endMs = endIso ? new Date(endIso).getTime() : null;

  if (now < startMs) {
    const diff = startMs - now;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    if (diff < 86_400_000) {
      return {
        label: (
          <span className="text-amber-600 dark:text-amber-400 font-medium text-xs tabular-nums">
            Starts in {h}h {m}m {s}s
          </span>
        ),
        status: 'upcoming',
      };
    }
    return {
      label: (
        <span className="text-muted-foreground text-xs">
          {new Date(startIso).toLocaleDateString()}
        </span>
      ),
      status: 'upcoming',
    };
  }

  if (endMs && now < endMs) {
    const diff = endMs - now;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return {
      label: (
        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs tabular-nums">
          Ends in {h}h {m}m {s}s
        </span>
      ),
      status: 'live',
    };
  }

  if (endMs && now >= endMs) {
    return { label: <span className="text-muted-foreground text-xs">Ended</span>, status: 'ended' };
  }

  return {
    label: (
      <span className="text-muted-foreground text-xs">
        {new Date(startIso).toLocaleDateString()}
      </span>
    ),
    status: 'upcoming',
  };
}
