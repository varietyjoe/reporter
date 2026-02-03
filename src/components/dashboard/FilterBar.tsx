"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/contexts/FilterContext";
import { DATE_PRESETS, getPresetLabel } from "@/lib/filters/datePresets";
import { DatePreset } from "@/types/filters";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  Check,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  showOwnerFilter?: boolean;
  showDateFilter?: boolean;
  showActiveOnly?: boolean;
  loading?: boolean;
  onApply?: () => void;
}

export function FilterBar({
  showOwnerFilter = true,
  showDateFilter = true,
  showActiveOnly = true,
  loading = false,
  onApply,
}: FilterBarProps) {
  const {
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
  } = useFilters();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [showReps, setShowReps] = useState(true);
  const [showDates, setShowDates] = useState(true);

  // Generate summary text for collapsed state
  const getSummary = () => {
    const parts: string[] = [];

    if (pendingFilters.ownerIds.length > 0) {
      const names = pendingFilters.ownerIds
        .map((id) => availableOwners.find((o) => o.id === id))
        .filter(Boolean)
        .map((o) => `${o!.firstName} ${o!.lastName}`)
        .slice(0, 2);
      if (names.length < pendingFilters.ownerIds.length) {
        names.push(`+${pendingFilters.ownerIds.length - names.length} more`);
      }
      parts.push(names.join(", "));
    } else {
      parts.push("All Reps");
    }

    parts.push(getPresetLabel(pendingFilters.datePreset));

    if (pendingFilters.activeOnly) {
      parts.push("Active Only");
    }

    return parts.join(" · ");
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    saveFilter(filterName);
    setFilterName("");
    setShowSaveDialog(false);
  };

  const handleApplyFilters = () => {
    applyFilters();
    onApply?.();
  };

  const handleLoadFilter = (filter: typeof savedFilters[0]) => {
    loadFilter(filter);
    onApply?.();
  };

  return (
    <Card>
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasChanges && <span className="h-2 w-2 rounded-full bg-amber-500" />}
          </div>
          <div className="flex items-center gap-3">
            {isCollapsed && (
              <span className="text-xs text-muted-foreground font-normal">
                {getSummary()}
              </span>
            )}
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Save className="h-4 w-4" />
                Saved Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadFilter(filter);
                      }}
                    >
                      {filter.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFilter(filter.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner/Rep Filter */}
          {showOwnerFilter && availableOwners.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                className="w-full flex items-center justify-between text-sm font-medium"
                onClick={() => setShowReps((prev) => !prev)}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sales Reps
                </span>
                {showReps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showReps && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={pendingFilters.ownerIds.length === 0 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOwnerIds([])}
                    >
                      All Reps
                    </Button>
                    {availableOwners
                      .filter((o) => o.firstName || o.lastName)
                      .sort((a, b) =>
                        `${a.firstName} ${a.lastName}`.localeCompare(
                          `${b.firstName} ${b.lastName}`
                        )
                      )
                      .map((owner) => (
                        <Button
                          key={owner.id}
                          variant={
                            pendingFilters.ownerIds.includes(owner.id)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleOwner(owner.id)}
                        >
                          {pendingFilters.ownerIds.includes(owner.id) && (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {owner.firstName} {owner.lastName}
                        </Button>
                      ))}
                  </div>
                  {pendingFilters.ownerIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pendingFilters.ownerIds.length} rep
                      {pendingFilters.ownerIds.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Date Filter */}
          {showDateFilter && (
            <div className="space-y-2">
              <button
                type="button"
                className="w-full flex items-center justify-between text-sm font-medium"
                onClick={() => setShowDates((prev) => !prev)}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </span>
                {showDates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showDates && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.filter((p) => p !== "custom").map((preset) => (
                      <Button
                        key={preset}
                        variant={
                          pendingFilters.datePreset === preset ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setDatePreset(preset)}
                      >
                        {getPresetLabel(preset)}
                      </Button>
                    ))}
                  </div>

                  {/* Custom date inputs */}
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">From:</label>
                      <input
                        type="date"
                        value={pendingFilters.customStartDate || ""}
                        onChange={(e) =>
                          setCustomDateRange(
                            e.target.value || null,
                            pendingFilters.customEndDate
                          )
                        }
                        className={cn(
                          "px-3 py-1 rounded-md border text-sm bg-background",
                          pendingFilters.datePreset === "custom" && "border-primary"
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">To:</label>
                      <input
                        type="date"
                        value={pendingFilters.customEndDate || ""}
                        onChange={(e) =>
                          setCustomDateRange(
                            pendingFilters.customStartDate,
                            e.target.value || null
                          )
                        }
                        className={cn(
                          "px-3 py-1 rounded-md border text-sm bg-background",
                          pendingFilters.datePreset === "custom" && "border-primary"
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Active Only Toggle */}
          {showActiveOnly && (
            <div className="flex items-center gap-4">
              <Button
                variant={pendingFilters.activeOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveOnly(!pendingFilters.activeOnly)}
              >
                <Users className="h-4 w-4 mr-2" />
                {pendingFilters.activeOnly ? "Active Only" : "All Status"}
              </Button>
            </div>
          )}

          {/* Apply & Save Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              onClick={handleApplyFilters}
              disabled={loading}
              className={hasChanges ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2" />
                  {hasChanges ? "Apply Filters" : "Refresh Data"}
                </>
              )}
            </Button>

            {hasChanges && (
              <span className="text-xs text-amber-600">
                Filters changed - click Apply to update
              </span>
            )}

            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          {/* Save Filter */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {showSaveDialog ? (
              <>
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="px-3 py-1 rounded-md border text-sm bg-background"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                />
                <Button size="sm" onClick={handleSaveFilter}>
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current Filter
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
