'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@oxneer/ui';
import { Search } from 'lucide-react';
import { ICON_GROUPS, ICON_REGISTRY, ICON_LABEL_MAP, isIconId } from './iconRegistry';
import { CategoryIcon } from './CategoryIcon';

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Popular',
    emojis: [
      '⭐',
      '🔥',
      '💎',
      '🏆',
      '🎯',
      '✨',
      '💫',
      '🎁',
      '🛒',
      '💰',
      '💵',
      '🏷️',
      '📦',
      '🚀',
      '❤️',
      '👑',
    ],
  },
  {
    label: 'Electronics',
    emojis: [
      '💻',
      '🖥️',
      '📱',
      '⌨️',
      '🖱️',
      '🖨️',
      '📷',
      '📸',
      '🎥',
      '📹',
      '📺',
      '📻',
      '🎮',
      '🕹️',
      '🔋',
      '💡',
      '🔌',
      '📡',
      '🎧',
      '⌚',
    ],
  },
  {
    label: 'Vehicles',
    emojis: [
      '🚗',
      '🚕',
      '🚙',
      '🚌',
      '🏎️',
      '🚓',
      '🚑',
      '🚒',
      '🚚',
      '🚛',
      '🚜',
      '🏍️',
      '🛵',
      '🚲',
      '🛴',
      '✈️',
      '🚢',
      '🚁',
      '🛥️',
      '⛵',
      '🚤',
      '🛳️',
    ],
  },
  {
    label: 'Fashion',
    emojis: [
      '👗',
      '👔',
      '👕',
      '👖',
      '🧥',
      '🥼',
      '👘',
      '👙',
      '🩱',
      '🩲',
      '🩳',
      '👚',
      '👛',
      '👜',
      '👝',
      '🎒',
      '🧳',
      '👒',
      '🎩',
      '🧢',
      '👟',
      '👠',
      '👡',
      '👢',
      '🥿',
      '👞',
      '💍',
      '👓',
      '🕶️',
      '🧣',
      '🧤',
      '🧦',
    ],
  },
  {
    label: 'Home',
    emojis: [
      '🏠',
      '🏡',
      '🛋️',
      '🪑',
      '🛏️',
      '🚿',
      '🛁',
      '🪴',
      '🪞',
      '🚪',
      '🪟',
      '💐',
      '🕯️',
      '🪔',
      '🧹',
      '🧺',
      '🧻',
      '🪣',
      '🧴',
      '🔑',
      '🪝',
    ],
  },
  {
    label: 'Sports',
    emojis: [
      '⚽',
      '🏀',
      '🏈',
      '⚾',
      '🥎',
      '🎾',
      '🏐',
      '🏉',
      '🥏',
      '🎱',
      '🏓',
      '🏸',
      '🥊',
      '🥋',
      '🎽',
      '🛹',
      '🛷',
      '⛸️',
      '🏋️',
      '🤸',
      '⛷️',
      '🏊',
      '🚴',
      '🏇',
      '🎿',
      '🏹',
      '🎣',
      '🤿',
    ],
  },
  {
    label: 'Art',
    emojis: [
      '🎨',
      '🖌️',
      '🖼️',
      '🗿',
      '🏺',
      '🎭',
      '🎪',
      '🎬',
      '🎤',
      '🎵',
      '🎶',
      '🎸',
      '🎹',
      '🥁',
      '🎺',
      '🎻',
      '🪕',
      '📚',
      '📖',
      '📜',
      '🧩',
      '🪆',
      '🎠',
    ],
  },
  {
    label: 'Food',
    emojis: [
      '🍎',
      '🍊',
      '🍋',
      '🍇',
      '🍓',
      '🫐',
      '🍒',
      '🥑',
      '🥦',
      '🌽',
      '🍕',
      '🍔',
      '🍜',
      '🍣',
      '🍰',
      '☕',
      '🍵',
      '🥂',
      '🍷',
      '🍺',
      '🫖',
      '🍳',
      '🥘',
      '🔪',
      '🥄',
      '🍽️',
    ],
  },
  {
    label: 'Tools',
    emojis: [
      '🔧',
      '🔨',
      '⚒️',
      '🛠️',
      '⛏️',
      '🪛',
      '🔩',
      '🪤',
      '🧲',
      '🔭',
      '🔬',
      '⚗️',
      '🧪',
      '🪜',
      '🧰',
      '🪚',
      '🔦',
      '🕯️',
    ],
  },
  {
    label: 'Animals',
    emojis: [
      '🐶',
      '🐱',
      '🐭',
      '🐹',
      '🐰',
      '🦊',
      '🐻',
      '🐼',
      '🐨',
      '🐯',
      '🦁',
      '🐮',
      '🐷',
      '🐸',
      '🐵',
      '🐔',
      '🐧',
      '🐦',
      '🦆',
      '🦅',
      '🦉',
      '🦋',
      '🐝',
      '🐠',
      '🐬',
      '🐳',
    ],
  },
];

type Mode = 'emoji' | 'icon';

interface EmojiPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function EmojiPicker({
  value,
  onChange,
  placeholder = 'Pick an icon',
}: EmojiPickerProps) {
  const [mode, setMode] = useState<Mode>(() => (isIconId(value) ? 'icon' : 'emoji'));
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>(() =>
    mode === 'icon' ? (ICON_GROUPS[0]?.label ?? '') : (EMOJI_GROUPS[0]?.label ?? ''),
  );

  const switchMode = (next: Mode) => {
    setMode(next);
    setSearch('');
    setActiveGroup(
      next === 'icon' ? (ICON_GROUPS[0]?.label ?? '') : (EMOJI_GROUPS[0]?.label ?? ''),
    );
  };

  // --- Icon search/filter ---
  const filteredIconGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ICON_GROUPS;
    const matched = ICON_GROUPS.flatMap((g) =>
      g.icons.filter((i) => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)),
    );
    return matched.length ? [{ label: 'Results', icons: matched }] : [];
  }, [search]);

  const activeIconGroup = useMemo(() => {
    const groups = search.trim() ? filteredIconGroups : ICON_GROUPS;
    return groups.find((g) => g.label === activeGroup) ?? groups[0] ?? { label: '', icons: [] };
  }, [search, filteredIconGroups, activeGroup]);

  // --- Emoji search/filter ---
  const filteredEmojiGroups = useMemo(() => {
    if (!search.trim()) return EMOJI_GROUPS;
    const all = [...new Set(EMOJI_GROUPS.flatMap((g) => g.emojis))];
    return [{ label: 'Results', emojis: all }];
  }, [search]);

  const activeEmojiGroup = useMemo(() => {
    const groups = search.trim() ? filteredEmojiGroups : EMOJI_GROUPS;
    return groups.find((g) => g.label === activeGroup) ?? groups[0] ?? { label: '', emojis: [] };
  }, [search, filteredEmojiGroups, activeGroup]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (mode === 'icon') {
      setActiveGroup(ICON_GROUPS[0]?.label ?? '');
    } else {
      setActiveGroup(EMOJI_GROUPS[0]?.label ?? '');
    }
  };

  const currentLabel = isIconId(value) ? ICON_LABEL_MAP[value] : value;

  return (
    <div className="space-y-2">
      {/* Preview + clear */}
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg border border-border bg-muted/30 flex items-center justify-center shrink-0">
          {value ? (
            <CategoryIcon value={value} size={20} />
          ) : (
            <span className="text-muted-foreground text-xs">?</span>
          )}
        </div>
        <div className="flex-1 text-sm text-muted-foreground">
          {value ? (
            <span>
              Selected: <span className="text-foreground font-medium">{currentLabel || value}</span>
              <button
                type="button"
                onClick={() => onChange('')}
                className="ml-2 text-xs text-destructive hover:underline"
              >
                clear
              </button>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-0.5 bg-muted/40 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => switchMode('emoji')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            mode === 'emoji'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Emoji
        </button>
        <button
          type="button"
          onClick={() => switchMode('icon')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            mode === 'icon'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Icons
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={mode === 'icon' ? 'Search icons by name...' : 'Browse emojis...'}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Category tabs */}
      {!search.trim() && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {(mode === 'icon' ? ICON_GROUPS : EMOJI_GROUPS).map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => setActiveGroup(g.label)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeGroup === g.label
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="h-40 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2">
        {mode === 'icon' ? (
          activeIconGroup.icons.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No icons found</p>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {activeIconGroup.icons.map((entry) => {
                const Icon = ICON_REGISTRY[entry.id]!;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onChange(entry.id)}
                    title={entry.label}
                    className={`h-9 w-full rounded-md flex items-center justify-center transition-colors hover:bg-muted ${
                      value === entry.id ? 'bg-primary/20 ring-1 ring-primary' : ''
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {activeEmojiGroup.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onChange(emoji)}
                title={emoji}
                className={`h-9 w-full rounded-md text-xl flex items-center justify-center transition-colors hover:bg-muted ${
                  value === emoji ? 'bg-primary/20 ring-1 ring-primary' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
