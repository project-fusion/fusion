/**
 * Whether a row of pages folds into its compact form on a phone, as the web's
 * does: where its own width cannot hold the full row on one line, it shows the
 * page and the count, and unfolds once the width can hold the row again.
 *
 * **The full row is measured while it shows**, from the `onLayout` of each
 * step and each page, the row's gap, and the run's own gap, padding, and
 * margins as its style resolves them, so the run counts whole however much of
 * it scrolls. Folded, the row keeps the width it last measured, as the web's
 * `fullWidth` does. A width not measured yet folds nothing.
 */

import { useCallback, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useResolve } from './indicator'

type Style = Readonly<Record<string, unknown>>

const points = (value: unknown): number => (typeof value === 'number' ? value : 0)

/** The first of `names` the style sets to a number, or nothing. */
const first = (style: Style, names: readonly string[]): number => {
  for (const name of names) {
    if (typeof style[name] === 'number') {
      return style[name] as number
    }
  }
  return 0
}

/** What a box takes along the row at its start and its end, of `side` (`padding` or `margin`). */
const across = (style: Style, side: 'margin' | 'padding'): number =>
  first(style, [`${side}InlineStart`, `${side}Start`, `${side}Left`, `${side}Horizontal`, side]) +
  first(style, [`${side}InlineEnd`, `${side}End`, `${side}Right`, `${side}Horizontal`, side])

const gapOf = (style: Style): number => first(style, ['columnGap', 'gap'])

/** The width each keyed box last reported, and a setter for its `onLayout`. */
const useWidths = () => {
  const [widths, setWidths] = useState<Readonly<Record<string, number>>>({})
  const laid = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width
      setWidths((was) => (was[key] === width ? was : { ...was, [key]: width }))
    },
    [],
  )
  return [widths, laid] as const
}

/**
 * Folds a row of pages. `steps` are the steps the row draws and `pages` the
 * keys of the pages it shows. Hands back whether it is folded, and the
 * `onLayout` for the host, for each step by name, and for each page by key.
 */
export const usePaginationFold = (
  family: Family,
  props: Props,
  compact: boolean,
  steps: readonly string[],
  pages: readonly string[],
) => {
  const { resolve } = useResolve(family, props)
  const [width, setWidth] = useState(0)
  const [stepWidths, stepLaid] = useWidths()
  const [pageWidths, pageLaid] = useWidths()
  const full = useRef(0)
  const narrow = useRef(false)
  const hostLaid = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width)
  }, [])
  if (!(compact || narrow.current)) {
    const measured = [
      ...steps.map((name) => stepWidths[name]),
      ...pages.map((key) => pageWidths[key]),
    ]
    if (measured.length > 0 && measured.every((one) => typeof one === 'number')) {
      const row = resolve('host').style as Style
      const list = resolve('list').style as Style
      const run =
        pages.reduce((sum, key) => sum + points(pageWidths[key]), 0) +
        Math.max(0, pages.length - 1) * gapOf(list) +
        across(list, 'padding') +
        across(list, 'margin')
      full.current =
        steps.reduce((sum, name) => sum + points(stepWidths[name]), 0) +
        run +
        steps.length * gapOf(row)
    }
  }
  if (!compact && width > 0 && full.current > 0) {
    narrow.current = full.current > width + 0.5
  }
  return { folded: compact || narrow.current, hostLaid, pageLaid, stepLaid }
}
