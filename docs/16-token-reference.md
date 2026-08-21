# Token reference

*Generated from [`helix/styles/src/tokens.css`](../helix/styles/src/tokens.css) by
`bun run tokens`. Do not edit.*

161 semantic tokens in 15 categories, every one in exactly
one. These are the whole of what a component or an app may use. The primitive
layer underneath (`--_helix-neutral-500` and its kind) is `helix/styles`'s own
business and `check:tokens` fails on any reference to it from outside.

Per-component hooks (`--card-padding`, `--drawer-radii`) are not tokens and are
not here. They are API, they default to a semantic token, and `check:hooks`
holds them to both directions.

**Reads** counts every `var()` of that token across `helix` and
`site`, the sandbox included. Zero is not a fault: a complete scale is part of what is shipped and
a consumer can reach for a rung we happen not to use. It is worth seeing
because nothing else can see it, `check:tokens` asking only that every token
*referenced* exists.

Currently unread anywhere: `--helix-color-info-surface`, `--helix-color-info-surface-hover`, `--helix-color-success-surface`, `--helix-color-success-surface-hover`, `--helix-color-warning-surface`, `--helix-color-warning-surface-hover`, `--helix-leading-loose`, `--helix-material-blur-sm`, `--helix-material-blur-lg`, `--helix-material-translucent-strong`, `--helix-material-border`.

## color

Every color, resolved through `light-dark()` so a theme needs no second file.

| Token | Value | Reads |
|---|---|---|
| `--helix-color-background` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-1000))` | 103 |
| `--helix-color-surface` | `light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))` | 49 |
| `--helix-color-surface-raised` | `light-dark(var(--_helix-neutral-100), var(--_helix-neutral-800))` | 32 |
| `--helix-color-surface-overlay` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-800))` | 39 |
| `--helix-color-surface-sunken` | `light-dark(var(--_helix-neutral-200), var(--_helix-neutral-950))` | 86 |
| `--helix-color-overlay` | `light-dark( color-mix(in oklab, var(--_helix-neutral-950) 40%, transparent), color-mix(in oklab, var(--_helix-neutral-950) 64%, transparent) )` | 15 |
| `--helix-color-foreground` | `light-dark(var(--_helix-neutral-1000), var(--_helix-neutral-0))` | 290 |
| `--helix-color-foreground-muted` | `light-dark(var(--_helix-neutral-600), var(--_helix-neutral-400))` | 179 |
| `--helix-color-foreground-subtle` | `light-dark(var(--_helix-neutral-500), var(--_helix-neutral-500))` | 119 |
| `--helix-color-foreground-on-accent` | `var(--_helix-neutral-0)` | 34 |
| `--helix-color-surface-inverse` | `light-dark(var(--_helix-neutral-900), var(--_helix-neutral-100))` | 14 |
| `--helix-color-foreground-inverse` | `light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))` | 8 |
| `--helix-color-surface-media` | `light-dark(var(--_helix-neutral-1000), var(--_helix-neutral-1000))` | 6 |
| `--helix-color-foreground-media` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-0))` | 8 |
| `--helix-color-border` | `light-dark(var(--_helix-neutral-300), var(--_helix-neutral-700))` | 196 |
| `--helix-color-primary` | `light-dark(var(--_helix-brand-500), var(--_helix-brand-400))` | 155 |
| `--helix-color-primary-hover` | `var(--_helix-brand-600)` | 10 |
| `--helix-color-primary-active` | `var(--_helix-brand-700)` | 4 |
| `--helix-color-primary-subtle` | `light-dark(var(--_helix-brand-50), var(--_helix-brand-900))` | 6 |
| `--helix-color-primary-surface` | `var(--_helix-brand-600)` | 4 |
| `--helix-color-primary-surface-hover` | `var(--_helix-brand-700)` | 2 |
| `--helix-color-focus-ring` | `var(--_helix-brand-500)` | 122 |
| `--helix-color-syntax-callable` | `light-dark( var(--_helix-syntax-callable-light), var(--_helix-syntax-callable-dark) )` | 3 |
| `--helix-color-syntax-comment` | `light-dark( var(--_helix-syntax-comment-light), var(--_helix-syntax-comment-dark) )` | 2 |
| `--helix-color-syntax-constant` | `light-dark( var(--_helix-syntax-constant-light), var(--_helix-syntax-constant-dark) )` | 2 |
| `--helix-color-syntax-invalid` | `light-dark( var(--_helix-syntax-invalid-light), var(--_helix-syntax-invalid-dark) )` | 1 |
| `--helix-color-syntax-keyword` | `light-dark( var(--_helix-syntax-keyword-light), var(--_helix-syntax-keyword-dark) )` | 3 |
| `--helix-color-syntax-name` | `light-dark( var(--_helix-syntax-name-light), var(--_helix-syntax-name-dark) )` | 4 |
| `--helix-color-syntax-string` | `light-dark( var(--_helix-syntax-string-light), var(--_helix-syntax-string-dark) )` | 1 |
| `--helix-color-syntax-tag` | `light-dark( var(--_helix-syntax-tag-light), var(--_helix-syntax-tag-dark) )` | 3 |
| `--helix-color-series-1` | `light-dark( oklch(from var(--_helix-seed-brand) 0.595 0.221 calc(h + var(--_helix-series-hue-1))), oklch(from var(--_helix-seed-brand) 0.62 0.206 calc(h + var(--_helix-series-hue-1))) )` | 19 |
| `--helix-color-series-2` | `light-dark( oklch(from var(--_helix-seed-brand) 0.645 0.238 calc(h + var(--_helix-series-hue-2))), oklch(from var(--_helix-seed-brand) 0.645 0.238 calc(h + var(--_helix-series-hue-2))) )` | 17 |
| `--helix-color-series-3` | `light-dark( oklch(from var(--_helix-seed-brand) 0.625 0.126 calc(h + var(--_helix-series-hue-3))), oklch(from var(--_helix-seed-brand) 0.885 0.179 calc(h + var(--_helix-series-hue-3))) )` | 17 |
| `--helix-color-series-4` | `light-dark( oklch(from var(--_helix-seed-brand) 0.565 0.295 calc(h + var(--_helix-series-hue-4))), oklch(from var(--_helix-seed-brand) 0.62 0.252 calc(h + var(--_helix-series-hue-4))) )` | 17 |
| `--helix-color-series-5` | `light-dark( oklch(from var(--_helix-seed-brand) 0.64 0.133 calc(h + var(--_helix-series-hue-5))), oklch(from var(--_helix-seed-brand) 0.815 0.17 calc(h + var(--_helix-series-hue-5))) )` | 17 |
| `--helix-color-series-6` | `light-dark( oklch(from var(--_helix-seed-brand) 0.63 0.11 calc(h + var(--_helix-series-hue-6))), oklch(from var(--_helix-seed-brand) 0.825 0.144 calc(h + var(--_helix-series-hue-6))) )` | 17 |
| `--helix-color-series-7` | `light-dark( oklch(from var(--_helix-seed-brand) 0.66 0.277 calc(h + var(--_helix-series-hue-7))), oklch(from var(--_helix-seed-brand) 0.66 0.277 calc(h + var(--_helix-series-hue-7))) )` | 17 |
| `--helix-color-series-8` | `light-dark( oklch(from var(--_helix-seed-brand) 0.63 0.154 calc(h + var(--_helix-series-hue-8))), oklch(from var(--_helix-seed-brand) 0.895 0.219 calc(h + var(--_helix-series-hue-8))) )` | 17 |
| `--helix-color-series-9` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.145 calc(h + var(--_helix-series-hue-1))), oklch(from var(--_helix-seed-brand) 0.7 0.135 calc(h + var(--_helix-series-hue-1))) )` | 17 |
| `--helix-color-series-10` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.145 calc(h + var(--_helix-series-hue-2))), oklch(from var(--_helix-seed-brand) 0.78 0.129 calc(h + var(--_helix-series-hue-2))) )` | 17 |
| `--helix-color-series-11` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.105 calc(h + var(--_helix-series-hue-3))), oklch(from var(--_helix-seed-brand) 0.7 0.135 calc(h + var(--_helix-series-hue-3))) )` | 17 |
| `--helix-color-series-12` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.145 calc(h + var(--_helix-series-hue-4))), oklch(from var(--_helix-seed-brand) 0.78 0.135 calc(h + var(--_helix-series-hue-4))) )` | 17 |
| `--helix-color-series-13` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.108 calc(h + var(--_helix-series-hue-5))), oklch(from var(--_helix-seed-brand) 0.7 0.135 calc(h + var(--_helix-series-hue-5))) )` | 17 |
| `--helix-color-series-14` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.105 calc(h + var(--_helix-series-hue-6))), oklch(from var(--_helix-seed-brand) 0.78 0.135 calc(h + var(--_helix-series-hue-6))) )` | 17 |
| `--helix-color-series-15` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.145 calc(h + var(--_helix-series-hue-7))), oklch(from var(--_helix-seed-brand) 0.7 0.135 calc(h + var(--_helix-series-hue-7))) )` | 17 |
| `--helix-color-series-16` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.145 calc(h + var(--_helix-series-hue-8))), oklch(from var(--_helix-seed-brand) 0.78 0.135 calc(h + var(--_helix-series-hue-8))) )` | 17 |
| `--helix-color-series-17` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.05 calc(h + var(--_helix-series-hue-1))), oklch(from var(--_helix-seed-brand) 0.7 0.046 calc(h + var(--_helix-series-hue-1))) )` | 17 |
| `--helix-color-series-18` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.05 calc(h + var(--_helix-series-hue-2))), oklch(from var(--_helix-seed-brand) 0.78 0.046 calc(h + var(--_helix-series-hue-2))) )` | 17 |
| `--helix-color-series-19` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.05 calc(h + var(--_helix-series-hue-3))), oklch(from var(--_helix-seed-brand) 0.7 0.046 calc(h + var(--_helix-series-hue-3))) )` | 17 |
| `--helix-color-series-20` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.05 calc(h + var(--_helix-series-hue-4))), oklch(from var(--_helix-seed-brand) 0.78 0.046 calc(h + var(--_helix-series-hue-4))) )` | 17 |
| `--helix-color-series-21` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.05 calc(h + var(--_helix-series-hue-5))), oklch(from var(--_helix-seed-brand) 0.7 0.046 calc(h + var(--_helix-series-hue-5))) )` | 17 |
| `--helix-color-series-22` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.05 calc(h + var(--_helix-series-hue-6))), oklch(from var(--_helix-seed-brand) 0.78 0.046 calc(h + var(--_helix-series-hue-6))) )` | 17 |
| `--helix-color-series-23` | `light-dark( oklch(from var(--_helix-seed-brand) 0.52 0.05 calc(h + var(--_helix-series-hue-7))), oklch(from var(--_helix-seed-brand) 0.7 0.046 calc(h + var(--_helix-series-hue-7))) )` | 17 |
| `--helix-color-series-24` | `light-dark( oklch(from var(--_helix-seed-brand) 0.6 0.05 calc(h + var(--_helix-series-hue-8))), oklch(from var(--_helix-seed-brand) 0.78 0.046 calc(h + var(--_helix-series-hue-8))) )` | 17 |
| `--helix-color-info` | `light-dark(var(--_helix-info-600), var(--_helix-info-400))` | 8 |
| `--helix-color-success` | `light-dark(var(--_helix-success-600), var(--_helix-success-400))` | 29 |
| `--helix-color-warning` | `light-dark(var(--_helix-warning-600), var(--_helix-warning-400))` | 22 |
| `--helix-color-danger` | `light-dark(var(--_helix-danger-600), var(--_helix-danger-400))` | 133 |
| `--helix-color-danger-surface` | `var(--_helix-danger-600)` | 2 |
| `--helix-color-danger-surface-hover` | `var(--_helix-danger-700)` | 2 |
| `--helix-color-info-surface` | `var(--_helix-info-600)` | 0 |
| `--helix-color-info-surface-hover` | `var(--_helix-info-700)` | 0 |
| `--helix-color-success-surface` | `var(--_helix-success-600)` | 0 |
| `--helix-color-success-surface-hover` | `var(--_helix-success-700)` | 0 |
| `--helix-color-warning-surface` | `var(--_helix-warning-600)` | 0 |
| `--helix-color-warning-surface-hover` | `var(--_helix-warning-700)` | 0 |

## space

The spacing scale, used for gaps, padding and margins alike.

| Token | Value | Reads |
|---|---|---|
| `--helix-space-none` | `var(--_helix-scale-0)` | 224 |
| `--helix-space-2xs` | `var(--_helix-scale-1)` | 275 |
| `--helix-space-xs` | `var(--_helix-scale-2)` | 235 |
| `--helix-space-sm` | `var(--_helix-scale-3)` | 235 |
| `--helix-space-md` | `var(--_helix-scale-4)` | 127 |
| `--helix-space-lg` | `var(--_helix-scale-6)` | 80 |
| `--helix-space-xl` | `var(--_helix-scale-8)` | 65 |
| `--helix-space-2xl` | `var(--_helix-scale-12)` | 41 |
| `--helix-space-3xl` | `var(--_helix-scale-16)` | 20 |
| `--helix-space-control` | `var(--helix-space-md)` | 6 |

## radii

Corner radius. `sm` is the house value at 4px and is on nearly every container.

| Token | Value | Reads |
|---|---|---|
| `--helix-radii-none` | `0` | 64 |
| `--helix-radii-sm` | `calc(var(--_helix-seed-radii) * 0.5)` | 201 |
| `--helix-radii-md` | `var(--_helix-seed-radii)` | 18 |
| `--helix-radii-lg` | `calc(var(--_helix-seed-radii) * 1.5)` | 1 |
| `--helix-radii-full` | `9999px` | 79 |

## font

The three families.

| Token | Value | Reads |
|---|---|---|
| `--helix-font-sans` | `var(--_helix-family-sans)` | 140 |
| `--helix-font-mono` | `var(--_helix-family-mono)` | 33 |
| `--helix-font-display` | `var(--_helix-family-display, var(--_helix-family-sans))` | 25 |

## text

Font size.

| Token | Value | Reads |
|---|---|---|
| `--helix-text-xs` | `var(--_helix-size-12)` | 96 |
| `--helix-text-sm` | `var(--_helix-size-13)` | 116 |
| `--helix-text-md` | `var(--_helix-size-14)` | 49 |
| `--helix-text-lg` | `var(--_helix-size-18)` | 19 |
| `--helix-text-xl` | `var(--_helix-size-24)` | 23 |
| `--helix-text-2xl` | `var(--_helix-size-32)` | 13 |
| `--helix-text-3xl` | `var(--_helix-size-44)` | 20 |
| `--helix-text-control` | `var(--helix-text-sm)` | 6 |

## weight

The three weights.

| Token | Value | Reads |
|---|---|---|
| `--helix-weight-regular` | `400` | 23 |
| `--helix-weight-medium` | `500` | 143 |
| `--helix-weight-semibold` | `600` | 50 |

## leading

Line height, unitless so it scales with the size.

| Token | Value | Reads |
|---|---|---|
| `--helix-leading-tight` | `1.2` | 58 |
| `--helix-leading-normal` | `1.5` | 48 |
| `--helix-leading-loose` | `1.7` | 0 |

## tracking

Letter spacing.

| Token | Value | Reads |
|---|---|---|
| `--helix-tracking-tight` | `-0.01em` | 36 |
| `--helix-tracking-normal` | `0` | 26 |
| `--helix-tracking-wide` | `0.02em` | 9 |

## border

Widths for a rule or an outline.

| Token | Value | Reads |
|---|---|---|
| `--helix-border-thin` | `1px` | 219 |
| `--helix-border-thick` | `2px` | 61 |

## shadow

Elevation.

| Token | Value | Reads |
|---|---|---|
| `--helix-shadow-none` | `none` | 2 |
| `--helix-shadow-sm` | `0 1px 2px color-mix(in oklab, var(--_helix-neutral-950) 8%, transparent)` | 16 |
| `--helix-shadow-md` | `0 4px 12px color-mix(in oklab, var(--_helix-neutral-950) 10%, transparent)` | 22 |
| `--helix-shadow-lg` | `0 12px 32px color-mix(in oklab, var(--_helix-neutral-950) 14%, transparent)` | 30 |

## material

Blur and translucency, for a surface that lets the page through.

| Token | Value | Reads |
|---|---|---|
| `--helix-material-blur-sm` | `8px` | 0 |
| `--helix-material-blur-md` | `16px` | 6 |
| `--helix-material-blur-lg` | `32px` | 0 |
| `--helix-material-translucent` | `color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 72%, transparent )` | 6 |
| `--helix-material-translucent-strong` | `color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 88%, transparent )` | 0 |
| `--helix-material-border` | `light-dark( color-mix(in oklab, var(--_helix-neutral-950) 14%, transparent), color-mix(in oklab, var(--_helix-neutral-0) 12%, transparent) )` | 0 |

## duration

How long something takes.

| Token | Value | Reads |
|---|---|---|
| `--helix-duration-instant` | `0ms` | 4 |
| `--helix-duration-fast` | `var(--_helix-ms-120)` | 338 |
| `--helix-duration-normal` | `var(--_helix-ms-200)` | 130 |
| `--helix-duration-slow` | `var(--_helix-ms-320)` | 26 |

## easing

The shape of the curve it takes it along.

| Token | Value | Reads |
|---|---|---|
| `--helix-easing-standard` | `var(--_helix-curve-standard)` | 302 |
| `--helix-easing-emphasized` | `var(--_helix-curve-emphasized)` | 65 |
| `--helix-easing-decelerate` | `cubic-bezier(0, 0, 0, 1)` | 59 |
| `--helix-easing-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | 2 |
| `--helix-easing-spring` | `linear( 0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1 )` | 4 |

## size

Heights and widths a component takes, all of them multiplied by the density seed.

| Token | Value | Reads |
|---|---|---|
| `--helix-size-control-md` | `calc(2.5rem * var(--_helix-seed-density))` | 17 |
| `--helix-size-control-sm` | `calc(2rem * var(--_helix-seed-density))` | 58 |
| `--helix-size-control` | `var(--helix-size-control-md)` | 55 |
| `--helix-size-control-lg` | `calc(3rem * var(--_helix-seed-density))` | 11 |
| `--helix-size-button` | `calc(12.5rem * var(--_helix-seed-density))` | 5 |
| `--helix-size-badge` | `calc(1rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-avatar` | `var(--helix-size-avatar-md)` | 2 |
| `--helix-size-avatar-sm` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-avatar-md` | `calc(2rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-avatar-lg` | `calc(2.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-tag` | `var(--helix-size-tag-md)` | 2 |
| `--helix-size-tag-lg` | `calc(2rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-tag-md` | `calc(1.75rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-tag-sm` | `calc(1.5rem * var(--_helix-seed-density))` | 10 |
| `--helix-size-progress` | `calc(0.5rem * var(--_helix-seed-density))` | 8 |
| `--helix-size-meter` | `calc(1rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-checkbox` | `var(--helix-size-checkbox-md)` | 7 |
| `--helix-size-checkbox-lg` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-checkbox-md` | `calc(1.25rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-checkbox-sm` | `calc(1rem * var(--_helix-seed-density))` | 8 |
| `--helix-size-switch` | `var(--helix-size-switch-md)` | 2 |
| `--helix-size-switch-lg` | `calc(1.75rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-switch-md` | `calc(1.5rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-switch-sm` | `calc(1.25rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-loader-md` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-loader-sm` | `calc(1rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-loader-lg` | `calc(2rem * var(--_helix-seed-density))` | 8 |
| `--helix-size-header` | `calc(3.5rem * var(--_helix-seed-density))` | 22 |
| `--helix-size-icon` | `var(--helix-size-icon-md)` | 90 |
| `--helix-size-icon-lg` | `calc(1.5rem * var(--_helix-seed-density))` | 46 |
| `--helix-size-icon-md` | `calc(1.25rem * var(--_helix-seed-density))` | 13 |
| `--helix-size-icon-sm` | `calc(1rem * var(--_helix-seed-density))` | 81 |
| `--helix-size-focus-ring` | `var(--helix-border-thick)` | 138 |
| `--helix-size-focus-offset` | `2px` | 114 |

## layer

Position in the stack. Positional, never named after a component.

| Token | Value | Reads |
|---|---|---|
| `--helix-layer-base` | `0` | 8 |
| `--helix-layer-raised` | `10` | 34 |
| `--helix-layer-sticky` | `100` | 6 |
| `--helix-layer-overlay` | `1000` | 4 |
| `--helix-layer-toast` | `1200` | 2 |
