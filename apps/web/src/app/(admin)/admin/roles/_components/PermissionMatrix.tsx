'use client';

import type { PermissionVM } from '@repo/api';
import { Checkbox, cn } from '@repo/ui';
import { ChangedDot } from '@/components/common/admin/ChangedDot';
import {
  ACTION_LABELS,
  ACTIONS,
  rowPermissionIds,
  type PermissionGroups,
  type ResourceRow,
} from '@/lib/access/permission-matrix';

interface PermissionMatrixProps {
  groups: PermissionGroups;
  selected: ReadonlySet<string>;
  /** Turns the given permissions on or off. */
  onSet: (ids: string[], on: boolean) => void;
  /** Saved selection when editing; rows that differ from it are highlighted. */
  original?: ReadonlySet<string>;
  /** Filters rows by resource label or permission name/label. */
  query?: string;
}

function matches(p: PermissionVM, q: string) {
  return p.name.toLowerCase().includes(q) || (p.label ?? '').toLowerCase().includes(q);
}

function differs(ids: string[], selected: ReadonlySet<string>, original?: ReadonlySet<string>) {
  return !!original && ids.some((id) => selected.has(id) !== original.has(id));
}

/** Resource × View/Create/Update/Delete grid, plus a plain list for permissions that don't fit. */
export function PermissionMatrix({
  groups,
  selected,
  onSet,
  original,
  query = '',
}: PermissionMatrixProps) {
  const q = query.trim().toLowerCase();
  const rows = q
    ? groups.rows.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          (Object.values(r.cells) as PermissionVM[]).some((p) => matches(p, q)),
      )
    : groups.rows;
  const other = q ? groups.other.filter((p) => matches(p, q)) : groups.other;

  if (rows.length === 0 && other.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {q ? `No permissions match “${query.trim()}”.` : 'No permissions exist yet.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-muted/50">
              <tr className="h-10">
                <th scope="col" className="w-10 pl-3">
                  <span className="sr-only">Select whole resource</span>
                </th>
                <th
                  scope="col"
                  className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Resource
                </th>
                {ACTIONS.map((a) => (
                  <th
                    key={a}
                    scope="col"
                    className="w-16 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {ACTION_LABELS[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <MatrixRow
                  key={row.key}
                  row={row}
                  selected={selected}
                  original={original}
                  onSet={onSet}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {other.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Other</h4>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {other.map((p) => {
              const changed = differs([p.id], selected, original);
              return (
                <li key={p.id} className={cn(changed && 'bg-primary/[0.07]')}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={(on) => onSet([p.id], on === true)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">
                        {p.label || p.name}
                        {changed && <ChangedDot />}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {p.name}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function MatrixRow({
  row,
  selected,
  original,
  onSet,
}: {
  row: ResourceRow;
  selected: ReadonlySet<string>;
  original?: ReadonlySet<string>;
  onSet: PermissionMatrixProps['onSet'];
}) {
  const ids = rowPermissionIds(row);
  const on = ids.filter((id) => selected.has(id)).length;
  const all = on === ids.length;
  const changed = differs(ids, selected, original);

  return (
    <tr className={cn('h-11 border-t border-border', changed && 'bg-primary/[0.07]')}>
      <td className="pl-3">
        <Checkbox
          checked={all ? true : on > 0 ? 'indeterminate' : false}
          onCheckedChange={() => onSet(ids, !all)}
          aria-label={`All ${row.label} permissions`}
        />
      </td>
      <th scope="row" className="pr-2 text-left font-medium text-foreground">
        {row.label}
        {changed && <ChangedDot />}
      </th>
      {ACTIONS.map((a) => {
        const p = row.cells[a];
        return (
          <td key={a} className="text-center">
            {p ? (
              <Checkbox
                checked={selected.has(p.id)}
                onCheckedChange={(v) => onSet([p.id], v === true)}
                aria-label={`${ACTION_LABELS[a]} ${row.label}`}
                title={p.name}
                className="align-middle"
              />
            ) : (
              <>
                <span aria-hidden className="text-muted-foreground">
                  –
                </span>
                <span className="sr-only">Not available</span>
              </>
            )}
          </td>
        );
      })}
    </tr>
  );
}
