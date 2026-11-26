import { apiClient } from './client';

// ── View Models ──────────────────────────────────────────────────────────────

// States / Cities / Areas
export interface StateVM {
  id: string;
  code?: string;
  name: string;
  isUT?: boolean;
  cities?: CityVM[];
}

export interface CityVM {
  id: string;
  name: string;
  state?: StateVM;
  areas?: AreaVM[];
}

export interface AreaVM {
  id: string;
  name: string;
  pinCode?: string;
  latitude?: number;
  longitude?: number;
  city?: CityVM;
}

export interface PaginatedCities {
  content?: CityVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    header?: string;
  };
}

export interface PaginatedAreas {
  content?: AreaVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    header?: string;
  };
}

export interface CitiesSearchFilter {
  searchText?: string;
  page?: number;
  size?: number;
}

export interface AreasSearchFilter {
  searchText?: string;
  cityId?: string;
  page?: number;
  size?: number;
}

// Request Models
export interface StateCreationRQ {
  code: string;
  name: string;
  isUT: boolean;
}

export interface StateUpdationRQ {
  code?: string;
  name?: string;
  isUT?: boolean;
}

export interface CityCreationRQ {
  name: string;
}

export interface CityUpdationRQ {
  name?: string;
  stateId?: string;
}

export interface AreaCreationRQ {
  name: string;
  pinCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface AreaUpdationRQ {
  name?: string;
  pinCode?: string;
  latitude?: number;
  longitude?: number;
  cityId?: string;
}

export interface BankVM {
  id: string;
  name: string;
  ifscPrefix: string;
}

export interface BankCreationRQ {
  name: string;
  ifscPrefix: string;
}

export interface BankUpdationRQ {
  name?: string;
  ifscPrefix?: string;
}

export interface CategoryVM {
  id: string;
  code: string;
  name: string;
  icon?: string;
  subCategories?: SubCategoryVM[];
}

export interface SubCategoryVM {
  id: string;
  code: string;
  name: string;
  icon?: string;
  category?: CategoryVM;
}

// ── Request Models ───────────────────────────────────────────────────────────

export interface CategoryCreationRQ {
  name: string;
  icon?: string;
}

export interface CategoryUpdationRQ {
  name?: string;
  icon?: string;
}

export interface SubCategoryCreationRQ {
  name: string;
  icon?: string;
}

export interface SubCategoryUpdationRQ {
  categoryId: string;
  name?: string;
  icon?: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const masterApi = {
  // States
  getStates: async (includeCities = false): Promise<StateVM[]> => {
    const response = await apiClient.get('/api/v1/master/states', {
      headers: includeCities ? { 'x-expand': 'cities' } : undefined,
    });
    return response.data;
  },

  checkStateCodeExists: async (code: string) => {
    const response = await apiClient.get(`/api/v1/master/states/code/${code}/exists`);
    return response.data;
  },

  createState: async (data: StateCreationRQ): Promise<void> => {
    await apiClient.post('/api/v1/master/states', data);
  },

  updateState: async (id: string, data: StateUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/states/${id}`, data);
  },

  // Cities
  getCitiesByState: async (stateId: string, expand?: ('state' | 'areas')[]): Promise<CityVM[]> => {
    const response = await apiClient.get(`/api/v1/master/states/${stateId}/cities`, {
      headers: expand?.length ? { 'x-expand': expand } : undefined,
    });
    return response.data;
  },

  createCity: async (stateId: string, data: CityCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/master/states/${stateId}/cities`, data);
  },

  updateCity: async (id: string, data: CityUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/cities/${id}`, data);
  },

  searchCities: async (filter: CitiesSearchFilter = {}): Promise<PaginatedCities> => {
    const { searchText, page = 0, size = 16 } = filter;
    const response = await apiClient.get<PaginatedCities>('/api/v1/master/cities/search', {
      params: {
        ...(searchText ? { searchText } : {}),
        page,
        size,
      },
      headers: { 'x-expand': 'state' },
    });
    return response.data;
  },

  // Areas
  getAreasByCity: async (cityId: string, includeCity = false): Promise<AreaVM[]> => {
    const response = await apiClient.get(`/api/v1/master/cities/${cityId}/areas`, {
      headers: includeCity ? { 'x-expand': 'city' } : undefined,
    });
    return response.data;
  },

  getAreasByPinCode: async (pinCode: string): Promise<AreaVM[]> => {
    const response = await apiClient.get(`/api/v1/master/areas/pin-code/${pinCode}`, {
      headers: { 'x-expand': 'city' },
    });
    return response.data;
  },

  getAreaById: async (id: string, expand?: ('city' | '*')[]): Promise<AreaVM> => {
    const response = await apiClient.get(`/api/v1/master/areas/${id}`, {
      headers: expand?.length ? { 'x-expand': expand.join(',') } : undefined,
    });
    return response.data;
  },

  getCityByPinCode: async (pinCode: string): Promise<CityVM> => {
    const response = await apiClient.get(`/api/v1/master/cities/pin-code/${pinCode}`, {
      headers: { 'x-expand': 'state,areas' },
    });
    return response.data;
  },

  getCityById: async (cityId: string, expand?: ('state' | 'areas')[]): Promise<CityVM> => {
    const response = await apiClient.get(`/api/v1/master/cities/${cityId}`, {
      headers: expand?.length ? { 'x-expand': expand } : undefined,
    });
    return response.data;
  },

  createArea: async (cityId: string, data: AreaCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/master/cities/${cityId}/areas`, data);
  },

  updateArea: async (id: string, data: AreaUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/areas/${id}`, data);
  },

  searchAreas: async (filter: AreasSearchFilter = {}): Promise<PaginatedAreas> => {
    const { searchText, cityId, page = 0, size = 16 } = filter;
    const response = await apiClient.get<PaginatedAreas>('/api/v1/master/areas/search', {
      params: {
        ...(searchText ? { searchText } : {}),
        ...(cityId ? { cityId } : {}),
        page,
        size,
      },
      headers: { 'x-expand': 'city' },
    });
    return response.data;
  },

  // Banks
  getBanks: async (): Promise<BankVM[]> => {
    const response = await apiClient.get('/api/v1/master/banks/');
    return response.data;
  },

  getBankById: async (id: string): Promise<BankVM> => {
    const response = await apiClient.get(`/api/v1/master/banks/${id}`);
    return response.data;
  },

  createBank: async (data: BankCreationRQ): Promise<void> => {
    await apiClient.post('/api/v1/master/banks/', data);
  },

  updateBank: async (id: string, data: BankUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/banks/${id}`, data);
  },

  deleteBank: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/banks/${id}`);
  },

  // Address deletes
  deleteState: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/states/${id}`);
  },

  deleteCity: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/cities/${id}`);
  },

  deleteArea: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/areas/${id}`);
  },

  // Categories
  getCategories: async (
    includeSubCategories = false,
    phrases?: string[],
  ): Promise<CategoryVM[]> => {
    const response = await apiClient.get<CategoryVM[]>('/api/v1/master/categories', {
      params: phrases?.length ? { phrases } : undefined,
    });
    const categories = response.data;

    if (!includeSubCategories) return categories;

    // The /categories endpoint never returns subCategories — fetch them separately
    // from /sub-categories (with x-expand: true to get the category reference back)
    // and stitch them into each parent category.
    try {
      const subResponse = await apiClient.get<SubCategoryVM[]>('/api/v1/master/sub-categories', {
        headers: { 'x-expand': 'true' },
      });
      const allSubs: SubCategoryVM[] = subResponse.data;

      // Group subcategories by their parent category id
      const subsByCatId = new Map<string, SubCategoryVM[]>();
      for (const sub of allSubs) {
        const catId =
          sub.category && typeof sub.category === 'object'
            ? sub.category.id
            : String(sub.category ?? '');
        if (!catId) continue;
        const bucket = subsByCatId.get(catId);
        if (bucket) bucket.push(sub);
        else subsByCatId.set(catId, [sub]);
      }

      return categories.map((c) => ({
        ...c,
        subCategories: subsByCatId.get(c.id) ?? [],
      }));
    } catch {
      return categories;
    }
  },

  getCategoryById: async (id: string, includeSubCategories = false): Promise<CategoryVM> => {
    const response = await apiClient.get(`/api/v1/master/categories/${id}`, {
      headers: { 'x-expand': includeSubCategories ? 'true' : 'false' },
    });
    return response.data;
  },

  checkCategoryNameExists: async (name: string) => {
    const response = await apiClient.get(`/api/v1/master/categories/name/${name}/exists`);
    return response.data;
  },

  createCategory: async (data: CategoryCreationRQ): Promise<void> => {
    await apiClient.post('/api/v1/master/categories', data);
  },

  updateCategory: async (id: string, data: CategoryUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/categories/${id}`);
  },

  // Sub Categories
  getSubCategoriesByCategory: async (
    categoryId: string,
    includeCategory = false,
  ): Promise<SubCategoryVM[]> => {
    const response = await apiClient.get(`/api/v1/master/categories/${categoryId}/sub-categories`, {
      headers: { 'x-expand': includeCategory ? 'true' : 'false' },
    });
    return response.data;
  },

  checkSubCategoryNameExists: async (name: string) => {
    const response = await apiClient.get(`/api/v1/master/sub-categories/name/${name}/exists`);
    return response.data;
  },

  createSubCategory: async (categoryId: string, data: SubCategoryCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/master/categories/${categoryId}/sub-categories`, data);
  },

  updateSubCategory: async (id: string, data: SubCategoryUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/sub-categories/${id}`, data);
  },

  deleteSubCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/sub-categories/${id}`);
  },
};
