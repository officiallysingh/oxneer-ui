/** Small primary dot marking a field with an unsaved change. */
export function ChangedDot({ className = 'ml-1.5' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle ${className}`}
      aria-label="changed"
      role="img"
    />
  );
}
