'use client';

import { Users, ShieldCheck, UserCheck, UserX, Clock } from 'lucide-react';

interface UsersStatsSummaryProps {
  counts: {
    all: number;
    active: number;
    pending: number;
    disabled: number;
  };
  activeFilter?: string;
  onSelectFilter?: (status: string) => void;
}

export function UsersStatsSummary({
  counts,
  activeFilter = 'ALL',
  onSelectFilter,
}: UsersStatsSummaryProps) {
  const cards = [
    {
      key: 'ALL',
      label: 'Total Users',
      count: counts.all,
      icon: Users,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      key: 'ACTIVE',
      label: 'Active Users',
      count: counts.active,
      icon: UserCheck,
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      key: 'PENDING',
      label: 'Pending Approval',
      count: counts.pending,
      icon: Clock,
      color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    },
    {
      key: 'DISABLED',
      label: 'Disabled / Suspended',
      count: counts.disabled,
      icon: UserX,
      color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
