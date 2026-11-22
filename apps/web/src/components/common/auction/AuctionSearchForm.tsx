'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Input } from '@oxneer/ui';

export interface AuctionSearchValues {
  phrase: string;
  category: string;
  fromDate: string;
  tillDate: string;
}

const EMPTY_SEARCH: AuctionSearchValues = {
  phrase: '',
  category: 'All',
  fromDate: '',
  tillDate: '',
};

interface Props {
  categories: string[];
  onSearch: (values: AuctionSearchValues) => void;
}

/**
 * Public auction search form — mirrors the filter panel on the admin auctions
 * list, restyled for the storefront. Wired to filter the (currently mocked)
 * grid client-side; swap `onSearch` for a real search API once one exists.
 */
export function AuctionSearchForm({ categories, onSearch }: Props) {
  const [values, setValues] = useState<AuctionSearchValues>(EMPTY_SEARCH);

  const update = (patch: Partial<AuctionSearchValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    onSearch(next);
  };

  const handleReset = () => {
    setValues(EMPTY_SEARCH);
    onSearch(EMPTY_SEARCH);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mx-auto mt-10 max-w-4xl rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
            Search
          </label>
          <Input
            value={values.phrase}
            onChange={(e) => update({ phrase: e.target.value })}
            placeholder="Search auctions..."
          />
        </div>

        <div className="min-w-[160px] space-y-1.5">
          <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
            Category
          </label>
          <select
            value={values.category}
            onChange={(e) => update({ category: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[150px] space-y-1.5">
          <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
            From
          </label>
          <Input
            type="date"
            value={values.fromDate}
            onChange={(e) => update({ fromDate: e.target.value })}
          />
        </div>

        <div className="min-w-[150px] space-y-1.5">
          <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
            Till
          </label>
          <Input
            type="date"
            value={values.tillDate}
            onChange={(e) => update({ tillDate: e.target.value })}
          />
        </div>

        <div className="flex gap-2 pb-0.5">
          <Button variant="gold" size="sm" onClick={() => onSearch(values)} className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
