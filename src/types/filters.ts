// Date preset options for quick date range selection
export type DatePreset =
  | "today"
  | "yesterday"
  | "last_week"
  | "last_month"
  | "week_to_date"
  | "month_to_date"
  | "custom";

// Global filter state shared across dashboard pages
export interface GlobalFilters {
  // Owner/Rep filters
  ownerIds: string[];

  // Date range
  datePreset: DatePreset;
  customStartDate: string | null; // ISO date string YYYY-MM-DD
  customEndDate: string | null; // ISO date string YYYY-MM-DD

  // Computed date range (derived from preset or custom)
  startDate: string | null;
  endDate: string | null;

  // Additional filters
  activeOnly: boolean;
}

// Saved filter configuration
export interface SavedFilter {
  id: string;
  name: string;
  ownerIds: string[];
  datePreset: DatePreset;
  customStartDate: string | null;
  customEndDate: string | null;
  activeOnly: boolean;
  createdAt: string;
}

// Owner type for available owners list
export interface FilterOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId?: number;
}

// Context value type
export interface FilterContextValue {
  // Current filter state (what data is actually filtered by)
  filters: GlobalFilters;

  // Pending changes (UI state before applying)
  pendingFilters: GlobalFilters;

  // Whether pending differs from applied
  hasChanges: boolean;

  // Actions
  setOwnerIds: (ids: string[]) => void;
  toggleOwner: (id: string) => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDateRange: (start: string | null, end: string | null) => void;
  setActiveOnly: (value: boolean) => void;
  applyFilters: () => void;
  resetFilters: () => void;

  // Saved filters
  savedFilters: SavedFilter[];
  saveFilter: (name: string) => void;
  loadFilter: (filter: SavedFilter) => void;
  deleteFilter: (id: string) => void;

  // UI state
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;

  // Available owners (loaded from API)
  availableOwners: FilterOwner[];
  setAvailableOwners: (owners: FilterOwner[]) => void;
}
