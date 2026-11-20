/**
 * `data-density` on a phone: the control steps of a region, as the web's
 * `[data-density]` rules set them in `@fusion.dev/helix-styles`.
 *
 * **The stops are `sm`, `md`, and `lg`**, and each sets the control's text,
 * its inset, and the sizes of a control, an icon, a checkbox, a switch, and a
 * tag to that step, with the tight and loose sizes 0.8 and 1.2 of the
 * control's. An element given `data-density` draws with them, as do the
 * elements inside it, as the web's custom properties inherit. **Nesting does
 * not compound**: each stop sets its steps from the theme's own, as on the
 * web.
 */
import { type ReactNode, useMemo } from 'react'
import { type Theme, ThemeProvider, useTheme } from '../theme/theme'
import type { Props } from './behavior'

/** A density stop. */
export type DensityStop = 'lg' | 'md' | 'sm'

/** The sizes each stop sets from the step of the same name, as `size-icon` from `size-icon-sm`. */
const STEPPED = ['size-checkbox', 'size-control', 'size-icon', 'size-switch', 'size-tag'] as const

/** The tight and loose sizes, each a share of the stop's size. */
const SHARES = [
  ['tight', 0.8],
  ['loose', 1.2],
] as const

/** What each stop sets the control's text and inset from. */
const CONTROL: Readonly<Record<DensityStop, { readonly space: string; readonly text: string }>> = {
  lg: { space: 'space-lg', text: 'text-control-lg' },
  md: { space: 'space-md', text: 'text-control-md' },
  sm: { space: 'space-sm', text: 'text-control-sm' },
}

/** The stop an element's props name in `data-density`, where they name one. */
export const densityOf = (props: Props): DensityStop | undefined => {
  const stop = props['data-density']
  return stop === 'sm' || stop === 'md' || stop === 'lg' ? stop : undefined
}

/** A length token times `share`, as a `calc()` of it comes to: rems stay rems. */
const times = (value: number | string | undefined, share: number): number | string | undefined => {
  if (typeof value === 'number') {
    return value * share
  }
  const rems = typeof value === 'string' ? /^(-?\d*\.?\d+)rem$/.exec(value) : null
  return rems === null ? value : `${Number((Number(rems[1]) * share).toFixed(4))}rem`
}

/** The theme's tokens at `stop`. */
export const denseTokens = (
  tokens: Readonly<Record<string, number | string>>,
  stop: DensityStop,
): Readonly<Record<string, number | string>> => {
  const out: Record<string, number | string> = { ...tokens }
  const set = (name: string, value: number | string | undefined) => {
    if (value !== undefined) {
      out[name] = value
    }
  }
  set('text-control', tokens[CONTROL[stop].text])
  set('space-control', tokens[CONTROL[stop].space])
  for (const size of STEPPED) {
    set(size, tokens[`${size}-${stop}`])
  }
  for (const size of ['size-checkbox', 'size-control', 'size-icon']) {
    for (const [name, share] of SHARES) {
      set(`${size}-${name}`, times(out[size], share))
    }
  }
  return out
}

/** The theme an element draws with at the stop its props name, or the theme as it is. */
export const useDensity = (theme: Theme, stop: DensityStop | undefined): Theme =>
  useMemo(
    () => (stop === undefined ? theme : { ...theme, tokens: denseTokens(theme.tokens, stop) }),
    [theme, stop],
  )

/** Gives the elements inside `children` the theme at the stop, where there is one. */
export const dense = (
  theme: Theme,
  stop: DensityStop | undefined,
  children: ReactNode,
): ReactNode =>
  stop === undefined ? children : <ThemeProvider {...theme}>{children}</ThemeProvider>

/**
 * A region at a density stop, as a `div` with `data-density` is on the web:
 * the elements inside draw with its control steps.
 */
export const Density = ({
  children,
  density,
}: {
  readonly children?: ReactNode
  readonly density?: DensityStop | undefined
}) => {
  const theme = useDensity(useTheme(), density)
  return dense(theme, density, children)
}
