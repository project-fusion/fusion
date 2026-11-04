/**
 * A chart's key on a phone: an entry for each series of the table its `for`
 * names, each with its palette color, and under `toggles` a press that hides
 * the series in every chart reading the same table.
 *
 * **The entries are the table's series**, as the web's legend reads them:
 * each column of numbers under `series`, each row under `categories`, and
 * each column but the first under `measures`.
 *
 * **The hidden series are the table's**, held by its id where the web holds
 * them on the table, so every chart reading it draws without them. This
 * legend's own `hidden-series` is written there as it is given, and a press
 * asks first, with `before-change` carrying the list it would leave, and sends
 * `change` once it stands. A list another legend wrote on the same table is
 * this one's too, as two switches on one lamp.
 *
 * **The styled tier's `outlined`, `subtle`, and `glass` name entries**, which
 * the web marks after it draws; a phone writes each entry's treatment with it.
 */

import {
  isHidden,
  namesIn,
  type Row,
  seriesIndex,
  seriesKey,
  seriesOfRows,
  toggledNames,
  writtenList,
} from '@fusion.dev/helix-core/chart'
import { useEffect, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { hideChartSeries, useChartSource, useHiddenSeries } from '../render/chart-sources'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { type Theme, useTheme } from '../theme/theme'
import { paletteOf } from './chart-common'
import { kebab, wordsIn } from './date-picker-read'
import { boundTo, given, tell } from './props'

type Read = (name: string) => unknown

/** The names the legend keys, in the order the chart draws them. */
const namesOf = (rows: readonly Row[], caption: string, entries: string): readonly string[] => {
  const series = seriesOfRows(rows, caption)
  if (entries === 'categories') {
    return series[0]?.points.map((point) => point.label) ?? []
  }
  return (entries === 'measures' ? series.slice(1) : series).map((one) => one.name)
}

/** The places of the entries a list of names matches, as the styled tier matches them. */
const placesIn = (list: unknown, names: readonly string[]): ReadonlySet<number> => {
  const showing = names.map(seriesKey)
  return new Set(
    writtenList(wordsIn(list))
      .map(seriesKey)
      .flatMap((name) => {
        const at = showing.indexOf(name)
        return at < 0 ? [] : [at]
      }),
  )
}

/** Each entry, as the tree draws it: its name, its color, whether it is hidden, and its treatment. */
const entriesOf = (read: Read, names: readonly string[], hidden: string, theme: Theme) => {
  const outlined = placesIn(read('outlined'), names)
  const subtle = placesIn(read('subtle'), names)
  const glass = placesIn(read('glass'), names)
  return names.map((name, place) => {
    const off = isHidden(hidden, name)
    return {
      color: paletteOf(theme)(place),
      emphasis: outlined.has(place) ? 'outlined' : subtle.has(place) ? 'subtle' : '',
      hidden: off,
      key: String(place),
      material: glass.has(place) ? 'glass' : '',
      name,
      pressed: !off,
      series: String(seriesIndex(place)),
    }
  })
}

/** Hosts a chart's key: its entries from the table, and the series its toggles hide. */
export const useLegend = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const id = wordsIn(read('for'))
  const source = useChartSource(id)
  const names = namesOf(source?.rows ?? [], source?.caption ?? '', wordsIn(read('entries')))
  const table = useHiddenSeries(id)
  /* What the table hides among this legend's entries is this legend's list. */
  const hidden = names.filter((name) => table.has(seriesKey(name))).join(', ')
  const own = namesIn((read('hidden-series') as string | readonly string[] | undefined) ?? '')
  const key = names.join('\n')
  const ownKey = own.join('\n')
  /* This legend's own list is written to the table as it is given, among its own entries alone. */
  useEffect(() => {
    if (key !== '') {
      hideChartSeries(id, ownKey === '' ? [] : ownKey.split('\n'), key.split('\n'))
    }
  }, [id, key, ownKey])
  /* A legend that leaves takes its hidden series with it. */
  const left = useRef({ id, names })
  left.current = { id, names }
  useEffect(
    () => () => {
      hideChartSeries(left.current.id, [], left.current.names)
    },
    [],
  )
  const toggle = (name: string) => {
    const next = toggledNames(hidden, name)
    const asks = boundTo(use, 'onBeforeChange', 'event')
    if (asks !== undefined && !tell(family, props, asks, { value: next })) {
      return
    }
    hideChartSeries(id, namesIn(next), names)
    const changed = boundTo(use, 'onChange', 'event')
    if (changed !== undefined) {
      tell(family, props, changed, {})
    }
  }
  const toggles = read('toggles') === true
  const named = wordsIn(read('label')) || (source?.caption ?? '')
  const entries = entriesOf(read, names, hidden, useTheme())
  return {
    marks: [],
    parts: {
      host: {
        lists: { [flag('entries')]: entries },
        states: { [flag('named')]: named, [flag('role')]: toggles ? 'toolbar' : 'list' },
      },
      list: { lists: { [flag('entries')]: entries } },
      toggle: {
        copy: (item: Entry) => ({ onPress: () => toggle(String(item.fields.name ?? '')) }),
      },
    },
  }
}
