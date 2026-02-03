"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  GlobalFilters,
  FilterContextValue,
  SavedFilter,
  DatePreset,
  FilterOwner,
} from "@/types/filters";
import { calculateDateRange } from "@/lib/filters/datePresets";

const STORAGE_KEY = "dashboard-global-filters";
const SAVED_FILTERS_KEY = "dashboard-saved-filters";
const COLLAPSED_KEY = "dashboard-filters-collapsed";

const defaultFilters: GlobalFilters = {
  ownerIds: [],
  datePreset: "week_to_date",
  customStartDate: null,
  customEndDate: null,
  startDate: null,
  endDate: null,
  activeOnly: false,
};

/**
 * Compute effective date range from filters based on preset or custom dates
 */
function computeDateRange(filters: GlobalFilters): GlobalFilters {
  if (filters.datePreset === "custom") {
    return {
      ...filters,
      startDate: filters.customStartDate,
      endDate: filters.customEndDate,
    };
  }

  const range = calculateDateRange(filters.datePreset);
  return {
    ...filters,
    startDate: range?.startDate || null,
    endDate: range?.endDate || null,
  };
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  // Applied filters (what data is actually filtered by)
  const [filters, setFilters] = useState<GlobalFilters>(() => {
    if (typeof window === "undefined") return computeDateRange(defaultFilters);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate the stored data has required fields
        if (typeof parsed === "object" && parsed !== null && "datePreset" in parsed) {
          return computeDateRange({ ...defaultFilters, ...parsed });
        }
        return computeDateRange(defaultFilters);
      } catch {
        // Clear corrupt data
        localStorage.removeItem(STORAGE_KEY);
        return computeDateRange(defaultFilters);
      }
    }
    return computeDateRange(defaultFilters);
  });

  // Pending filters (UI state before applying)
  const [pendingFilters, setPendingFilters] = useState<GlobalFilters>(filters);

  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(SAVED_FILTERS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // UI state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });

  // Available owners (populated by pages that fetch data)
  const [availableOwners, setAvailableOwners] = useState<FilterOwner[]>([]);

  // Check if pending differs from applied
  const hasChanges = useMemo(() => {
    return JSON.stringify(pendingFilters) !== JSON.stringify(filters);
  }, [pendingFilters, filters]);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Persist saved filters
  useEffect(() => {
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
  }, [savedFilters]);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Actions
  const setOwnerIds = useCallback((ids: string[]) => {
    setPendingFilters((prev) => computeDateRange({ ...prev, ownerIds: ids }));
  }, []);

  const toggleOwner = useCallback((id: string) => {
    setPendingFilters((prev) => {
      const newIds = prev.ownerIds.includes(id)
        ? prev.ownerIds.filter((oid) => oid !== id)
        : [...prev.ownerIds, id];
      return computeDateRange({ ...prev, ownerIds: newIds });
    });
  }, []);

  const setDatePreset = useCallback((preset: DatePreset) => {
    setPendingFilters((prev) => {
      const updated = computeDateRange({ ...prev, datePreset: preset });
      if (preset !== "custom") {
        return {
          ...updated,
          customStartDate: updated.startDate,
          customEndDate: updated.endDate,
        };
      }
      return updated;
    });
  }, []);

  const setCustomDateRange = useCallback(
    (start: string | null, end: string | null) => {
      setPendingFilters((prev) =>
        computeDateRange({
          ...prev,
          datePreset: "custom",
          customStartDate: start,
          customEndDate: end,
        })
      );
    },
    []
  );

  const setActiveOnly = useCallback((value: boolean) => {
    setPendingFilters((prev) => computeDateRange({ ...prev, activeOnly: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters(pendingFilters);
  }, [pendingFilters]);

  const resetFilters = useCallback(() => {
    const reset = computeDateRange(defaultFilters);
    setPendingFilters(reset);
    setFilters(reset);
  }, []);

  // Saved filter operations
  const saveFilter = useCallback(
    (name: string) => {
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name,
        ownerIds: pendingFilters.ownerIds,
        datePreset: pendingFilters.datePreset,
        customStartDate: pendingFilters.customStartDate,
        customEndDate: pendingFilters.customEndDate,
        activeOnly: pendingFilters.activeOnly,
        createdAt: new Date().toISOString(),
      };
      setSavedFilters((prev) => [...prev, newFilter]);
    },
    [pendingFilters]
  );

  const loadFilter = useCallback((filter: SavedFilter) => {
    const loaded: GlobalFilters = {
      ownerIds: filter.ownerIds,
      datePreset: filter.datePreset,
      customStartDate: filter.customStartDate,
      customEndDate: filter.customEndDate,
      startDate: null,
      endDate: null,
      activeOnly: filter.activeOnly,
    };
    const computed = computeDateRange(loaded);
    setPendingFilters(computed);
    setFilters(computed); // Apply immediately when loading saved filter
  }, []);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const value: FilterContextValue = {
    filters,
    pendingFilters,
    hasChanges,
    setOwnerIds,
    toggleOwner,
    setDatePreset,
    setCustomDateRange,
    setActiveOnly,
    applyFilters,
    resetFilters,
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    isCollapsed,
    setIsCollapsed,
    availableOwners,
    setAvailableOwners,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
