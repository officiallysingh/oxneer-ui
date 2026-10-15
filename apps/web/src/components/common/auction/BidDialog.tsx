import { useState } from 'react';
import { Gavel, TrendingUp, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  toast,
} from '@repo/ui';
import type { AuctionItem } from './AuctionCard';

interface BidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AuctionItem;
}

const BidDialog = ({ open, onOpenChange, item }: BidDialogProps) => {
  const minBid = item.currentBid + 100;
  const [bidAmount, setBidAmount] = useState(minBid.toString());

  const quickBids = [minBid, minBid + 500, minBid + 1000, minBid + 2500];

  const handlePlaceBid = () => {
    const amount = Number(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      toast.error(`Minimum bid is $${minBid.toLocaleString()}`);
      return;
    }
    toast.success(`Bid of $${amount.toLocaleString()} placed on "${item.title}"!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Gavel className="h-5 w-5 text-primary" />
            Place Your Bid
          </DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            {item.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Current bid info */}
          <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
            <div>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                Current Bid
              </p>
              <p className="font-display text-2xl font-bold text-primary">
                ${item.currentBid.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="font-body text-sm font-medium">{item.totalBids} bids</span>
            </div>
          </div>

          {/* Quick bid buttons */}
          <div>
            <p className="mb-2 font-body text-xs text-muted-foreground uppercase tracking-wider">
              Quick Bid
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickBids.map((amount) => (
                <Button
                  key={amount}
                  variant="gold-outline"
                  size="sm"
                  className="font-body"
                  onClick={() => setBidAmount(amount.toString())}
                >
                  ${amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom bid input */}
          <div>
            <p className="mb-2 font-body text-xs text-muted-foreground uppercase tracking-wider">
              Custom Amount
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="pl-7 font-body bg-secondary border-border focus:border-primary"
                min={minBid}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span className="font-body text-[10px]">Minimum bid: ${minBid.toLocaleString()}</span>
            </div>
          </div>

          {/* Submit */}
          <Button variant="gold" className="w-full gap-2 text-base" onClick={handlePlaceBid}>
            <Gavel className="h-4 w-4" />
            Place Bid — ${Number(bidAmount).toLocaleString()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BidDialog;
