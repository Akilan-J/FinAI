export function formatDateToDDMMYYYY(dateString: string | Date | null | undefined): string {
  if (!dateString) return "—";
  
  // If it's a YYYY-MM-DD string, parse components directly to avoid timezone shift issues
  if (typeof dateString === "string" && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  const dateObj = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(dateObj.getTime())) return "—";

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

export function dbDateToInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // Check if already in YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [_, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  // Otherwise, try parsing as date object
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return "";
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

export function inputDateToDbDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [_, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}
