import type { ReactNode } from 'react';
import Link from 'next/link';

interface ProfileCardProps {
  title: string;
  /** Optional header link, e.g. "Edit" → the edit page. */
  action?: { label: string; href: string };
  children: ReactNode;
}

/** A titled card on the full profile page. */
export function ProfileCard({ title, action, children }: ProfileCardProps) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center border-b border-border px-5 py-4">
        <h2 className="flex-1 font-display text-base font-semibold">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="text-[13px] font-medium text-primary underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
