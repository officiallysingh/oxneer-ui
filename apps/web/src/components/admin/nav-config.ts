import type { ElementType } from 'react';
import {
  Users,
  ShieldCheck,
  KeyRound,
  Tag,
  MapPin,
  Building2,
  MapPinned,
  Landmark,
  Puzzle,
  Database,
  FileText,
  List,
  Gavel,
} from 'lucide-react';

// ── Nav structure ─────────────────────────────────────────────────────────────

export interface NavSubItem {
  href: string;
  label: string;
  description: string;
  icon?: ElementType;
}

export interface NavItem {
  href?: string;
  label: string;
  icon: ElementType;
  description: string;
  subItems?: NavSubItem[];
}

export interface NavGroup {
  kind: 'group';
  label: string;
  items: NavItem[];
}

export interface NavFlat {
  kind: 'flat';
  href: string;
  label: string;
  icon: ElementType;
  description: string;
}

export type NavEntry = NavGroup | NavFlat;

export interface FlatNavItem {
  href: string;
  label: string;
  description: string;
  icon: ElementType;
}

export interface SubRouteTitle {
  match: RegExp;
  label: string;
  description: string;
}

// ── Nav data ──────────────────────────────────────────────────────────────────

export const navEntries: NavEntry[] = [
  {
    kind: 'group',
    label: 'User Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users, description: 'Manage accounts' },
      { href: '/admin/roles', label: 'Roles', icon: ShieldCheck, description: 'Access roles' },
      {
        href: '/admin/permissions',
        label: 'Permissions',
        icon: KeyRound,
        description: 'Access rights',
      },
    ],
  },
  {
    kind: 'group',
    label: 'Master Data',
    items: [
      {
        href: '/admin/master/categories',
        label: 'Categories',
        icon: Tag,
        description: 'Item categories',
      },
      {
        href: '/admin/master/states',
        label: 'States',
        icon: MapPin,
        description: 'States, cities & areas',
      },
      { href: '/admin/master/cities', label: 'Cities', icon: Building2, description: 'All cities' },
      { href: '/admin/master/areas', label: 'Areas', icon: MapPinned, description: 'All areas' },
      { href: '/admin/master/banks', label: 'Banks', icon: Landmark, description: 'Bank accounts' },
    ],
  },
  {
    kind: 'group',
    label: 'Templates',
    items: [
      {
        href: '/admin/metadata/components',
        label: 'Components',
        icon: Puzzle,
        description: 'Reusable property groups',
      },
      {
        href: '/admin/metadata/listing-catalogs',
        label: 'Listing Catalogs',
        icon: Database,
        description: 'Listing property templates',
      },
      {
        href: '/admin/metadata/custom-forms',
        label: 'Custom Forms',
        icon: FileText,
        description: 'Auction workflow step form templates',
      },
    ],
  },
  // ── Flat items ──────────────────────────────────────────────────────────────
  {
    kind: 'flat',
    href: '/admin/listings',
    label: 'Listings',
    icon: List,
    description: 'Auction listings',
  },
  {
    kind: 'flat',
    href: '/admin/auctions',
    label: 'Auctions',
    icon: Gavel,
    description: 'Manage auctions',
  },
];

// ── Flat list for topbar label lookup ─────────────────────────────────────────
export const allNavItems: FlatNavItem[] = [
  ...navEntries.flatMap((entry) => {
    if (entry.kind === 'flat') {
      return [
        {
          href: entry.href,
          label: entry.label,
          description: entry.description,
          icon: entry.icon,
        },
      ];
    }
    return entry.items.flatMap((item) =>
      item.subItems
        ? item.subItems.map((sub) => ({
            href: sub.href,
            label: sub.label,
            description: sub.description,
            icon: sub.icon ?? item.icon,
          }))
        : [
            {
              href: item.href ?? '',
              label: item.label,
              description: item.description,
              icon: item.icon,
            },
          ],
    );
  }),
];

// ── Sub-route title overrides ─────────────────────────────────────────────────
export const subRouteTitles: SubRouteTitle[] = [
  {
    match: /\/admin\/master\/states$/,
    label: 'States',
    description: 'Manage states, cities & areas',
  },
  {
    match: /\/admin\/master\/categories\/new$/,
    label: 'Add category',
    description: 'Create a new category',
  },
  {
    match: /\/admin\/master\/categories\/.+\/edit$/,
    label: 'Edit category',
    description: 'Update category details',
  },
  {
    match: /\/admin\/master\/categories\/.+\/subcategories\/new$/,
    label: 'Add sub-category',
    description: 'Create a new sub-category',
  },
  { match: /\/admin\/users\/new$/, label: 'Add user', description: 'Create a new user account' },
  { match: /\/admin\/users\/.+\/edit$/, label: 'Edit user', description: 'Update user details' },
  { match: /\/admin\/users\/.+\/view$/, label: 'View user', description: 'User account details' },
  { match: /\/admin\/listings\/new$/, label: 'New listing', description: 'Create a new listing' },
  {
    match: /\/admin\/listings\/.+\/edit$/,
    label: 'Edit listing',
    description: 'Update listing details',
  },
  {
    match: /\/admin\/metadata\/listing-catalogs\/new$/,
    label: 'New listing catalog',
    description: 'Create a listing catalog template',
  },
  {
    match: /\/admin\/metadata\/listing-catalogs\/.+\/edit$/,
    label: 'Edit listing catalog',
    description: 'Update listing catalog template',
  },
  {
    match: /\/admin\/metadata\/custom-forms\/new$/,
    label: 'New custom form',
    description: 'Create a custom form template',
  },
  {
    match: /\/admin\/metadata\/custom-forms\/.+\/edit$/,
    label: 'Edit custom form',
    description: 'Update custom form template',
  },
  {
    match: /\/admin\/metadata\/components\/new$/,
    label: 'New component',
    description: 'Create a reusable property group',
  },
  {
    match: /\/admin\/metadata\/components\/.+\/edit$/,
    label: 'Edit component',
    description: 'Update component definition',
  },
  { match: /\/admin\/auctions\/new$/, label: 'New auction', description: 'Create a new auction' },
  {
    match: /\/admin\/auctions\/.+\/edit$/,
    label: 'Edit auction',
    description: 'Update auction details',
  },
  {
    match: /\/admin\/auctions\/.+\/view$/,
    label: 'View auction',
    description: 'Auction details & policy workflow',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) =>
    item.subItems
      ? item.subItems.some((sub) => pathname.startsWith(sub.href))
      : item.href
        ? pathname.startsWith(item.href)
        : false,
  );
}

export function resolveTitle(pathname: string): { label: string; description: string } {
  const sub = subRouteTitles.find((r) => r.match.test(pathname));
  if (sub) return { label: sub.label, description: sub.description };
  const active = allNavItems.find((l) => l.href && pathname.startsWith(l.href));
  if (active) return { label: active.label, description: active.description };
  return { label: 'Admin Portal', description: 'Dashboard' };
}
