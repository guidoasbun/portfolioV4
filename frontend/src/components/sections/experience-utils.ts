/**
 * Utility functions for the Experience section.
 * Extracted for testability.
 */

/**
 * Month name abbreviations for date formatting.
 */
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Formats a YYYY-MM date string into a human-readable format (e.g., "Jan 2022").
 */
export function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const year = parts[0] ?? dateStr;
  const month = parts[1] ?? "01";
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES[monthIndex] ?? month;
  return `${monthName} ${year}`;
}

/**
 * Formats a date range for display. Shows "Present" if no end date.
 */
export function formatDateRange(startDate: string, endDate?: string): string {
  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : "Present";
  return `${start} - ${end}`;
}
