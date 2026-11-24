import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandLogo';

/** What an account lets you do on Oxneer: product facts, not marketing claims. */
const ACCOUNT_LETS_YOU = [
  'Browse live and upcoming auctions',
  'Accept invitations to private auctions',
  'Complete participation steps and place offers',
  'Follow each auction through to award',
];

interface AuthSidePanelProps {
  title: string;
  description: string;
}

/** The left half of the sign-in, sign-up and account-setup screens on wide screens. */
export function AuthSidePanel({ title, description }: AuthSidePanelProps) {
  return (
    <aside className="hidden border-r border-border bg-card lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <Link href="/" className="inline-flex w-fit" aria-label="Oxneer home">
        <BrandLogo className="h-9" />
      </Link>

      <div className="max-w-md">
        <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground text-balance">
          {title}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>

        <ul className="mt-10 space-y-3 border-t border-border pt-8">
          {ACCOUNT_LETS_YOU.map((item) => (
            <li key={item} className="flex items-baseline gap-3 text-sm text-foreground">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-primary"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Oxneer Technologies
      </p>
    </aside>
  );
}
