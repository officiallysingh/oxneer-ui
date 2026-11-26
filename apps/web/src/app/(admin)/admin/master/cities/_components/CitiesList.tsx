'use client';

import { Building2 } from 'lucide-react';
import type { AreaVM, CityVM } from '@oxneer/api';
import type { LazyChildren } from '@/hooks/admin';
import { countLabel } from '@/lib/tree-helpers';
import { AreaChips, ExpandToggle, NestedState, TreeRowActions } from '@/components/common/master';

export interface CitiesListActions {
  onEditCity: (city: CityVM) => void;
  onAddArea: (city: CityVM) => void;
  onDeleteCity: (city: CityVM) => void;
  onEditArea: (area: AreaVM, city: CityVM) => void;
  onDeleteArea: (area: AreaVM, city: CityVM) => void;
}

interface CitiesListProps extends CitiesListActions {
  cities: CityVM[];
  areas: LazyChildren<AreaVM>;
}

function CityRow({
  city,
  areas,
  ...actions
}: { city: CityVM; areas: LazyChildren<AreaVM> } & CitiesListActions) {
  const expanded = areas.isExpanded(city.id);
  const loading = areas.isLoading(city.id);
  const cityAreas = areas.childrenOf(city.id);

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
        <ExpandToggle expanded={expanded} loading={loading} onToggle={() => areas.toggle(city.id)}>
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm">{city.name}</span>
          {city.state?.name && (
            <span className="text-xs text-muted-foreground ml-1">{city.state.name}</span>
          )}
          {cityAreas && (
            <span className="text-xs text-muted-foreground ml-1 tabular-nums">
              {countLabel(cityAreas.length, 'area', 'areas')}
            </span>
          )}
        </ExpandToggle>
        <TreeRowActions
          noun="city"
          childNoun="area"
          onEdit={() => actions.onEditCity(city)}
          onAddChild={() => actions.onAddArea(city)}
          onDelete={() => actions.onDeleteCity(city)}
        />
      </div>

      {expanded && (
        <div className="bg-muted/10 border-t border-border px-10 py-3">
          <NestedState
            loading={loading}
            isEmpty={!cityAreas?.length}
            noun="areas"
            onAdd={() => actions.onAddArea(city)}
          >
            <AreaChips
              areas={cityAreas ?? []}
              onEdit={(area) => actions.onEditArea(area, city)}
              onDelete={(area) => actions.onDeleteArea(area, city)}
            />
          </NestedState>
        </div>
      )}
    </div>
  );
}

export function CitiesList({ cities, areas, ...actions }: CitiesListProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
      {cities.map((city) => (
        <CityRow key={city.id} city={city} areas={areas} {...actions} />
      ))}
    </div>
  );
}
