import Link from 'next/link';

const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Auctions',
    links: [
      { label: 'Browse auctions', href: '/#auctions' },
      { label: 'How it works', href: '/#how-it-works' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Create account', href: '/signup' },
      { label: 'Profile', href: '/profile' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help & contact', href: 'mailto:support@oxneer.com' },
    ],
  },
];

const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center mb-4">
              <img src="/oxneer_logo_light.svg" alt="Oxneer" className="h-7 w-auto dark:hidden" />
              <img
                src="/oxneer_logo_dark.svg"
                alt="Oxneer"
                className="h-7 w-auto hidden dark:block"
              />
            </div>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Auction management and participation — from listing and workflows to live bidding.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="font-body text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {column.title}
              </h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-body text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-muted-foreground">
            © {new Date().getFullYear()} Oxneer Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
