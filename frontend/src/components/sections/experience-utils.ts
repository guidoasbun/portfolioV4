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

/**
 * Calculates a human-readable duration string between two YYYY-MM dates.
 * If no end date, uses the current date.
 * Returns strings like "2 years", "4 months", "1 year, 3 months".
 */
export function calculateDuration(startDate: string, endDate?: string): string {
  const startParts = startDate.split("-");
  const startYear = Number(startParts[0]);
  const startMonth = Number(startParts[1]);
  let endYear: number;
  let endMonth: number;

  if (endDate) {
    const endParts = endDate.split("-");
    endYear = Number(endParts[0]);
    endMonth = Number(endParts[1]);
  } else {
    const now = new Date();
    endYear = now.getFullYear();
    endMonth = now.getMonth() + 1;
  }

  let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  if (totalMonths < 1) totalMonths = 1;

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    return months === 1 ? "1 month" : `${months} months`;
  }
  if (months === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  }
  const yearStr = years === 1 ? "1 year" : `${years} years`;
  const monthStr = months === 1 ? "1 month" : `${months} months`;
  return `${yearStr}, ${monthStr}`;
}
