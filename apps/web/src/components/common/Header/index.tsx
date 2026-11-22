import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const Header = () => {
  return (
    <header className="h-14 md:h-16 bg-card border-b border-border flex items-center px-4 md:px-8 shadow-xs fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Gavel className="h-5 w-5 text-primary" />
          <span className="font-display text-base font-bold text-foreground">
            HAM<span className="text-gradient-gold">MER</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-6 font-body text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="#auctions" className="hover:text-primary transition-colors">
              Auctions
            </Link>
            <Link href="/login" className="hover:text-primary transition-colors">
              Sign In
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
