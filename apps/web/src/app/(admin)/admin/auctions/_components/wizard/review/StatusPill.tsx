'use client';

import type { ReactNode } from 'react';
import { Pill } from '@/components/common/admin/Pill';

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'success' | 'warning' | 'destructive' | 'muted';
}) {
  return (
    <Pill tone={tone} className="h-5 px-2 text-[10px]">
      {children}
    </Pill>
  );
}
