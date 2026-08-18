# Token reference

*Generated from [`helix/styles/src/tokens.css`](../helix/styles/src/tokens.css) by
`bun run tokens`. Do not edit.*

122 semantic tokens in 15 categories, every one in exactly
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

Currently unread anywhere: `--helix-radii-lg`, `--helix-leading-loose`, `--helix-material-blur-sm`, `--helix-material-blur-lg`, `--helix-material-translucent-strong`, `--helix-duration-instant`.

## color

Every colour, resolved through `light-dark()` so a theme needs no second file.

| Token | Value | Reads |
|---|---|---|
| `--helix-color-background` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-1000))` | 49 |
| `--helix-color-surface` | `light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))` | 20 |
| `--helix-color-surface-raised` | `light-dark(var(--_helix-neutral-100), var(--_helix-neutral-800))` | 22 |
| `--helix-color-surface-overlay` | `light-dark(var(--_helix-neutral-0), var(--_helix-neutral-800))` | 27 |
| `--helix-color-surface-sunken` | `light-dark(var(--_helix-neutral-200), var(--_helix-neutral-950))` | 41 |
| `--helix-color-overlay` | `light-dark( color-mix(in oklab, var(--_helix-neutral-950) 40%, transparent), color-mix(in oklab, var(--_helix-neutral-950) 64%, transparent) )` | 3 |
| `--helix-color-foreground` | `light-dark(var(--_helix-neutral-1000), var(--_helix-neutral-0))` | 172 |
| `--helix-color-foreground-muted` | `light-dark(var(--_helix-neutral-600), var(--_helix-neutral-400))` | 88 |
| `--helix-color-foreground-subtle` | `light-dark(var(--_helix-neutral-500), var(--_helix-neutral-500))` | 66 |
| `--helix-color-foreground-on-accent` | `var(--_helix-neutral-0)` | 21 |
| `--helix-color-surface-inverse` | `light-dark(var(--_helix-neutral-900), var(--_helix-neutral-100))` | 7 |
| `--helix-color-foreground-inverse` | `light-dark(var(--_helix-neutral-50), var(--_helix-neutral-900))` | 6 |
| `--helix-color-border` | `light-dark(var(--_helix-neutral-300), var(--_helix-neutral-700))` | 100 |
| `--helix-color-primary` | `light-dark(var(--_helix-brand-500), var(--_helix-brand-400))` | 79 |
| `--helix-color-primary-hover` | `var(--_helix-brand-600)` | 7 |
| `--helix-color-primary-active` | `var(--_helix-brand-700)` | 1 |
| `--helix-color-primary-subtle` | `light-dark(var(--_helix-brand-50), var(--_helix-brand-900))` | 6 |
| `--helix-color-focus-ring` | `var(--_helix-brand-500)` | 70 |
| `--helix-color-syntax-callable` | `light-dark( var(--_helix-syntax-callable-light), var(--_helix-syntax-callable-dark) )` | 1 |
| `--helix-color-syntax-comment` | `light-dark( var(--_helix-syntax-comment-light), var(--_helix-syntax-comment-dark) )` | 1 |
| `--helix-color-syntax-constant` | `light-dark( var(--_helix-syntax-constant-light), var(--_helix-syntax-constant-dark) )` | 1 |
| `--helix-color-syntax-invalid` | `light-dark( var(--_helix-syntax-invalid-light), var(--_helix-syntax-invalid-dark) )` | 1 |
| `--helix-color-syntax-keyword` | `light-dark( var(--_helix-syntax-keyword-light), var(--_helix-syntax-keyword-dark) )` | 1 |
| `--helix-color-syntax-name` | `light-dark( var(--_helix-syntax-name-light), var(--_helix-syntax-name-dark) )` | 2 |
| `--helix-color-syntax-string` | `light-dark( var(--_helix-syntax-string-light), var(--_helix-syntax-string-dark) )` | 1 |
| `--helix-color-syntax-tag` | `light-dark( var(--_helix-syntax-tag-light), var(--_helix-syntax-tag-dark) )` | 1 |
| `--helix-color-info` | `light-dark(var(--_helix-info-500), var(--_helix-info-400))` | 6 |
| `--helix-color-success` | `light-dark(var(--_helix-success-500), var(--_helix-success-400))` | 13 |
| `--helix-color-warning` | `light-dark(var(--_helix-warning-500), var(--_helix-warning-400))` | 12 |
| `--helix-color-danger` | `light-dark(var(--_helix-danger-600), var(--_helix-danger-400))` | 55 |

## space

The spacing scale, used for gaps, padding and margins alike.

| Token | Value | Reads |
|---|---|---|
| `--helix-space-none` | `var(--_helix-scale-0)` | 127 |
| `--helix-space-2xs` | `var(--_helix-scale-1)` | 145 |
| `--helix-space-xs` | `var(--_helix-scale-2)` | 127 |
| `--helix-space-sm` | `var(--_helix-scale-3)` | 136 |
| `--helix-space-md` | `var(--_helix-scale-4)` | 65 |
| `--helix-space-lg` | `var(--_helix-scale-6)` | 56 |
| `--helix-space-xl` | `var(--_helix-scale-8)` | 19 |
| `--helix-space-2xl` | `var(--_helix-scale-12)` | 27 |
| `--helix-space-3xl` | `var(--_helix-scale-16)` | 3 |

## radii

Corner radius. `sm` is the house value at 4px and is on nearly every container.

| Token | Value | Reads |
|---|---|---|
| `--helix-radii-none` | `0` | 38 |
| `--helix-radii-sm` | `calc(var(--_helix-seed-radii) * 0.5)` | 102 |
| `--helix-radii-md` | `var(--_helix-seed-radii)` | 4 |
| `--helix-radii-lg` | `calc(var(--_helix-seed-radii) * 1.5)` | 0 |
| `--helix-radii-full` | `9999px` | 48 |

## font

The three families.

| Token | Value | Reads |
|---|---|---|
| `--helix-font-sans` | `var(--_helix-family-sans)` | 60 |
| `--helix-font-mono` | `var(--_helix-family-mono)` | 16 |
| `--helix-font-display` | `var(--_helix-family-display, var(--_helix-family-sans))` | 7 |

## text

Font size.

| Token | Value | Reads |
|---|---|---|
| `--helix-text-xs` | `var(--_helix-size-12)` | 50 |
| `--helix-text-sm` | `var(--_helix-size-14)` | 76 |
| `--helix-text-md` | `var(--_helix-size-15)` | 17 |
| `--helix-text-lg` | `var(--_helix-size-18)` | 15 |
| `--helix-text-xl` | `var(--_helix-size-24)` | 10 |
| `--helix-text-2xl` | `var(--_helix-size-32)` | 5 |
| `--helix-text-3xl` | `var(--_helix-size-44)` | 7 |

## weight

The three weights.

| Token | Value | Reads |
|---|---|---|
| `--helix-weight-regular` | `400` | 10 |
| `--helix-weight-medium` | `500` | 64 |
| `--helix-weight-semibold` | `600` | 37 |

## leading

Line height, unitless so it scales with the size.

| Token | Value | Reads |
|---|---|---|
| `--helix-leading-tight` | `1.2` | 39 |
| `--helix-leading-normal` | `1.5` | 35 |
| `--helix-leading-loose` | `1.7` | 0 |

## tracking

Letter spacing.

| Token | Value | Reads |
|---|---|---|
| `--helix-tracking-tight` | `-0.01em` | 24 |
| `--helix-tracking-normal` | `0` | 14 |
| `--helix-tracking-wide` | `0.02em` | 6 |

## border

Widths for a rule or an outline.

| Token | Value | Reads |
|---|---|---|
| `--helix-border-thin` | `1px` | 108 |
| `--helix-border-thick` | `2px` | 27 |

## shadow

Elevation.

| Token | Value | Reads |
|---|---|---|
| `--helix-shadow-none` | `none` | 2 |
| `--helix-shadow-sm` | `0 1px 2px color-mix(in oklab, var(--_helix-neutral-950) 8%, transparent)` | 8 |
| `--helix-shadow-md` | `0 4px 12px color-mix(in oklab, var(--_helix-neutral-950) 10%, transparent)` | 12 |
| `--helix-shadow-lg` | `0 12px 32px color-mix(in oklab, var(--_helix-neutral-950) 14%, transparent)` | 12 |

## material

Blur and translucency, for a surface that lets the page through.

| Token | Value | Reads |
|---|---|---|
| `--helix-material-blur-sm` | `8px` | 0 |
| `--helix-material-blur-md` | `16px` | 2 |
| `--helix-material-blur-lg` | `32px` | 0 |
| `--helix-material-translucent` | `color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 72%, transparent )` | 2 |
| `--helix-material-translucent-strong` | `color-mix( in oklab, light-dark(var(--_helix-neutral-0), var(--_helix-neutral-900)) 88%, transparent )` | 0 |
| `--helix-material-border` | `light-dark( color-mix(in oklab, var(--_helix-neutral-950) 14%, transparent), color-mix(in oklab, var(--_helix-neutral-0) 12%, transparent) )` | 2 |

## duration

How long something takes.

| Token | Value | Reads |
|---|---|---|
| `--helix-duration-instant` | `0ms` | 0 |
| `--helix-duration-fast` | `var(--_helix-ms-120)` | 172 |
| `--helix-duration-normal` | `var(--_helix-ms-200)` | 85 |
| `--helix-duration-slow` | `var(--_helix-ms-320)` | 12 |

## easing

The shape of the curve it takes it along.

| Token | Value | Reads |
|---|---|---|
| `--helix-easing-standard` | `var(--_helix-curve-standard)` | 164 |
| `--helix-easing-emphasized` | `var(--_helix-curve-emphasized)` | 34 |
| `--helix-easing-decelerate` | `cubic-bezier(0, 0, 0, 1)` | 23 |
| `--helix-easing-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | 2 |
| `--helix-easing-spring` | `linear( 0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1 )` | 4 |

## size

Heights and widths a component takes, all of them multiplied by the density seed.

| Token | Value | Reads |
|---|---|---|
| `--helix-size-control-md` | `calc(2.5rem * var(--_helix-seed-density))` | 11 |
| `--helix-size-control-sm` | `calc(2rem * var(--_helix-seed-density))` | 46 |
| `--helix-size-control` | `var(--helix-size-control-md)` | 16 |
| `--helix-size-control-lg` | `calc(3rem * var(--_helix-seed-density))` | 8 |
| `--helix-size-button` | `calc(12.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-badge` | `calc(1rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-avatar` | `var(--helix-size-avatar-md)` | 2 |
| `--helix-size-avatar-sm` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-avatar-md` | `calc(2rem * var(--_helix-seed-density))` | 1 |
| `--helix-size-avatar-lg` | `calc(2.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-tag` | `var(--helix-size-tag-md)` | 2 |
| `--helix-size-tag-lg` | `calc(2rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-tag-md` | `calc(1.75rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-tag-sm` | `calc(1.5rem * var(--_helix-seed-density))` | 6 |
| `--helix-size-progress` | `calc(0.5rem * var(--_helix-seed-density))` | 6 |
| `--helix-size-checkbox` | `var(--helix-size-checkbox-md)` | 6 |
| `--helix-size-checkbox-lg` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-checkbox-md` | `calc(1.25rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-checkbox-sm` | `calc(1rem * var(--_helix-seed-density))` | 6 |
| `--helix-size-switch` | `var(--helix-size-switch-md)` | 2 |
| `--helix-size-switch-lg` | `calc(1.75rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-switch-md` | `calc(1.5rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-switch-sm` | `calc(1.25rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-spinner-md` | `calc(1.5rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-spinner-sm` | `calc(1rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-spinner-lg` | `calc(2rem * var(--_helix-seed-density))` | 2 |
| `--helix-size-header` | `calc(3.5rem * var(--_helix-seed-density))` | 14 |
| `--helix-size-icon` | `var(--helix-size-icon-md)` | 54 |
| `--helix-size-icon-lg` | `calc(1.5rem * var(--_helix-seed-density))` | 4 |
| `--helix-size-icon-md` | `calc(1.25rem * var(--_helix-seed-density))` | 3 |
| `--helix-size-icon-sm` | `calc(1rem * var(--_helix-seed-density))` | 37 |
| `--helix-size-focus-ring` | `var(--helix-border-thick)` | 70 |
| `--helix-size-focus-offset` | `2px` | 64 |

## layer

Position in the stack. Positional, never named after a component.

| Token | Value | Reads |
|---|---|---|
| `--helix-layer-base` | `0` | 8 |
| `--helix-layer-raised` | `10` | 16 |
| `--helix-layer-sticky` | `100` | 2 |
| `--helix-layer-overlay` | `1000` | 2 |
| `--helix-layer-toast` | `1200` | 2 |
