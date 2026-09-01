# Token reference

*Generated from [`helix/styles/src/tokens.ts`](../../../helix/styles/src/tokens.ts) by
`turbo run tokens`. Do not edit.*

185 semantic tokens in 15 categories, every one in exactly
one. These are the whole of what a component or an app may use. The primitive
layer underneath (`--_helix-neutral-500` and its kind) is `helix/styles`'s own
business and the `tokens` rule fails on any reference to it from outside.

Per-component hooks (`--card-padding`, `--drawer-radii`) are not tokens and are
not here. They are API, they default to a semantic token, and the `hooks` rule
holds them to both directions.

**Light** and **Dark** are the sRGB the default palette paints, with the seeds
left alone. Set `--helix-seed-brand` or any of the other three and these move;
the token names and the relationships between them do not, which is the point
of the indirection. A token holding one color in both schemes says so rather
than printing the same hex twice. An eight-digit value is a translucent token,
and the last pair of digits is its alpha.

**Reads** counts every `var()` of that token across `helix` and
`site`, the sandbox included. Zero is not a fault: a complete scale is part of what is shipped and
a consumer can reach for a rung we happen not to use. It is worth seeing
because nothing else can see it, the `tokens` rule asking only that every token
*referenced* exists.

Currently unread anywhere: `--helix-color-accent-active`, `--helix-color-accent-subtle`, `--helix-color-info-surface`, `--helix-color-info-surface-hover`, `--helix-color-success-surface`, `--helix-color-success-surface-hover`, `--helix-color-warning-surface`, `--helix-color-warning-surface-hover`, `--helix-tracking-wider`, `--helix-material-blur-sm`, `--helix-size-checkbox-tight`, `--helix-size-checkbox-loose`, `--helix-size-avatar-md`, `--helix-layer-beneath`.

## color

Every color, resolved through `light-dark()` so a theme needs no second file.

| Token | Value | Light | Dark | Reads |
|---|---|---|---|---|
| `--helix-color-background` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-1000))` | `#ffffff` | `#000000` | 81 |
| `--helix-color-surface` | `light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))` | `#fafafa` | `#121212` | 40 |
| `--helix-color-surface-raised` | `light-dark(var(--_helix-neutral-100), var(--_helix-neutral-800))` | `#f5f5f5` | `#181818` | 20 |
| `--helix-color-surface-overlay` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-800))` | `#ffffff` | `#181818` | 24 |
| `--helix-color-surface-sunken` | `light-dark(var(--_helix-neutral-200), var(--_helix-neutral-950))` | `#f2f2f2` | `#0b0b0b` | 56 |
| `--helix-color-well` | `color-mix(in oklab, var(--helix-color-foreground) 5%, transparent)` | `#0000000d` | `#ffffff0d` | 10 |
| `--helix-color-overlay` | `light-dark( color-mix(in oklab, var(--_helix-neutral-950) 40%, transparent), color-mix(in oklab, var(--_helix-neutral-950) 64%, transparent) )` | `#0b0b0b66` | `#0b0b0ba3` | 11 |
| `--helix-color-foreground` | `light-dark(var(--_helix-neutral-1000), var(--_helix-neutral-0))` | `#000000` | `#ffffff` | 195 |
| `--helix-color-foreground-muted` | `light-dark(var(--_helix-neutral-600), var(--_helix-neutral-400))` | `#636363` | `#a1a1a1` | 129 |
| `--helix-color-foreground-subtle` | `light-dark(var(--_helix-neutral-550), var(--_helix-neutral-450))` | `#6c6c6c` | `#959595` | 90 |
| `--helix-color-foreground-on-accent` | `var(--_helix-neutral-0)` | `#ffffff` | as light | 26 |
| `--helix-color-surface-inverse` | `light-dark(var(--_helix-neutral-900), var(--_helix-neutral-100))` | `#121212` | `#f5f5f5` | 11 |
| `--helix-color-foreground-inverse` | `light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))` | `#fafafa` | `#121212` | 8 |
| `--helix-color-surface-media` | `light-dark(var(--_helix-neutral-1000), var(--_helix-neutral-1000))` | `#000000` | as light | 3 |
| `--helix-color-foreground-media` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-0))` | `#ffffff` | as light | 4 |
| `--helix-color-border` | `light-dark(color-mix(in oklab, var(--_helix-neutral-300) 60%, var(--_helix-neutral-200)), color-mix(in oklab, var(--_helix-neutral-700) 30%, var(--_helix-neutral-800)))` | `#e8e8e8` | `#212121` | 152 |
| `--helix-color-primary` | `light-dark(var(--_helix-brand-500), var(--_helix-brand-400))` | `#1068da` | `#4192ff` | 113 |
| `--helix-color-primary-hover` | `light-dark(var(--_helix-brand-600), var(--_helix-brand-300))` | `#0059c8` | `#51a2ff` | 4 |
| `--helix-color-primary-active` | `light-dark(var(--_helix-brand-700), var(--_helix-brand-200))` | `#0049b8` | `#61b3ff` | 5 |
| `--helix-color-primary-subtle` | `light-dark(var(--_helix-brand-50), var(--_helix-brand-900))` | `#dbf0ff` | `#042756` | 4 |
| `--helix-color-accent` | `light-dark(var(--_helix-accent-500), var(--_helix-accent-400))` | `#a85800` | `#cf7d00` | 12 |
| `--helix-color-accent-hover` | `var(--_helix-accent-600)` | `#984900` | as light | 3 |
| `--helix-color-accent-active` | `var(--_helix-accent-700)` | `#883900` | as light | 0 |
| `--helix-color-accent-subtle` | `light-dark(var(--_helix-accent-50), var(--_helix-accent-900))` | `#ffebcc` | `#412000` | 0 |
| `--helix-color-accent-surface` | `var(--_helix-accent-600)` | `#984900` | as light | 3 |
| `--helix-color-accent-surface-hover` | `var(--_helix-accent-700)` | `#883900` | as light | 3 |
| `--helix-color-primary-surface` | `var(--_helix-brand-600)` | `#0059c8` | as light | 11 |
| `--helix-color-primary-surface-hover` | `var(--_helix-brand-700)` | `#0049b8` | as light | 3 |
| `--helix-color-focus-ring` | `var(--_helix-brand-500)` | `#1068da` | as light | 70 |
| `--helix-color-brand-mark` | `light-dark(var(--_helix-brand-500), var(--_helix-brand-400))` | `#1068da` | `#4192ff` | 1 |
| `--helix-color-syntax-callable` | `light-dark( var(--_helix-syntax-callable-light), var(--_helix-syntax-callable-dark) )` | `#8756e5` | `#d2a8ff` | 3 |
| `--helix-color-syntax-comment` | `light-dark( var(--_helix-syntax-comment-light), var(--_helix-syntax-comment-dark) )` | `#727b85` | `#8b949e` | 2 |
| `--helix-color-syntax-constant` | `light-dark( var(--_helix-syntax-constant-light), var(--_helix-syntax-constant-dark) )` | `#b45528` | `#ffa657` | 2 |
| `--helix-color-syntax-invalid` | `light-dark( var(--_helix-syntax-invalid-light), var(--_helix-syntax-invalid-dark) )` | `#a8353c` | `#ffa198` | 1 |
| `--helix-color-syntax-keyword` | `light-dark( var(--_helix-syntax-keyword-light), var(--_helix-syntax-keyword-dark) )` | `#d92f37` | `#ff7b72` | 3 |
| `--helix-color-syntax-name` | `light-dark( var(--_helix-syntax-name-light), var(--_helix-syntax-name-dark) )` | `#2b6ecf` | `#79c0ff` | 4 |
| `--helix-color-syntax-string` | `light-dark( var(--_helix-syntax-string-light), var(--_helix-syntax-string-dark) )` | `#3c63a0` | `#a5d6ff` | 1 |
| `--helix-color-syntax-tag` | `light-dark( var(--_helix-syntax-tag-light), var(--_helix-syntax-tag-dark) )` | `#368145` | `#7ee787` | 3 |
| `--helix-color-series-1` | `light-dark( oklch( from var(--_helix-seed-brand) 0.595 calc(0.221 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ), oklch( from var(--_helix-seed-brand) 0.62 calc(0.206 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ) )` | `#0077fe` | `#2481ff` | 7 |
| `--helix-color-series-2` | `light-dark( oklch( from var(--_helix-seed-brand) 0.645 calc(0.238 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ), oklch( from var(--_helix-seed-brand) 0.645 calc(0.238 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ) )` | `#fd3500` | as light | 5 |
| `--helix-color-series-3` | `light-dark( oklch( from var(--_helix-seed-brand) 0.625 calc(0.126 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ), oklch( from var(--_helix-seed-brand) 0.885 calc(0.179 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ) )` | `#039f79` | `#02fec2` | 6 |
| `--helix-color-series-4` | `light-dark( oklch( from var(--_helix-seed-brand) 0.565 calc(0.295 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ), oklch( from var(--_helix-seed-brand) 0.62 calc(0.252 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ) )` | `#9d05ff` | `#a74bff` | 5 |
| `--helix-color-series-5` | `light-dark( oklch( from var(--_helix-seed-brand) 0.64 calc(0.133 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ), oklch( from var(--_helix-seed-brand) 0.815 calc(0.17 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ) )` | `#b88002` | `#feb200` | 5 |
| `--helix-color-series-6` | `light-dark( oklch( from var(--_helix-seed-brand) 0.63 calc(0.11 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ), oklch( from var(--_helix-seed-brand) 0.825 calc(0.144 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ) )` | `#029ab1` | `#04ddfd` | 5 |
| `--helix-color-series-7` | `light-dark( oklch( from var(--_helix-seed-brand) 0.66 calc(0.277 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ), oklch( from var(--_helix-seed-brand) 0.66 calc(0.277 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ) )` | `#fe01af` | as light | 5 |
| `--helix-color-series-8` | `light-dark( oklch( from var(--_helix-seed-brand) 0.63 calc(0.154 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ), oklch( from var(--_helix-seed-brand) 0.895 calc(0.219 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ) )` | `#789702` | `#c2f205` | 5 |
| `--helix-color-series-9` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ) )` | `#2d67bb` | `#679ff1` | 5 |
| `--helix-color-series-10` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.129 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ) )` | `#c85a44` | `#ff9781` | 5 |
| `--helix-color-series-11` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.105 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ) )` | `#017c5d` | `#21b98e` | 5 |
| `--helix-color-series-12` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ) )` | `#9268c7` | `#c9a1fe` | 5 |
| `--helix-color-series-13` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.108 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ) )` | `#8b6001` | `#cc9225` | 5 |
| `--helix-color-series-14` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.105 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ) )` | `#0090a5` | `#0fcdeb` | 5 |
| `--helix-color-series-15` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ) )` | `#a23f77` | `#db79ad` | 5 |
| `--helix-color-series-16` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.145 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.135 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ) )` | `#708d08` | `#a7c55e` | 5 |
| `--helix-color-series-17` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-1)) ) )` | `#4f6a91` | `#84a0ca` | 5 |
| `--helix-color-series-18` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-2)) ) )` | `#a67165` | `#e0a89b` | 5 |
| `--helix-color-series-19` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-3)) ) )` | `#3c7661` | `#72ad96` | 5 |
| `--helix-color-series-20` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-4)) ) )` | `#8876a3` | `#c0addd` | 5 |
| `--helix-color-series-21` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-5)) ) )` | `#7f6438` | `#b7996c` | 5 |
| `--helix-color-series-22` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-6)) ) )` | `#4a8b99` | `#82c4d2` | 5 |
| `--helix-color-series-23` | `light-dark( oklch( from var(--_helix-seed-brand) 0.52 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ), oklch( from var(--_helix-seed-brand) 0.7 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-7)) ) )` | `#875870` | `#c08da6` | 5 |
| `--helix-color-series-24` | `light-dark( oklch( from var(--_helix-seed-brand) 0.6 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ), oklch( from var(--_helix-seed-brand) 0.78 calc(0.07 * var(--_helix-seed-chroma-scale)) calc(h + var(--_helix-series-hue-8)) ) )` | `#788758` | `#afbf8e` | 5 |
| `--helix-color-info` | `light-dark(var(--_helix-info-600), var(--_helix-info-400))` | `#156ba6` | `#2da6fa` | 5 |
| `--helix-color-success` | `light-dark(var(--_helix-success-600), var(--_helix-success-400))` | `#227849` | `#3bb974` | 17 |
| `--helix-color-warning` | `light-dark(var(--_helix-warning-600), var(--_helix-warning-400))` | `#8d5e00` | `#ffaf00` | 13 |
| `--helix-color-danger` | `light-dark(var(--_helix-danger-600), var(--_helix-danger-400))` | `#b02b27` | `#ff574e` | 69 |
| `--helix-color-danger-surface` | `var(--_helix-danger-600)` | `#b02b27` | as light | 4 |
| `--helix-color-danger-surface-hover` | `var(--_helix-danger-700)` | `#901e1c` | as light | 3 |
| `--helix-color-info-surface` | `var(--_helix-info-600)` | `#156ba6` | as light | 0 |
| `--helix-color-info-surface-hover` | `var(--_helix-info-700)` | `#145786` | as light | 0 |
| `--helix-color-success-surface` | `var(--_helix-success-600)` | `#227849` | as light | 0 |
| `--helix-color-success-surface-hover` | `var(--_helix-success-700)` | `#1f613c` | as light | 0 |
| `--helix-color-warning-surface` | `var(--_helix-warning-600)` | `#8d5e00` | as light | 0 |
| `--helix-color-warning-surface-hover` | `var(--_helix-warning-700)` | `#823f00` | as light | 0 |

## space

The spacing scale, used for gaps, padding and margins alike.

| Token | Value | Reads |
|---|---|---|
| `--helix-space-none` | `var(--_helix-scale-0)` | 135 |
| `--helix-space-2xs` | `var(--_helix-scale-1)` | 203 |
| `--helix-space-xs` | `var(--_helix-scale-2)` | 153 |
| `--helix-space-sm` | `var(--_helix-scale-3)` | 167 |
| `--helix-space-md` | `var(--_helix-scale-4)` | 114 |
| `--helix-space-lg` | `var(--_helix-scale-6)` | 99 |
| `--helix-space-xl` | `var(--_helix-scale-8)` | 46 |
| `--helix-space-2xl` | `var(--_helix-scale-12)` | 49 |
| `--helix-space-3xl` | `var(--_helix-scale-16)` | 15 |
| `--helix-space-control` | `var(--helix-space-md)` | 4 |

## radii

Corner radius. `sm` is the house value at 4px and is on nearly every container.

| Token | Value | Reads |
|---|---|---|
| `--helix-radii-none` | `0` | 32 |
| `--helix-radii-sm` | `calc(var(--_helix-seed-radii) * 0.5)` | 131 |
| `--helix-radii-md` | `var(--_helix-seed-radii)` | 15 |
| `--helix-radii-lg` | `calc(var(--_helix-seed-radii) * 1.5)` | 21 |
| `--helix-radii-full` | `9999px` | 44 |

## font

The three families.

| Token | Value | Reads |
|---|---|---|
| `--helix-font-sans` | `var(--_helix-family-sans)` | 99 |
| `--helix-font-mono` | `var(--_helix-family-mono)` | 21 |
| `--helix-font-display` | `var(--_helix-family-display, var(--_helix-family-sans))` | 12 |

## text

Font size.

| Token | Value | Reads |
|---|---|---|
| `--helix-text-xs` | `var(--_helix-size-12)` | 67 |
| `--helix-text-sm` | `var(--_helix-size-13)` | 83 |
| `--helix-text-md` | `var(--_helix-size-14)` | 32 |
| `--helix-text-lg` | `var(--_helix-size-18)` | 24 |
| `--helix-text-xl` | `var(--_helix-size-24)` | 14 |
| `--helix-text-2xl` | `var(--_helix-size-32)` | 9 |
| `--helix-text-3xl` | `var(--_helix-size-44)` | 14 |
| `--helix-text-control` | `var(--helix-text-sm)` | 5 |

## weight

The three weights.

| Token | Value | Reads |
|---|---|---|
| `--helix-weight-regular` | `400` | 12 |
| `--helix-weight-medium` | `500` | 75 |
| `--helix-weight-semibold` | `600` | 38 |

## leading

Line height. The three steps are unitless and scale with the size; the heading one states the gap it wants instead, since a ratio picked per appearance is what left four rungs tighter than the paragraph under them.

| Token | Value | Reads |
|---|---|---|
| `--helix-leading-tight` | `1.2` | 25 |
| `--helix-leading-normal` | `1.5` | 35 |
| `--helix-leading-loose` | `1.7` | 1 |
| `--helix-leading-heading` | `calc(0.99em + 0.5rem)` | 9 |

## tracking

Letter spacing.

| Token | Value | Reads |
|---|---|---|
| `--helix-tracking-tight` | `-0.01em` | 21 |
| `--helix-tracking-normal` | `0` | 13 |
| `--helix-tracking-wide` | `0.02em` | 14 |
| `--helix-tracking-wider` | `0.12em` | 0 |

## border

Widths for a rule or an outline.

| Token | Value | Reads |
|---|---|---|
| `--helix-border-thin` | `1px` | 158 |
| `--helix-border-thick` | `2px` | 40 |
| `--helix-border-surface` | `var(--helix-border-thin)` | 3 |
| `--helix-border-floating` | `0` | 11 |

## shadow

Elevation.

| Token | Value | Reads |
|---|---|---|
| `--helix-shadow-none` | `none` | 2 |
| `--helix-shadow-sm` | `0 1px 2px var(--_helix-shadow-ink-sm)` | 8 |
| `--helix-shadow-md` | `0 4px 12px var(--_helix-shadow-ink-md)` | 12 |
| `--helix-shadow-lg` | `0 12px 32px var(--_helix-shadow-ink-lg)` | 6 |
| `--helix-shadow-surface` | `var(--helix-shadow-none)` | 3 |
| `--helix-shadow-floating` | `var(--helix-shadow-lg)` | 14 |

## material

Blur and translucency, for a surface that lets the page through.

| Token | Value | Reads |
|---|---|---|
| `--helix-material-backdrop` | `blur(var(--helix-material-blur-md)) saturate(1.5)` | 6 |
| `--helix-material-opacity` | `1` | 13 |
| `--helix-material-blur-sm` | `8px` | 0 |
| `--helix-material-blur-md` | `16px` | 2 |
| `--helix-material-blur-lg` | `32px` | 5 |
| `--helix-material-translucent` | `color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 30%, transparent )` | 8 |
| `--helix-material-translucent-strong` | `color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 88%, transparent )` | 6 |
| `--helix-material-border` | `light-dark( color-mix(in oklab, var(--_helix-neutral-950) 14%, transparent), color-mix(in oklab, var(--_helix-neutral-0) 12%, transparent) )` | 11 |

## duration

How long something takes.

| Token | Value | Reads |
|---|---|---|
| `--helix-duration-instant` | `0ms` | 5 |
| `--helix-duration-fast` | `var(--_helix-ms-120)` | 189 |
| `--helix-duration-normal` | `var(--_helix-ms-200)` | 74 |
| `--helix-duration-slow` | `var(--_helix-ms-320)` | 24 |

## easing

The shape of the curve it takes it along.

| Token | Value | Reads |
|---|---|---|
| `--helix-easing-standard` | `var(--_helix-curve-standard)` | 169 |
| `--helix-easing-emphasized` | `var(--_helix-curve-emphasized)` | 33 |
| `--helix-easing-decelerate` | `cubic-bezier(0, 0, 0, 1)` | 33 |
| `--helix-easing-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | 2 |
| `--helix-easing-spring` | `linear( 0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1 )` | 5 |

## size

Heights and widths a component takes, all of them multiplied by the density seed.

| Token | Value | Reads |
|---|---|---|
| `--helix-size-control-md` | `calc(2.5rem * var(--_helix-seed-density))` | 6 |
| `--helix-size-control-sm` | `calc(2rem * var(--_helix-seed-density))` | 21 |
| `--helix-size-control` | `var(--helix-size-control-md)` | 51 |
| `--helix-size-control-lg` | `calc(3rem * var(--_helix-seed-density))` | 5 |
| `--helix-size-control-tight` | `calc(var(--helix-size-control) * 0.8)` | 25 |
| `--helix-size-control-loose` | `calc(var(--helix-size-control) * 1.2)` | 3 |
| `--helix-size-icon-tight` | `calc(var(--helix-size-icon) * 0.8)` | 32 |
| `--helix-size-icon-loose` | `calc(var(--helix-size-icon) * 1.2)` | 18 |
| `--helix-size-checkbox-tight` | `calc(var(--helix-size-checkbox) * 0.8)` | 0 |
| `--helix-size-checkbox-loose` | `calc(var(--helix-size-checkbox) * 1.2)` | 0 |
| `--helix-size-button` | `calc(12.5rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-badge` | `calc(1rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-avatar` | `var(--helix-size-avatar-md)` | 2 |
| `--helix-size-avatar-sm` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-avatar-md` | `calc(2rem * var(--_helix-seed-density))` | 0 |
| `--helix-size-avatar-lg` | `calc(2.5rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-tag` | `var(--helix-size-tag-md)` | 1 |
| `--helix-size-tag-lg` | `calc(2rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-tag-md` | `calc(1.75rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-tag-sm` | `calc(1.5rem * var(--_helix-seed-density))` | 8 |
| `--helix-size-progress` | `calc(0.5rem * var(--_helix-seed-density))` | 4 |
| `--helix-size-meter` | `calc(1rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-checkbox` | `var(--helix-size-checkbox-md)` | 12 |
| `--helix-size-checkbox-lg` | `calc(1.5rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-checkbox-md` | `calc(1.25rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-checkbox-sm` | `calc(1rem * var(--_helix-seed-density))` | 5 |
| `--helix-size-switch` | `var(--helix-size-switch-md)` | 1 |
| `--helix-size-switch-lg` | `calc(1.75rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-switch-md` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-switch-sm` | `calc(1.25rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-loader-md` | `calc(1.5rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-loader-sm` | `calc(1rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-loader-lg` | `calc(2rem * var(--_helix-seed-density))` | 4 |
| `--helix-size-header` | `calc(3.5rem * var(--_helix-seed-density))` | 22 |
| `--helix-size-icon` | `var(--helix-size-icon-md)` | 59 |
| `--helix-size-icon-lg` | `calc(1.5rem * var(--_helix-seed-density))` | 9 |
| `--helix-size-icon-md` | `calc(1.25rem * var(--_helix-seed-density))` | 10 |
| `--helix-size-icon-sm` | `calc(1rem * var(--_helix-seed-density))` | 24 |
| `--helix-size-focus-ring` | `var(--helix-border-thick)` | 74 |
| `--helix-size-focus-offset` | `2px` | 64 |
| `--helix-size-focus-reach` | `calc(var(--helix-size-focus-ring) + var(--helix-size-focus-offset))` | 4 |

## layer

Position in the stack. Positional, never named after a component.

| Token | Value | Reads |
|---|---|---|
| `--helix-layer-beneath` | `-1` | 0 |
| `--helix-layer-base` | `0` | 7 |
| `--helix-layer-raised` | `10` | 17 |
| `--helix-layer-sticky` | `100` | 5 |
| `--helix-layer-overlay` | `1000` | 2 |
| `--helix-layer-toast` | `1200` | 1 |
