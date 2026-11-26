'use client';

import type { AreaVM, CityVM, StateVM } from '@oxneer/api';
import type { LazyChildren as Level } from '@/hooks/admin';
import { countLabel } from '@/lib/tree-helpers';
import { AreaChips, ExpandToggle, NestedState, TreeRowActions } from '@/components/common/master';

export interface StatesTreeActions {
  onEditState: (state: StateVM) => void;
  onAddCity: (state: StateVM) => void;
  onDeleteState: (state: StateVM) => void;
  onEditCity: (city: CityVM, state: StateVM) => void;
  onAddArea: (city: CityVM) => void;
  onDeleteCity: (city: CityVM, state: StateVM) => void;
  onEditArea: (area: AreaVM, city: CityVM, state: StateVM) => void;
  onDeleteArea: (area: AreaVM, city: CityVM) => void;
}

interface StatesTreeProps extends StatesTreeActions {
  states: StateVM[];
  cities: Level<CityVM>;
  areas: Level<AreaVM>;
}

function StateLabel({ state, cityCount }: { state: StateVM; cityCount?: number }) {
  return (
    <>
      <span className="font-medium text-foreground text-sm">{state.name}</span>
      {state.code && (
        <span className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5">
          {state.code}
        </span>
      )}
      {state.isUT && (
        <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
          UT
        </span>
      )}
      {cityCount !== undefined && (
        <span className="text-xs text-muted-foreground ml-1 tabular-nums">
          {countLabel(cityCount, 'city', 'cities')}
        </span>
      )}
    </>
  );
}

function CityRow({
  city,
  state,
  areas,
  ...actions
}: { city: CityVM; state: StateVM; areas: Level<AreaVM> } & StatesTreeActions) {
  const expanded = areas.isExpanded(city.id);
  const loading = areas.isLoading(city.id);
  const cityAreas = areas.childrenOf(city.id);

  return (
    <div>
      <div className="flex items-center gap-3 px-10 py-2.5 hover:bg-muted/30 transition-colors">
        <ExpandToggle
          expanded={expanded}
          loading={loading}
          small
          onToggle={() => areas.toggle(city.id)}
        >
          <span className="text-sm text-foreground">{city.name}</span>
          {cityAreas && (
            <span className="text-xs text-muted-foreground ml-1 tabular-nums">
              {countLabel(cityAreas.length, 'area', 'areas')}
            </span>
          )}
        </ExpandToggle>
        <TreeRowActions
          noun="city"
          childNoun="area"
          small
          onEdit={() => actions.onEditCity(city, state)}
          onAddChild={() => actions.onAddArea(city)}
          onDelete={() => actions.onDeleteCity(city, state)}
        />
      </div>

      {expanded && (
        <div className="px-16 py-3 bg-muted/20 border-t border-border/60">
          <NestedState
            loading={loading}
            isEmpty={!cityAreas?.length}
            noun="areas"
            onAdd={() => actions.onAddArea(city)}
          >
            <AreaChips
              areas={cityAreas ?? []}
              onEdit={(area) => actions.onEditArea(area, city, state)}
              onDelete={(area) => actions.onDeleteArea(area, city)}
            />
          </NestedState>
        </div>
      )}
    </div>
  );
}

function StateRow({
  state,
  cities,
  areas,
  ...actions
}: { state: StateVM; cities: Level<CityVM>; areas: Level<AreaVM> } & StatesTreeActions) {
  const expanded = cities.isExpanded(state.id);
  const loading = cities.isLoading(state.id);
  const stateCities = cities.childrenOf(state.id);

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
        <ExpandToggle
          expanded={expanded}
          loading={loading}
          onToggle={() => cities.toggle(state.id)}
        >
          <StateLabel state={state} cityCount={stateCities?.length} />
        </ExpandToggle>
        <TreeRowActions
          noun="state"
          childNoun="city"
          onEdit={() => actions.onEditState(state)}
          onAddChild={() => actions.onAddCity(state)}
          onDelete={() => actions.onDeleteState(state)}
        />
      </div>

      {expanded && (
        <div className="bg-muted/10 border-t border-border">
          <NestedState
            loading={loading}
            isEmpty={!stateCities?.length}
            noun="cities"
            onAdd={() => actions.onAddCity(state)}
            className="px-10 py-3"
          >
            <div className="divide-y divide-border/60">
              {(stateCities ?? []).map((city) => (
                <CityRow key={city.id} city={city} state={state} areas={areas} {...actions} />
              ))}
            </div>
          </NestedState>
        </div>
      )}
    </div>
  );
}

export function StatesTree({ states, cities, areas, ...actions }: StatesTreeProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
      {states.map((state) => (
        <StateRow key={state.id} state={state} cities={cities} areas={areas} {...actions} />
      ))}
    </div>
  );
}
