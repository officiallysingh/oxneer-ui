'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  useAuctionWizardController,
  type AuctionWizardConfig,
  type AuctionWizardContextValue,
} from '../_hooks/useAuctionWizardController';

export type { AuctionWizardConfig, AuctionWizardContextValue };

const AuctionWizardContext = createContext<AuctionWizardContextValue | null>(null);

/** Owns the wizard's state and actions for one auction. The create and edit
 *  routes both render this provider; only their `config` differs. */
export function AuctionWizardProvider({
  config,
  children,
}: {
  config: AuctionWizardConfig;
  children: ReactNode;
}) {
  const value = useAuctionWizardController(config);
  return <AuctionWizardContext.Provider value={value}>{children}</AuctionWizardContext.Provider>;
}

export function useAuctionWizard(): AuctionWizardContextValue {
  const value = useContext(AuctionWizardContext);
  if (!value) {
    throw new Error('useAuctionWizard must be used inside AuctionWizardProvider');
  }
  return value;
}
