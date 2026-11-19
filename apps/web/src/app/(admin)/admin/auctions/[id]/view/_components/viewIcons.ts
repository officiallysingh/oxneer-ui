import {
  CircleAlert,
  Clock,
  Eye,
  EyeOff,
  Flag,
  Gavel,
  Lock,
  Package,
  Tag,
  TrendingUp,
  Trophy,
  User,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AuctionChip, KeyAmount, SummaryIcon } from '../_lib/facts';
import type { RuleIcon } from '../_lib/rules';
import type { StepActor } from '../_lib/steps';

export const SUMMARY_ICON: Record<SummaryIcon, LucideIcon> = {
  item: Package,
  price: Tag,
  winner: Trophy,
  access: Lock,
  time: Clock,
  minimum: Users,
};

export const AMOUNT_ICON: Record<KeyAmount['key'], LucideIcon> = {
  opening: Tag,
  raise: TrendingUp,
  reserve: EyeOff,
  deposit: Wallet,
};

export const CHIP_ICON: Record<AuctionChip['key'], LucideIcon> = {
  direction: TrendingUp,
  access: Lock,
  mechanism: Gavel,
};

export const RULE_ICON: Record<RuleIcon, LucideIcon> = {
  people: Users,
  gavel: Gavel,
  eye: Eye,
  clock: Clock,
  trophy: Trophy,
  flag: Flag,
  alert: CircleAlert,
  wallet: Wallet,
};

export const ACTOR_META: Record<StepActor, { label: string; icon: LucideIcon }> = {
  you: { label: 'You', icon: User },
  participants: { label: 'Participants', icon: Users },
  winner: { label: 'Winner only', icon: Trophy },
  automatic: { label: 'Automatic', icon: Zap },
};
