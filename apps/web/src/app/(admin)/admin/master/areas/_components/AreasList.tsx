'use client';

import { MapPinned } from 'lucide-react';
import type { AreaVM } from '@oxneer/api';
import { RowActions } from '@/components/common/admin/RowActions';

interface AreasListProps {
  areas: AreaVM[];
  onEdit: (area: AreaVM) => void;
  onDelete: (area: AreaVM) => void;
}

function areaLocation(area: AreaVM): string {
  return [area.city?.name, area.city?.state?.name].filter(Boolean).join(', ');
}

export function AreasList({ areas, onEdit, onDelete }: AreasListProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
      {areas.map((area) => {
        const location = areaLocation(area);
        return (
          <div
            key={area.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <MapPinned className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-foreground text-sm">{area.name}</span>
              {area.pinCode && (
                <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                  {area.pinCode}
                </span>
              )}
              {location && <span className="text-xs text-muted-foreground ml-2">{location}</span>}
            </div>
            <RowActions
              size="sm"
              editLabel="Edit area"
              deleteLabel="Delete area"
              onEdit={() => onEdit(area)}
              onDelete={() => onDelete(area)}
            />
          </div>
        );
      })}
    </div>
  );
}
