/**
 * Returns the default date range for the current month (or a given date's month).
 * Produces ISO date strings (YYYY-MM-DD) for Supabase compatibility.
 *
 * @param {Date} [date=new Date()] - Reference date to derive the month range from
 * @returns {{ startDate: string, endDate: string }} First and last day of the month as ISO date strings
 */
export function getDefaultDateRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // First day of the month
  const firstDay = new Date(year, month, 1);

  // Last day of the month (day 0 of next month = last day of current month)
  const lastDay = new Date(year, month + 1, 0);

  const startDate = formatDateISO(firstDay);
  const endDate = formatDateISO(lastDay);

  return { startDate, endDate };
}

/**
 * Formats a Date object as an ISO date string (YYYY-MM-DD).
 *
 * @param {Date} date
 * @returns {string}
 */
function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
