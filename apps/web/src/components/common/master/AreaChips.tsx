'use client';

import type { AreaVM } from '@oxneer/api';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@oxneer/ui';

interface AreaChipsProps {
  areas: AreaVM[];
  onEdit: (area: AreaVM) => void;
  onDelete: (area: AreaVM) => void;
}

export function AreaChips({ areas, onEdit, onDelete }: AreaChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {areas.map((area) => (
        <div
          key={area.id}
          className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
        >
          <span className="text-foreground font-medium">{area.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(area)}
            className="ml-0.5 h-5 w-5 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${area.name}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(area)}
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${area.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
