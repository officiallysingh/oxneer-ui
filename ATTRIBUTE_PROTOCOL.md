# Attribute Protocol — Component Properties Guide

Attributes are a `Map<String, String>` on a property. Every type except `SIMPLE_PROPERTY` can have them:
`COMPLEX_PROPERTY`, `COMPOSITE_PROPERTY`, `LIST_PROPERTY` and `SET_PROPERTY`.

Keys use the format `namespace:key`. The frontend reads them to decide:

- **Which input widget to render** in the admin form (text, slider, toggle, pills, …)
- **How the stored value looks** on the listing page (badge, price, image, composite layout, …)

Values are always strings. Booleans are `"true"` / `"false"`.

---

## Architecture: one protocol, two surfaces, one renderer each

| Surface  | Renderer                                     | Reads                                    | Used by                                                                   |
| -------- | -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| **Form** | `components/common/attributes/AttrField.tsx` | `form:*` + `html:*` + `ui:*` + `style:*` | Listing wizard step 3, template form preview, workflow form-step previews |
| **List** | `components/common/attributes/AttrValue.tsx` | `list:*` + `style:*` + `ui:*`            | Listing detail page / dialog, template listing-view preview               |

The admin previews use the **same** renderers as the real screens, so a preview is exactly what users get.

```
attributes: Record<string, string>
        │
        ├── resolveAttrs(attrs, 'form', type) ─► AttrField   (form inputs)
        │
        └── resolveAttrs(attrs, 'list', type) ─► AttrValue / AttrPropertySections (listing view)
```

`resolveAttrs` (in `lib/attributes/protocol.ts`) returns only the keys that:

1. belong to that surface (or to `both`),
2. apply to the property type (`appliesTo`),
3. have their `showWhen` condition met (for example the `list:badge.*` keys need `list:display = badge | pill | tags`),
4. are non-empty.

Unknown (custom) keys are kept in storage but never rendered.

---

## Blocks

A **block** is a group of keys that only matter together. It is a frontend concept; storage stays a flat `key → string` map.

| Activation          | Condition                 | Example                                           |
| ------------------- | ------------------------- | ------------------------------------------------- |
| **Value-triggered** | a sibling key has a value | `list:display = price` activates `list:price.*`   |
| **Type-triggered**  | the property type matches | `COMPOSITE_PROPERTY` activates `list:composite.*` |

In the attribute editor, the key dropdown only offers keys that apply to the property type. A key whose block isn't active stays in the list with a hint like _"Active when list:display = badge / pill / tags"_. It isn't hidden, so it doesn't vanish while you're editing.

---

## Property type decision

| Situation                                 | Use                                  |
| ----------------------------------------- | ------------------------------------ |
| Leaf field, no rendering hints            | `SIMPLE_PROPERTY`                    |
| Leaf field **with** any attribute         | `COMPLEX_PROPERTY`                   |
| Group of named child fields               | `COMPOSITE_PROPERTY`                 |
| Repeating items (rows of child fields)    | `LIST_PROPERTY` with children        |
| Repeating single values (e.g. highlights) | `LIST_PROPERTY` **without** children |

A list without children renders each item with the **list's own** leaf attributes (`ui:*`, `html:*`, `list:display`, …).

---

## Namespaces

| Namespace | Surface | Purpose                                                       |
| --------- | ------- | ------------------------------------------------------------- |
| `html`    | both    | Native input attributes (placeholder, min, max, pattern, …)   |
| `ui`      | both    | Widget type (component, multiline, rating scale)              |
| `style`   | both    | Data-driven choices (options, colors)                         |
| `form`    | form    | Input look and layout, section and list behaviour in the form |
| `list`    | list    | How the stored value renders on the listing page              |

---

## `ui:component`: input widget

| Value            | Data types               | Renders                                                                                             |
| ---------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `toggle`         | BOOLEAN                  | Switch                                                                                              |
| `checkbox`       | BOOLEAN                  | Single checkbox                                                                                     |
| `segmented`      | BOOLEAN, or with options | Segmented control (Yes / No, or the options)                                                        |
| `slider`         | any number               | Range slider using `html:min` / `html:max` / `html:step`; value shows `form:prefix` / `form:suffix` |
| `stepper`        | any number               | `−` · number · `+`, clamped to `html:min` / `html:max`                                              |
| `rating`         | integer                  | Clickable stars (`ui:max` stars, default 5); click the same star to clear                           |
| `textarea`       | STRING                   | Textarea (`ui:rows`)                                                                                |
| `tag-input`      | STRING                   | Chip input, stored comma-separated                                                                  |
| `select`         | with `style:options`     | Dropdown (the default whenever options exist)                                                       |
| `radio`          | with `style:options`     | Radio group                                                                                         |
| `option-pills`   | with `style:options`     | Single-select pill buttons                                                                          |
| `multi-pills`    | with `style:options`     | Multi-select pill buttons, stored comma-separated                                                   |
| `checkbox-group` | with `style:options`     | Multi-select checkboxes, stored comma-separated                                                     |
| `color`          | STRING                   | Native color picker (stores `#rrggbb`)                                                              |

`style:options` works with STRING **and** numeric data types. For numeric types, give each option a numeric value: `60 Hz:60,120 Hz:120`.

## `ui:*` (other keys)

| Key            | Value          | Effect                                                       |
| -------------- | -------------- | ------------------------------------------------------------ |
| `ui:multiline` | `true`/`false` | STRING renders as a textarea                                 |
| `ui:rows`      | number         | Textarea rows (default 3)                                    |
| `ui:max`       | number         | Stars for `ui:component = rating` (also used by list rating) |
| `ui:display`   | legacy         | Old display hint. `list:display` wins when both are set      |

## `html:*`

| Key                     | Effect                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| `html:placeholder`      | Placeholder text                                                             |
| `html:min` / `html:max` | Min/max value for numbers, sliders, steppers, years; min/max length for text |
| `html:step`             | Step for numbers, steppers, sliders                                          |
| `html:pattern`          | Regex for text inputs                                                        |
| `html:maxlength`        | Max characters (also the limit for `form:show-count`)                        |
| `html:accept`           | File MIME filter (`image/*`, `application/pdf`, …)                           |
| `html:type`             | `email` · `tel` · `url` · `password` · `search`                              |
| `html:inputmode`        | Mobile keyboard hint (`numeric`, `decimal`, `tel`, …)                        |
| `html:autocomplete`     | Browser autocomplete hint                                                    |

## `style:*`

| Key                   | Format                                     | Effect                                          |
| --------------------- | ------------------------------------------ | ----------------------------------------------- |
| `style:options`       | `Label:value,Label:value` or `value,value` | Choices for select / radio / pills / checkboxes |
| `style:color-options` | `black,red,#1A2B3C`                        | Clickable swatches; stored value = the color    |

The first unescaped `:` separates label from value, so `Morning:09:30` has the value `09:30`. Escape a literal comma or colon with a backslash: `A\, B`, `10\:30`.

---

## `form:*`: form rendering

### Field keys (leaf properties)

| Key                           | Options                                                  | Effect                                                                     |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `form:size`                   | `sm` · `md` · `lg` · `xl`                                | Input height, padding and font size                                        |
| `form:variant`                | `default` · `outline` · `ghost` · `filled` · `underline` | Input container style                                                      |
| `form:width`                  | `full` · `half` · `auto` · `fixed`                       | Input width                                                                |
| `form:layout`                 | `vertical` · `horizontal` · `inline`                     | Label and input arrangement (horizontal stacks on mobile)                  |
| `form:label.position`         | `top` · `left` · `hidden`                                | `left` = horizontal layout; `hidden` keeps the label for screen readers    |
| `form:helper-text`            | text                                                     | Hint below the field (linked with `aria-describedby`)                      |
| `form:prefix` / `form:suffix` | text                                                     | Static add-on before/after the input (`₹`, `kg`, `https://`)               |
| `form:show-count`             | `true`                                                   | Character counter, `n / html:maxlength`                                    |
| `form:readonly`               | `true`                                                   | Visible but not editable. On a composite or list, it locks every child too |

### Section keys (composite and list)

| Key                | Applies to      | Effect                                                                           |
| ------------------ | --------------- | -------------------------------------------------------------------------------- |
| `form:columns`     | COMPOSITE       | Child fields in 1–4 columns from `md` up                                         |
| `form:collapsible` | COMPOSITE, LIST | `true` = collapsible, `collapsed` = starts closed                                |
| `form:helper-text` | COMPOSITE, LIST | Description under the section header                                             |
| `form:min-items`   | LIST, SET       | Remove is disabled at this count                                                 |
| `form:max-items`   | LIST, SET       | Add is disabled at this count; the header shows `n / max`                        |
| `form:add-label`   | LIST, SET       | Add button text (default "Add item")                                             |
| `form:item-label`  | LIST, SET       | Item header template: `{n}` = position, `{field}` = a child value, e.g. `{name}` |

List items can be moved up and down and removed. Every icon button has an accessible label.

---

## `list:*`: listing rendering

### Common keys

| Key                           | Options / type                                                                                                                                            | Effect                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `list:display`                | see below                                                                                                                                                 | Primary render mode                                            |
| `list:prefix` / `list:suffix` | text                                                                                                                                                      | Text around the value                                          |
| `list:format`                 | `raw` · `number` · `compact` · `currency` · `percentage` · `bytes` · `date` · `datetime` · `time` · `relative` · `uppercase` · `lowercase` · `capitalize` | Formats the value. Values that don't parse are shown unchanged |
| `list:decimals`               | number                                                                                                                                                    | Fraction digits for number / currency / percentage / price     |
| `list:truncate`               | number                                                                                                                                                    | Max characters before `…` (full text in the tooltip)           |
| `list:empty`                  | text                                                                                                                                                      | Shown for blank values (default `—`)                           |
| `list:hidden`                 | `true`                                                                                                                                                    | Collected in the form, never shown in the listing              |
| `list:span`                   | `auto` · `full`                                                                                                                                           | Full row in the two-column field grid                          |
| `list:hide-label`             | `true`                                                                                                                                                    | Value without its label                                        |

When `style:options` is set, values are shown with their option **label** (`active` → "Active").

### `list:display` modes

| Value                      | Renders                                          | Block keys             |
| -------------------------- | ------------------------------------------------ | ---------------------- |
| `text`                     | Formatted text (default)                         | —                      |
| `badge` / `pill`           | Tinted badge (square or round corners)           | `list:badge.*`         |
| `tags`                     | Comma-separated value as several badges          | `list:badge.*`         |
| `options`                  | Every option, with the stored one(s) highlighted | —                      |
| `color-swatch`             | Swatches                                         | `list:swatch.show-all` |
| `image` / `image-grid`     | Image, or a grid of comma-separated image URLs   | `list:image.*`         |
| `icon`                     | Icon by name                                     | —                      |
| `price`                    | Localized currency (`₹1,39,900`)                 | `list:price.*`         |
| `rating`                   | Stars                                            | `list:rating.max`      |
| `truncated`                | Text cut at `list:truncate` (default 80)         | —                      |
| `multiline`                | Text with line breaks preserved                  | —                      |
| `link` / `email` / `phone` | Link, `mailto:` or `tel:`                        | `list:link.*`          |
| `boolean`                  | Yes / No with custom labels                      | `list:boolean.*`       |
| `progress`                 | Progress bar                                     | `list:progress.*`      |
| `monospace`                | Code-style text (SKUs, IDs)                      | —                      |

Defaults when `list:display` isn't set:

| Condition                                    | Default        |
| -------------------------------------------- | -------------- |
| `ui:component = rating`                      | `rating`       |
| `tag-input`, `multi-pills`, `checkbox-group` | `tags`         |
| `option-pills`                               | `options`      |
| `style:color-options` set                    | `color-swatch` |
| BOOLEAN                                      | `boolean`      |
| `ui:multiline`, `textarea`                   | `multiline`    |

Address, coordinates, duration (`1h 30m`), period (`1y 2mo`), month and day are formatted automatically.

Links are only rendered for `http(s)`, `mailto:`, `tel:` and relative URLs. Others (for example `javascript:`) render as plain text.

### Value-triggered blocks

| Key                            | Options                                                                          | Notes                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `list:badge.color`             | `primary` · `success` · `warning` · `danger` · `info` · `muted`                  | Tone for every value                                                               |
| `list:badge.color-map`         | `value:tone,…` e.g. `active:success,pending:warning,inactive:danger`             | Per-value tone (wins over `color`)                                                 |
| `list:badge.variant`           | `soft` · `solid` · `outline`                                                     |                                                                                    |
| `list:badge.size`              | `sm` · `md` · `lg`                                                               |                                                                                    |
| `list:badge.dot`               | `true`                                                                           | Leading status dot                                                                 |
| `list:image.size`              | `xs` · `sm` · `md` · `lg` · `xl` · `full`                                        |                                                                                    |
| `list:image.shape`             | `square` · `rounded` · `circle`                                                  |                                                                                    |
| `list:image.fit`               | `cover` · `contain` · `fill`                                                     |                                                                                    |
| `list:price.currency`          | `INR` · `USD` · `EUR` · `GBP` · `AED` · `AUD` · `CAD` · `SGD` · `JPY` · `custom` | Also used by `list:format = currency`. `custom` = number only, add `list:prefix`   |
| `list:price.format`            | `symbol` · `code` · `name`                                                       | `₹1,000` · `INR 1,000` · `1,000 Indian rupees`                                     |
| `list:price.size`              | `sm` · `md` · `lg` · `xl`                                                        |                                                                                    |
| `list:rating.max`              | number                                                                           | Default `ui:max` or 5                                                              |
| `list:swatch.show-all`         | `true` · `false`                                                                 | All swatches with the selected one highlighted (default), or only the stored color |
| `list:link.label`              | text                                                                             | Link text; blank = the URL                                                         |
| `list:link.new-tab`            | `true` · `false`                                                                 | Default `true`                                                                     |
| `list:boolean.true` / `.false` | text                                                                             | Default Yes / No                                                                   |
| `list:boolean.style`           | `icon` · `badge` · `text`                                                        |                                                                                    |
| `list:progress.max`            | number                                                                           | Default 100                                                                        |
| `list:progress.label`          | `percent` · `value` · `none`                                                     |                                                                                    |

### Type-triggered blocks

#### `list:composite.*` (COMPOSITE_PROPERTY)

Top-level composites render as their own section card on the listing page. Nested composites render inline inside their parent.

| Key                          | Options                                                                                                                                                                                                                                                            | Default  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `list:composite.layout`      | `table` · `definition` · `grid` · `card` · `inline` · `hidden`                                                                                                                                                                                                     | `table`  |
| `list:composite.columns`     | `1`–`6` (grid / card)                                                                                                                                                                                                                                              | `2`      |
| `list:composite.gap`         | `tight` · `normal` · `loose`                                                                                                                                                                                                                                       | `normal` |
| `list:composite.label-width` | `sm` · `md` · `lg` · `xl` (table / definition)                                                                                                                                                                                                                     | `md`     |
| `list:composite.icon`        | `info` · `monitor` · `smartphone` · `camera` · `battery` · `cpu` · `hard-drive` · `wifi` · `ruler` · `package` · `truck` · `shield` · `zap` · `palette` · `settings` · `tag` · `calendar` · `map-pin` · `file-text` · `image` · `car` · `home` · `star` · `wrench` | none     |
| `list:composite.show-empty`  | `true` · `false`                                                                                                                                                                                                                                                   | `true`   |

```
table (default)          definition              grid / card (2 cols)      inline
┌────────────────────┐   Label1   value1         ┌────────┬────────┐       Label1: value1 · Label2: value2
│ Label1    value1   │   Label2   value2         │ Label1 │ Label2 │
│ Label2    value2   │                           │ value1 │ value2 │
└────────────────────┘                           └────────┴────────┘
```

All layouts collapse to one column on mobile.

#### `list:list.*` (LIST_PROPERTY / SET_PROPERTY)

| Key                    | Options                                                           | Default                                         |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| `list:list.layout`     | `cards` · `table` · `inline` · `compact` · `bullets` · `numbered` | `cards` with children, `inline` (chips) without |
| `list:list.item-style` | `flat` · `card` · `bordered` · `separated`                        | `bordered` with children, `flat` without        |

`table` shows child fields as columns, and turns into cards below `sm`.

---

## Creating component properties: step by step

1. **Pick the type.** Leaf value → `COMPLEX_PROPERTY`. Group → `COMPOSITE_PROPERTY`. Repeating → `LIST_PROPERTY`.
2. **Pick the dataType.** Short text `STRING`; long text `STRING` + `ui:multiline`; whole number `INTEGER`; decimal `FLOAT`; yes/no `BOOLEAN`; date `LOCAL_DATE`; date and time `LOCAL_DATE_TIME`; email or phone `STRING` + `html:type`; file `FILE`.
3. **Configure the form input**, for example:
   ```
   dataType: INTEGER
   ui:component   → slider
   html:min       → 0
   html:max       → 100000
   html:step      → 1000
   form:prefix    → ₹
   ```
4. **Configure the listing display**, for example:
   ```
   dataType: STRING
   style:options         → Active:active,Pending:pending,Inactive:inactive
   list:display          → badge
   list:badge.color-map  → active:success,pending:warning,inactive:danger
   list:badge.dot        → true
   ```
5. **Group spec sections** in composites with `list:composite.layout` and `list:composite.icon`.
6. **Repeat items** with lists: `form:max-items`, `form:item-label`, `list:list.layout`.

---

## Adding a new key

1. Add an entry to `ATTRIBUTE_PROTOCOL` in `apps/web/src/lib/attributes/protocol.ts` with `surface`, `group`, `valueType` / `options`, and `appliesTo` / `showWhen` if it belongs to a block.
2. Read it in the renderer: `ScalarControl` / `ScalarFieldGroup` / the section components in `AttrField.tsx` (form), or `ScalarValue` / `CompositeView` / `ListView` in `AttrValue.tsx` (list). Pure helpers (parsing, formatting) go in `lib/attributes/values.ts`, with a test in `lib/attributes/__tests__`.
3. Nothing else to wire. The attribute editor dropdown, its hints and `resolveAttrs` filtering all read the protocol.

Missing keys always fall back to the defaults above, so existing properties render the same.

---

## Examples

### Compact form input with a horizontal label

```
dataType: STRING
html:placeholder    → e.g. SKU-001-BLK
form:size           → sm
form:variant        → outline
form:label.position → left
list:display        → monospace
```

### Status badge with per-value colours

```
dataType:             STRING
style:options         → Active:active,Inactive:inactive,Pending:pending
ui:component          → option-pills
list:display          → badge
list:badge.color-map  → active:success,pending:warning,inactive:danger
list:badge.variant    → soft
```

### Price

```
dataType:            INTEGER
ui:component         → slider
html:min             → 0
html:max             → 100000
html:step            → 500
form:prefix          → ₹
list:display         → price
list:price.currency  → INR
list:price.size      → lg
```

### Percentage

```
dataType:      FLOAT
html:min       → 0
html:max       → 100
html:step      → 0.5
form:suffix    → %
list:format    → percentage
list:decimals  → 1
```

### Multi-select features

```
dataType:       STRING
style:options   → Wi-Fi:wifi,Bluetooth:bt,NFC:nfc,5G:5g
ui:component    → checkbox-group
list:display    → tags
```

### Spec sheet section

```
COMPOSITE "Battery"
  list:composite.layout      → definition
  list:composite.label-width → lg
  list:composite.icon        → battery

  ─ capacity     → INTEGER  list:suffix → " mAh"   list:format → number
  ─ charging     → STRING
  ─ battery_life → STRING
```

### Repeating rows as a table

```
LIST "Previous owners"
  form:max-items    → 5
  form:item-label   → {name}
  list:list.layout  → table

  ─ name   → STRING
  ─ year   → YEAR
```

### Product image

```
dataType:          FILE
html:accept        → image/*
list:display       → image
list:image.size    → md
list:image.shape   → rounded
```

---

## Full managed type example: Mobile Phone

This showcases: **composites with 5 layout modes · price block · image block · badge list · option pills · form sizing · tag-input · color swatches · list display modes**

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/managed-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Mobile Phone",
    "description": "Product spec page with composites, price block, image gallery, and spec sections",
    "type": "CATALOGUE",
    "tags": ["mobile", "electronics", "phone"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "product_title",
        "label": "Product Title",
        "dataType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. Apple iPhone 16 Pro Max 256 GB"
        },
        "validators": [{ "type": "NOT_NULL" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "selling_price",
        "label": "Selling Price",
        "dataType": "INTEGER",
        "attributes": {
          "html:min": "0",
          "html:placeholder": "139900",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol",
          "list:price.size": "lg",
          "form:prefix": "₹",
          "form:size": "lg"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "rating",
        "label": "Rating",
        "dataType": "INTEGER",
        "attributes": {
          "ui:component": "rating",
          "list:display": "rating"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "main_image",
        "label": "Main Image",
        "dataType": "FILE",
        "attributes": {
          "html:accept": "image/*",
          "list:display": "image",
          "list:image.size": "lg",
          "list:image.shape": "rounded",
          "list:image.fit": "cover"
        }
      },
      {
        "type": "LIST_PROPERTY",
        "name": "highlights",
        "label": "Key Highlights",
        "dataType": "STRING",
        "attributes": {
          "list:list.layout": "inline",
          "list:list.item-style": "separated",
          "list:prefix": "✓"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "highlight",
            "label": "Highlight",
            "dataType": "STRING",
            "attributes": { "html:placeholder": "e.g. A18 Pro Chip" }
          }
        ]
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "display_specs",
        "label": "Display",
        "dataType": "STRING",
        "attributes": {
          "list:composite.layout": "card"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "screen_size",
            "label": "Screen Size",
            "dataType": "FLOAT",
            "attributes": {
              "html:min": "3.0",
              "html:max": "10.0",
              "html:step": "0.1",
              "html:placeholder": "6.9",
              "list:suffix": " inches",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "resolution",
            "label": "Resolution",
            "dataType": "STRING",
            "attributes": {
              "html:placeholder": "2868 × 1320 pixels",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "display_type",
            "label": "Type",
            "dataType": "STRING",
            "attributes": {
              "style:options": "Super Retina XDR OLED,Liquid Retina HD,LTPO AMOLED",
              "ui:component": "option-pills",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "refresh_rate",
            "label": "Refresh Rate",
            "dataType": "INTEGER",
            "attributes": {
              "style:options": "60 Hz:60,90 Hz:90,120 Hz:120,144 Hz:144",
              "ui:component": "option-pills",
              "form:size": "sm"
            }
          }
        ]
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "camera_specs",
        "label": "Camera",
        "dataType": "STRING",
        "attributes": {
          "list:composite.layout": "grid",
          "list:composite.columns": "2"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "rear_camera",
            "label": "Rear Camera",
            "dataType": "STRING",
            "attributes": { "html:placeholder": "48MP + 12MP + 12MP" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "front_camera",
            "label": "Front Camera",
            "dataType": "STRING",
            "attributes": { "html:placeholder": "12MP TrueDepth" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "video_recording",
            "label": "Video",
            "dataType": "STRING",
            "attributes": { "html:placeholder": "4K @ 24/30/60fps" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "features",
            "label": "Camera Features",
            "dataType": "STRING",
            "attributes": {
              "ui:component": "tag-input",
              "html:placeholder": "Night mode,Portrait,Cinematic…"
            }
          }
        ]
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "battery",
        "label": "Battery",
        "dataType": "STRING",
        "attributes": {
          "list:composite.layout": "definition",
          "list:composite.label-width": "lg",
          "list:composite.icon": "battery"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "capacity",
            "label": "Capacity",
            "dataType": "INTEGER",
            "attributes": {
              "list:suffix": " mAh",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "charging",
            "label": "Charging",
            "dataType": "STRING",
            "attributes": {
              "html:placeholder": "27W wired, 25W MagSafe",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "battery_life",
            "label": "Battery Life",
            "dataType": "STRING",
            "attributes": {
              "html:placeholder": "Up to 33 hours video playback",
              "form:size": "sm"
            }
          }
        ]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "description",
        "label": "Description",
        "dataType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "6",
          "form:size": "lg",
          "html:placeholder": "Write a detailed description…"
        }
      }
    ]
  }' | jq '.'
```

---

---

## Curl cookbook

> **Prerequisites**
>
> - Server running at `http://localhost:8090`
> - Log in once and export a token:
>   ```bash
>   TOKEN=$(curl -s -X POST http://localhost:8090/api/v1/auth/login \
>     -H "Content-Type: application/json" \
>     -d '{"username":"admin","password":"admin"}' | jq -r '.token')
>   ```
> - `jq` must be installed

---

### Components — CRUD

#### Create a "Dimensions" component

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Dimensions",
    "description": "Physical dimensions — length, width, height in cm",
    "tags": ["physical", "measurements"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "length",
        "label": "Length",
        "dataType": "FLOAT",
        "attributes": { "html:min": "0", "html:max": "500", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal" }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "width",
        "label": "Width",
        "dataType": "FLOAT",
        "attributes": { "html:min": "0", "html:max": "500", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal" }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "height",
        "label": "Height",
        "dataType": "FLOAT",
        "attributes": { "html:min": "0", "html:max": "500", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal" }
      }
    ]
  }' | jq '.'
```

#### Create a "Status Badge" component

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Status Badge",
    "description": "Selectable status field displayed as a coloured badge in listings",
    "tags": ["status", "badge"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "status",
        "label": "Status",
        "dataType": "STRING",
        "attributes": {
          "style:options": "Active:active,Inactive:inactive,Pending:pending,Archived:archived",
          "ui:component": "option-pills",
          "list:display": "badge",
          "list:badge.color": "success",
          "list:badge.variant": "soft",
          "list:badge.size": "sm"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Status is required" }]
      }
    ]
  }' | jq '.'
```

#### Create a "Price Range" component

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Price Range",
    "description": "Min / max price sliders with INR display",
    "tags": ["price", "range"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "min_price",
        "label": "Min Price",
        "dataType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "500000",
          "html:step": "1000",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "max_price",
        "label": "Max Price",
        "dataType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "500000",
          "html:step": "1000",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol"
        }
      }
    ]
  }' | jq '.'
```

#### List components (with optional phrase search)

```bash
# All components
curl -s "http://localhost:8090/api/v1/meta-data/components" \
  -H "Authorization: Bearer $TOKEN" | jq '.content[] | {id, name}'

# Search by phrase
curl -s "http://localhost:8090/api/v1/meta-data/components?phrases=price" \
  -H "Authorization: Bearer $TOKEN" | jq '.content[] | {id, name}'
```

#### Get a component by ID

```bash
COMP_ID="<component-id>"
curl -s "http://localhost:8090/api/v1/meta-data/components/$COMP_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

#### Update a component (PATCH)

```bash
curl -s -X PATCH "http://localhost:8090/api/v1/meta-data/components/$COMP_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "description": "Updated description" }' | jq '.'
```

#### Delete a component

```bash
curl -s -X DELETE "http://localhost:8090/api/v1/meta-data/components/$COMP_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Managed Types — with `form:*` and `list:*` attributes

#### Managed Type — Electronics Listing

Showcases: **status badge · price slider · image upload · tag input · composite dimensions · `form:*` sizing · `list:*` display**

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/managed-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Electronics Listing",
    "description": "Catalog type for electronics — showcases form/list attribute styling",
    "type": "CATALOGUE",
    "tags": ["electronics", "showcase"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "brand",
        "label": "Brand",
        "dataType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. Samsung, Apple",
          "form:size": "md",
          "form:variant": "filled",
          "form:width": "full"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Brand is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "status",
        "label": "Status",
        "dataType": "STRING",
        "attributes": {
          "style:options": "Active:active,Inactive:inactive,Pending:pending",
          "ui:component": "option-pills",
          "list:display": "badge",
          "list:badge.color": "success",
          "list:badge.variant": "soft",
          "list:badge.size": "sm"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "price",
        "label": "Price",
        "dataType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "200000",
          "html:step": "500",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol",
          "list:price.size": "md"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "color",
        "label": "Color",
        "dataType": "STRING",
        "attributes": {
          "style:color-options": "black,white,silver,gold,blue,red",
          "list:display": "color-swatch"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "product_image",
        "label": "Product Image",
        "dataType": "FILE",
        "attributes": {
          "html:accept": "image/*",
          "list:display": "image",
          "list:image.size": "sm",
          "list:image.shape": "rounded",
          "list:image.fit": "cover"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "in_stock",
        "label": "In Stock",
        "dataType": "BOOLEAN",
        "attributes": {
          "ui:component": "toggle",
          "form:layout": "inline"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "keywords",
        "label": "Keywords",
        "dataType": "STRING",
        "attributes": {
          "ui:component": "tag-input",
          "html:placeholder": "Add keywords…",
          "form:helper-text": "Used for search indexing"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "description",
        "label": "Description",
        "dataType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "4",
          "html:placeholder": "Describe the product…",
          "list:display": "truncated",
          "list:truncate": "120"
        }
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "dimensions",
        "label": "Dimensions",
        "dataType": "STRING",
        "attributes": {
          "list:composite.layout": "inline"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "length",
            "label": "Length",
            "dataType": "FLOAT",
            "attributes": { "html:min": "0", "html:max": "200", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal", "list:suffix": " cm" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "width",
            "label": "Width",
            "dataType": "FLOAT",
            "attributes": { "html:min": "0", "html:max": "200", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal", "list:suffix": " cm" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "weight",
            "label": "Weight",
            "dataType": "FLOAT",
            "attributes": { "html:min": "0", "html:max": "50", "html:step": "0.01", "html:placeholder": "kg", "form:size": "sm", "form:layout": "horizontal", "list:suffix": " kg" }
          }
        ]
      }
    ]
  }' | jq '.'
```

---

### Listings — create and populate

```bash
# Capture managed type ID from create response above
ELECTRONICS_TYPE_ID="<id-from-electronics-response>"
SUB_CATEGORY_ID="<your-subcategory-id>"

# Create the listing
LISTING_ID=$(curl -s -X POST http://localhost:8090/api/v1/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Samsung Galaxy S24 Ultra",
    "description": "Latest Samsung flagship with S-Pen",
    "subCategory": "'"$SUB_CATEGORY_ID"'",
    "tags": ["samsung", "smartphone", "flagship"]
  }' | jq -r '.id')

echo "Created listing: $LISTING_ID"

# Patch with catalog data
curl -s -X PATCH "http://localhost:8090/api/v1/listings/$LISTING_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "embedded": {
      "typeId": "'"$ELECTRONICS_TYPE_ID"'",
      "pathWiseState": {
        "brand": "Samsung",
        "status": "active",
        "price": "124999",
        "color": "black",
        "in_stock": "true",
        "keywords": "samsung,s24,ultra,spen,flagship",
        "description": "The Samsung Galaxy S24 Ultra features a 6.8-inch Dynamic AMOLED display, Snapdragon 8 Gen 3, and built-in S-Pen.",
        "dimensions": {
          "length": "16.27",
          "width": "7.9",
          "weight": "0.232"
        }
      }
    }
  }' | jq '.'
```

---

## Source files

| File                                                      | Purpose                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/web/src/lib/attributes/protocol.ts`                 | Key definitions (`ATTRIBUTE_PROTOCOL`), `resolveAttrs`, `inactiveReason`           |
| `apps/web/src/lib/attributes/values.ts`                   | Option parsing, coercion, formatting, price, safe links, embedded-data normalizing |
| `apps/web/src/components/common/attributes/AttrField.tsx` | Form renderer (`AttrField`, `ScalarControl`)                                       |
| `apps/web/src/components/common/attributes/AttrValue.tsx` | Listing renderer (`AttrValue`, `AttrPropertySections`)                             |
| `admin/metadata/_components/AttributeEditor.tsx`          | Key/value row in the property builder; reads the protocol                          |
| `admin/metadata/_components/PropertyRow.tsx`              | Attribute rows of a property (stable rows, duplicate-safe)                         |
| `admin/metadata/_components/PropertyFormPreview.tsx`      | Form and listing previews with sample values, using the shared renderers           |
| `admin/listings/_components/Step3Catalog.tsx`             | Listing wizard catalog step (`AttrField`)                                          |
| `admin/listings/_components/ListingDetailContent.tsx`     | Listing detail (`AttrPropertySections`)                                            |
