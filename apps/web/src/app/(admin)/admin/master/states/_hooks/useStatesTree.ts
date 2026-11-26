'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage, masterApi, type AreaVM, type CityVM, type StateVM } from '@oxneer/api';
import { useLazyChildren } from '@/hooks/admin';
import { filterByName } from '@/lib/tree-helpers';

const loadCities = (stateId: string) => masterApi.getCitiesByState(stateId);
const loadAreas = (cityId: string) => masterApi.getAreasByCity(cityId);

/** States → cities → areas, each level loaded the first time its parent opens. */
export function useStatesTree() {
  const [allStates, setAllStates] = useState<StateVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const cities = useLazyChildren<CityVM>({
    load: loadCities,
    onError: setError,
    loadErrorMessage: 'Failed to load cities.',
  });
  const areas = useLazyChildren<AreaVM>({
    load: loadAreas,
    onError: setError,
    loadErrorMessage: 'Failed to load areas.',
  });

  const fetchStates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAllStates(await masterApi.getStates());
    } catch {
      setError('Failed to load states.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    masterApi
      .getStates()
      .then((result) => {
        if (!cancelled) setAllStates(result);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load states.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const states = useMemo(() => filterByName(allStates, search), [allStates, search]);

  const runDelete = useCallback(async (action: () => Promise<void>, fallback: string) => {
    try {
      await action();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, fallback));
      return false;
    }
  }, []);

  const deleteState = useCallback(
    async (state: StateVM) => {
      const ok = await runDelete(() => masterApi.deleteState(state.id), 'Failed to delete state.');
      if (ok) setAllStates((prev) => prev.filter((s) => s.id !== state.id));
    },
    [runDelete],
  );

  const { removeChild: removeCity } = cities;
  const deleteCity = useCallback(
    async (stateId: string, city: CityVM) => {
      const ok = await runDelete(() => masterApi.deleteCity(city.id), 'Failed to delete city.');
      if (ok) removeCity(stateId, city.id);
    },
    [runDelete, removeCity],
  );

  const { removeChild: removeArea } = areas;
  const deleteArea = useCallback(
    async (cityId: string, area: AreaVM) => {
      const ok = await runDelete(() => masterApi.deleteArea(area.id), 'Failed to delete area.');
      if (ok) removeArea(cityId, area.id);
    },
    [runDelete, removeArea],
  );

  return {
    states,
    allStates,
    isLoading,
    error,
    search,
    setSearch,
    refresh: fetchStates,
    cities,
    areas,
    deleteState,
    deleteCity,
    deleteArea,
  };
}
