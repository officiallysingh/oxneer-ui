/** Count pill inside a tab trigger; highlights when its trigger (with `group`) is active. */
export function TabCount({ n }: { n: number | undefined }) {
  if (n === undefined) return null;
  return (
    <span className="rounded-full bg-foreground/[0.07] px-[7px] text-xs font-semibold group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary">
      {n}
    </span>
  );
}
