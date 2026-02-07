/**
 * Normalise various date strings to ISO 8601 (YYYY-MM-DDTHH:mm:ss).
 * Returns null for unparseable input.
 */
function parseDate(raw) {
  if (!raw) return null;

  let str = String(raw).trim();
  if (!str) return null;

  // Strip IANA timezone suffix e.g. [Asia/Dubai] from Meetup datetime attrs
  str = str.replace(/\[.*?\]$/, '').trim();

  // Already ISO 8601 (with optional timezone offset like +04:00)
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(str)) {
    const d = new Date(str);
    return isNaN(d) ? null : d.toISOString();
  }

  // Try native Date parsing (handles "Jan 15, 2025", "15 January 2025", etc.)
  const d = new Date(str);
  if (!isNaN(d) && d.getFullYear() > 2000) {
    return d.toISOString();
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const d2 = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
    return isNaN(d2) ? null : d2.toISOString();
  }

  // "15 - 18 Mar 2025" range format — take start date
  const range = str.match(/^(\d{1,2})\s*[-–]\s*\d{1,2}\s+(\w+)\s+(\d{4})/);
  if (range) {
    const d3 = new Date(`${range[1]} ${range[2]} ${range[3]}`);
    return isNaN(d3) ? null : d3.toISOString();
  }

  return null;
}

module.exports = { parseDate };
