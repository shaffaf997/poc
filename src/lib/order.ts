export function generateOrderCode(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const sequence = Math.floor(date.getTime() % 1_000_000)
    .toString()
    .padStart(6, "0");

  return `TW-${yyyy}${mm}${dd}-${sequence}`;
}
