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
