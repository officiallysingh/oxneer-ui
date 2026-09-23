'use client';

import { useEffect, useState } from 'react';
import { masterApi, type StateVM, type CityVM, type AreaVM } from '@repo/api';
import { Loader2, Trash2, Plus, Pencil, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@repo/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { useConfirmDialog } from '@/hooks/admin/useConfirmDialog';
import {
  AddStateDialog,
  EditStateDialog,
  AddCityDialog,
  EditCityDialog,
  AddAreaDialog,
  EditAreaDialog,
} from '@/components/common/master';

export default function StatesPage() {
  const [states, setStates] = useState<StateVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Expanded state IDs → cities loaded
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [citiesMap, setCitiesMap] = useState<Record<string, CityVM[]>>({});
  const [citiesLoading, setCitiesLoading] = useState<Record<string, boolean>>({});

  // Expanded city IDs → areas loaded
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [areasMap, setAreasMap] = useState<Record<string, AreaVM[]>>({});
  const [areasLoading, setAreasLoading] = useState<Record<string, boolean>>({});

  // Dialogs
  const [addStateOpen, setAddStateOpen] = useState(false);
  const [editStateTarget, setEditStateTarget] = useState<StateVM | null>(null);
  const [addCityTarget, setAddCityTarget] = useState<StateVM | null>(null);
  const [editCityTarget, setEditCityTarget] = useState<CityVM | null>(null);
  const [addAreaTarget, setAddAreaTarget] = useState<CityVM | null>(null);
  const [editAreaTarget, setEditAreaTarget] = useState<AreaVM | null>(null);
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchStates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await masterApi.getStates();
      // Filter client-side if search is active
      const q = search.trim().toLowerCase();
      setStates(q ? data.filter((s) => s.name.toLowerCase().includes(q)) : data);
    } catch {
      setError('Failed to load states.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value);
    const q = value.trim().toLowerCase();
    masterApi
      .getStates()
      .then((data) => setStates(q ? data.filter((s) => s.name.toLowerCase().includes(q)) : data))
      .catch(() => setError('Failed to search states.'));
  };

  // ── State expand ───────────────────────────────────────────────────────────

  const toggleState = async (stateId: string) => {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) {
        next.delete(stateId);
        return next;
      }
      next.add(stateId);
      return next;
    });
    if (!citiesMap[stateId]) {
      setCitiesLoading((prev) => ({ ...prev, [stateId]: true }));
      try {
        const cities = await masterApi.getCitiesByState(stateId);
        setCitiesMap((prev) => ({ ...prev, [stateId]: cities }));
      } catch {
        setError('Failed to load cities.');
      } finally {
        setCitiesLoading((prev) => ({ ...prev, [stateId]: false }));
      }
    }
  };

  // ── City expand ────────────────────────────────────────────────────────────

  const toggleCity = async (cityId: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
        return next;
      }
      next.add(cityId);
      return next;
    });
    if (!areasMap[cityId]) {
      setAreasLoading((prev) => ({ ...prev, [cityId]: true }));
      try {
        const areas = await masterApi.getAreasByCity(cityId);
        setAreasMap((prev) => ({ ...prev, [cityId]: areas }));
      } catch {
        setError('Failed to load areas.');
      } finally {
        setAreasLoading((prev) => ({ ...prev, [cityId]: false }));
      }
    }
  };

  // ── Refresh after edit ───────────────────────────────────────────────────────

  const refreshCitiesForState = async (stateId: string) => {
    try {
      const cities = await masterApi.getCitiesByState(stateId);
      setCitiesMap((prev) => ({ ...prev, [stateId]: cities }));
    } catch {
      setError('Failed to refresh cities.');
    }
  };

  const refreshAreasForCity = async (cityId: string) => {
    try {
      const areas = await masterApi.getAreasByCity(cityId);
      setAreasMap((prev) => ({ ...prev, [cityId]: areas }));
    } catch {
      setError('Failed to refresh areas.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="States"
        description="Manage states, cities and areas"
        actions={
          <ListToolbarActions
            onAdd={() => setAddStateOpen(true)}
            addLabel="Add state"
            onRefresh={fetchStates}
            refreshing={isLoading}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      <SearchInput
        value={search}
        onChange={handleSearch}
        placeholder="Search states..."
        className="max-w-sm"
      />

      {isLoading ? (
        <LoadingBlock message="Loading states..." />
      ) : states.length === 0 ? (
        <EmptyState icon={MapPin} message="No states yet." hint="Add one to get started." />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {states.map((state) => {
            const stateExpanded = expandedStates.has(state.id);
            const cities = citiesMap[state.id] ?? [];
            const citiesLoaded = !!citiesMap[state.id];

            return (
              <div key={state.id}>
                {/* ── State row ── */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <button
                    onClick={() => toggleState(state.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    aria-expanded={stateExpanded}
                  >
                    {citiesLoading[state.id] ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : stateExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
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
                    {citiesLoaded && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({cities.length} {cities.length === 1 ? 'city' : 'cities'})
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Tip label="Edit state">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => setEditStateTarget(state)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                    <Tip label="Add city">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                        onClick={() => setAddCityTarget(state)}
                      >
                        <Plus className="h-3 w-3" />
                        City
                      </Button>
                    </Tip>
                    <Tip label="Delete state">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          openConfirm({
                            title: 'Delete state?',
                            description: `"${state.name}" and all its cities and areas will be permanently removed.`,
                            onConfirm: () => {
                              setStates((prev) => prev.filter((s) => s.id !== state.id));
                            },
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                  </div>
                </div>

                {/* ── Cities ── */}
                {stateExpanded && (
                  <div className="bg-muted/10 border-t border-border">
                    {citiesLoading[state.id] ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs px-10 py-3">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading cities...
                      </div>
                    ) : cities.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-10 py-3">
                        No cities yet.{' '}
                        <button
                          onClick={() => setAddCityTarget(state)}
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          Add one
                        </button>
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {cities.map((city) => {
                          const cityExpanded = expandedCities.has(city.id);
                          const areas = areasMap[city.id] ?? [];
                          const areasLoaded = !!areasMap[city.id];

                          return (
                            <div key={city.id}>
                              {/* ── City row ── */}
                              <div className="flex items-center gap-3 px-10 py-2.5 hover:bg-muted/30 transition-colors">
                                <button
                                  onClick={() => toggleCity(city.id)}
                                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                  aria-expanded={cityExpanded}
                                >
                                  {areasLoading[city.id] ? (
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                                  ) : cityExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="text-sm text-foreground">{city.name}</span>
                                  {areasLoaded && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      ({areas.length} {areas.length === 1 ? 'area' : 'areas'})
                                    </span>
                                  )}
                                </button>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Tip label="Edit city">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                      onClick={() => setEditCityTarget({ ...city, state })}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </Tip>
                                  <Tip label="Add area">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                                      onClick={() => setAddAreaTarget(city)}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Area
                                    </Button>
                                  </Tip>
                                  <Tip label="Delete city">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() =>
                                        openConfirm({
                                          title: 'Delete city?',
                                          description: `"${city.name}" and all its areas will be permanently removed.`,
                                          onConfirm: () => {
                                            setCitiesMap((prev) => ({
                                              ...prev,
                                              [state.id]: (prev[state.id] ?? []).filter(
                                                (c) => c.id !== city.id,
                                              ),
                                            }));
                                          },
                                        })
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </Tip>
                                </div>
                              </div>

                              {/* ── Areas ── */}
                              {cityExpanded && (
                                <div className="px-16 py-3 bg-muted/20 border-t border-border/60">
                                  {areasLoading[city.id] ? (
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Loading areas...
                                    </div>
                                  ) : areas.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      No areas yet.{' '}
                                      <button
                                        onClick={() => setAddAreaTarget(city)}
                                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                                      >
                                        Add one
                                      </button>
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {areas.map((area) => (
                                        <div
                                          key={area.id}
                                          className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
                                        >
                                          <span className="text-foreground font-medium">
                                            {area.name}
                                          </span>
                                          <button
                                            onClick={() =>
                                              setEditAreaTarget({
                                                ...area,
                                                city: { ...city, state },
                                              })
                                            }
                                            className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                                            aria-label={`Edit ${area.name}`}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              openConfirm({
                                                title: 'Delete area?',
                                                description: `"${area.name}" will be permanently removed.`,
                                                onConfirm: () => {
                                                  setAreasMap((prev) => ({
                                                    ...prev,
                                                    [city.id]: (prev[city.id] ?? []).filter(
                                                      (a) => a.id !== area.id,
                                                    ),
                                                  }));
                                                },
                                              })
                                            }
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                            aria-label={`Delete ${area.name}`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialogs ── */}
      <AddStateDialog
        open={addStateOpen}
        onOpenChange={setAddStateOpen}
        onCreated={() => {
          setAddStateOpen(false);
          fetchStates();
        }}
      />

      <EditStateDialog
        state={editStateTarget}
        onClose={() => setEditStateTarget(null)}
        onUpdated={fetchStates}
      />

      <AddCityDialog
        state={addCityTarget}
        onClose={() => setAddCityTarget(null)}
        onCreated={(stateId, cities) => {
          setCitiesMap((prev) => ({ ...prev, [stateId]: cities }));
          setExpandedStates((prev) => new Set([...prev, stateId]));
          setAddCityTarget(null);
        }}
      />

      <EditCityDialog
        city={editCityTarget}
        states={states}
        onClose={() => setEditCityTarget(null)}
        onUpdated={() => {
          if (editCityTarget?.state?.id) refreshCitiesForState(editCityTarget.state.id);
        }}
      />

      <EditAreaDialog
        area={editAreaTarget}
        states={states}
        onClose={() => setEditAreaTarget(null)}
        onUpdated={() => {
          if (editAreaTarget?.city?.id) refreshAreasForCity(editAreaTarget.city.id);
        }}
      />

      <AddAreaDialog
        city={addAreaTarget}
        onClose={() => setAddAreaTarget(null)}
        onCreated={(cityId, areas) => {
          setAreasMap((prev) => ({ ...prev, [cityId]: areas }));
          setExpandedCities((prev) => new Set([...prev, cityId]));
          setAddAreaTarget(null);
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel="Delete"
        onConfirm={() => {
          confirm.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
