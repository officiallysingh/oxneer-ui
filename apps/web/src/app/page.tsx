'use client';

import AuctionNavbar from '@/components/common/auction/AuctionNavbar';
import HeroSection from '@/components/common/auction/HeroSection';
import HowItWorksSection from '@/components/common/auction/HowItWorksSection';
import AuctionGrid from '@/components/common/auction/AuctionGrid';
import SiteFooter from '@/components/common/SiteFooter';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuctionNavbar />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <AuctionGrid />
      </main>
      <SiteFooter />
    </div>
  );
}
