'use client';

import { HelpCircle } from 'lucide-react';
import { Label, Tooltip, TooltipContent, TooltipTrigger } from '@oxneer/ui';

interface LabelWithTipProps {
  htmlFor: string;
  /** Label text */
  children: React.ReactNode;
  /** Tooltip content — the ? icon is only rendered when this is provided */
  tip?: string;
  /** Applied to the Label element (e.g. 'text-destructive') */
  className?: string;
}

/**
 * A `<Label>` with an inline HelpCircle tooltip.
 * Drop-in replacement for plain `<Label>` wherever a validation tip is needed.
 */
export function LabelWithTip({ htmlFor, children, tip, className }: LabelWithTipProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className={className}>
        {children}
      </Label>
      {tip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {tip}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
