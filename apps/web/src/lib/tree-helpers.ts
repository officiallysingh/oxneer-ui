/** Case-insensitive "name contains" filter; a blank query keeps everything. */
export function filterByName<T extends { name: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}

/** Returns a new set with `id` added, or removed if it was already there. */
export function toggleInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** "(1 city)", "(3 cities)". */
export function countLabel(count: number, singular: string, plural: string): string {
  return `(${count} ${count === 1 ? singular : plural})`;
}
