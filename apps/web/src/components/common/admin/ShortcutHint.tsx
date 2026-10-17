/** Small keycap showing a focus shortcut, e.g. "/" in a search box. Hidden on phones. */
export function ShortcutHint({ shortcutKey }: { shortcutKey: string }) {
  return (
    <kbd
      title={`Press ${shortcutKey} to search`}
      className="hidden rounded border border-border px-1.5 font-sans text-[11px] font-medium text-muted-foreground sm:inline"
    >
      {shortcutKey}
    </kbd>
  );
}
