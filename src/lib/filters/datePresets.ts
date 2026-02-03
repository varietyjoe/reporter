import { DatePreset } from "@/types/filters";

export interface DateRange {
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string; // ISO date string YYYY-MM-DD
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Calculate the date range for a given preset
 * Returns null for "custom" preset (uses customStartDate/customEndDate instead)
 */
export function calculateDateRange(preset: DatePreset): DateRange | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today": {
      return {
        startDate: formatDate(today),
        endDate: formatDate(today),
      };
    }

    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        startDate: formatDate(yesterday),
        endDate: formatDate(yesterday),
      };
    }

    case "last_week": {
      // Last complete week (Monday to Sunday)
      const dayOfWeek = today.getDay();
      // Days since last Sunday (Sunday = 0)
      const daysSinceSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - daysSinceSunday);
      const lastMonday = new Date(lastSunday);
      lastMonday.setDate(lastSunday.getDate() - 6);
      return {
        startDate: formatDate(lastMonday),
        endDate: formatDate(lastSunday),
      };
    }

    case "last_month": {
      // Last complete calendar month
      const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastOfPrevMonth = new Date(firstOfThisMonth);
      lastOfPrevMonth.setDate(lastOfPrevMonth.getDate() - 1);
      const firstOfPrevMonth = new Date(
        lastOfPrevMonth.getFullYear(),
        lastOfPrevMonth.getMonth(),
        1
      );
      return {
        startDate: formatDate(firstOfPrevMonth),
        endDate: formatDate(lastOfPrevMonth),
      };
    }

    case "week_to_date": {
      // Monday of current week to today
      const dayOfWeek = today.getDay();
      // Days since Monday (Monday = 1, Sunday = 0 -> 6 days back)
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysSinceMonday);
      return {
        startDate: formatDate(monday),
        endDate: formatDate(today),
      };
    }

    case "month_to_date": {
      // First of current month to today
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: formatDate(firstOfMonth),
        endDate: formatDate(today),
      };
    }

    case "custom":
      return null; // Custom uses customStartDate/customEndDate

    default:
      return null;
  }
}

/**
 * Get display label for a date preset
 */
export function getPresetLabel(preset: DatePreset): string {
  const labels: Record<DatePreset, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last_week: "Last Week",
    last_month: "Last Month",
    week_to_date: "Week to Date",
    month_to_date: "Month to Date",
    custom: "Custom Range",
  };
  return labels[preset];
}

/**
 * All available date presets in display order
 */
export const DATE_PRESETS: DatePreset[] = [
  "today",
  "yesterday",
  "last_week",
  "last_month",
  "week_to_date",
  "month_to_date",
  "custom",
];

/**
 * Format a date range for display
 */
export function formatDateRangeDisplay(
  startDate: string | null,
  endDate: string | null
): string {
  if (!startDate && !endDate) return "All time";
  if (startDate && !endDate) return `From ${startDate}`;
  if (!startDate && endDate) return `Until ${endDate}`;
  if (startDate === endDate) return startDate!;
  return `${startDate} - ${endDate}`;
}
