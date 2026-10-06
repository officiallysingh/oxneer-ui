'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Gavel } from 'lucide-react';
import { Button } from '@repo/ui';

const HeroSection = () => {
  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
              <Gavel className="h-4 w-4 text-primary" />
              <span className="font-body text-xs font-medium tracking-wider text-primary uppercase">
                Auction platform
              </span>
            </div>

            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
              Run &amp;
              <br />
              <span className="text-gradient-gold">Join</span>
              <br />
              Live Auctions
            </h1>

            <p className="mt-6 max-w-md font-body text-lg leading-relaxed text-muted-foreground">
              Discover published auctions, complete participation workflows, and bid with a clear
              end-to-end process built for teams and participants.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="gold" size="lg" className="gap-2 text-base" asChild>
                <a href="#auctions">
                  Explore Auctions
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button variant="gold-outline" size="lg" className="text-base" asChild>
                <a href="#how-it-works">How It Works</a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <FeaturedAuctionCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeaturedAuctionCard = () => {
  return (
    <div className="relative rounded-2xl border border-border bg-gradient-card p-1 shadow-card">
      <div className="overflow-hidden rounded-xl">
        <Image
          src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=500&fit=crop"
          alt="Auction participation illustration"
          width={600}
          height={500}
          className="h-[420px] w-full object-cover"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-emerald/10 px-3 py-1 font-body text-xs font-medium text-emerald">
            ● Open now
          </span>
          <span className="font-body text-sm text-muted-foreground">Browse live listings</span>
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold text-foreground">
          Find your next auction
        </h3>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Filter by category, schedule, and status below
        </p>
        <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">
              Get started
            </p>
            <p className="font-display text-lg font-bold text-primary">Join &amp; participate</p>
          </div>
          <Button variant="gold" size="sm" asChild>
            <Link href="#auctions">View auctions</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
