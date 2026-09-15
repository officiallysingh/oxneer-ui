'use client';

import { Building2, Send, Activity, CheckCircle2, XCircle } from 'lucide-react';

interface AuctionsStatsSummaryProps {
  counts: {
    all: number;
    draft: number;
    published: number;
    live: number;
    completed: number;
    cancelled: number;
  };
  activeFilter?: string;
  onSelectFilter?: (status: string) => void;
}

export function AuctionsStatsSummary({
  counts,
  activeFilter = 'ALL',
  onSelectFilter,
}: AuctionsStatsSummaryProps) {
  const cards = [
    {
      key: 'ALL',
      label: 'Total Auctions',
      count: counts.all,
      icon: Building2,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      key: 'PUBLISHED',
      label: 'Published',
      count: counts.published,
      icon: Send,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    },
    {
      key: 'LIVE',
      label: 'Live / Running',
      count: counts.live,
      icon: Activity,
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      count: counts.completed,
      icon: CheckCircle2,
      color: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    },
    {
      key: 'CANCELLED',
      label: 'Cancelled',
      count: counts.cancelled,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter.toUpperCase() === card.key;
        return (
          <button
            key={card.key}
            onClick={() => onSelectFilter?.(card.key)}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-200 ${
              isSelected
                ? 'bg-card border-primary shadow-xs ring-2 ring-primary/20'
                : 'bg-card/60 hover:bg-card border-border/70 hover:border-border'
            }`}
          >
            <div className={`p-2.5 rounded-xl border shrink-0 ${card.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-lg font-bold text-foreground tracking-tight">{card.count}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
