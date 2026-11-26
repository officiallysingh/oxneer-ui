'use client';

import { useCallback, useState } from 'react';
import { getApiErrorMessage, masterApi, type AreaVM, type CityVM } from '@oxneer/api';
import { useAllStates, useFetchPaginatedList, useLazyChildren } from '@/hooks/admin';

export const CITIES_PAGE_SIZE = 16;

const loadAreas = (cityId: string) => masterApi.getAreasByCity(cityId);

/** Server-searched, paginated cities, each opening onto its lazily loaded areas. */
export function useCitiesList() {
  const [search, setSearch] = useState('');

  const fetcher = useCallback(
    (page: number) =>
      masterApi.searchCities({
        searchText: search.trim() || undefined,
        page,
        size: CITIES_PAGE_SIZE,
      }),
    [search],
  );
  const list = useFetchPaginatedList<CityVM>(fetcher, search, {
    errorMessage: 'Failed to load cities.',
  });
  const { setData, setError } = list;

  const areas = useLazyChildren<AreaVM>({
    load: loadAreas,
    onError: setError,
    loadErrorMessage: 'Failed to load areas.',
  });
  const { removeChild: removeArea } = areas;
  const states = useAllStates();

  const deleteCity = useCallback(
    async (city: CityVM) => {
      try {
        await masterApi.deleteCity(city.id);
        setData((prev) => prev.filter((c) => c.id !== city.id));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to delete city.'));
      }
    },
    [setData, setError],
  );

  const deleteArea = useCallback(
    async (cityId: string, area: AreaVM) => {
      try {
        await masterApi.deleteArea(area.id);
        removeArea(cityId, area.id);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to delete area.'));
      }
    },
    [removeArea, setError],
  );

  return { ...list, search, setSearch, states, areas, deleteCity, deleteArea };
}
