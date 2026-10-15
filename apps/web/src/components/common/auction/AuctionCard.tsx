import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Clock } from 'lucide-react';
import { Button } from '@repo/ui';
import BidDialog from './BidDialog';

export interface AuctionItem {
  id: string;
  title: string;
  category: string;
  image: string;
  currentBid: number;
  totalBids: number;
  endsAt: Date;
  isLive: boolean;
}

const useCountdown = (targetDate: Date) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
};

const AuctionCard = ({ item, index }: { item: AuctionItem; index: number }) => {
  const [liked, setLiked] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const timeLeft = useCountdown(item.endsAt);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-gold"
      >
        <div className="relative overflow-hidden">
          <Image
            src={item.image}
            alt={item.title}
            width={400}
            height={224}
            className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          <button
            onClick={() => setLiked(!liked)}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/80"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${liked ? 'fill-ruby text-ruby' : 'text-foreground'}`}
            />
          </button>

          {item.isLive && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-success/90 px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
              <span className="font-body text-[10px] font-semibold text-foreground uppercase">
                Live
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          <p className="font-body text-xs font-medium text-primary uppercase tracking-wider">
            {item.category}
          </p>
          <h3 className="mt-1.5 font-display text-lg font-semibold text-foreground line-clamp-1">
            {item.title}
          </h3>

          <div className="mt-3 flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-body text-xs">{timeLeft}</span>
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">
                Current Bid
              </p>
              <p className="font-display text-xl font-bold text-primary">
                ${item.currentBid.toLocaleString()}
              </p>
              <p className="font-body text-[10px] text-muted-foreground">{item.totalBids} bids</p>
            </div>
            <Button variant="gold" size="sm" onClick={() => setBidOpen(true)}>
              Bid Now
            </Button>
          </div>
        </div>
      </motion.div>

      <BidDialog open={bidOpen} onOpenChange={setBidOpen} item={item} />
    </>
  );
};

export default AuctionCard;
