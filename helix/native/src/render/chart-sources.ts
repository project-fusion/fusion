/**
 * The tables a phone's charts read, keyed by id, where the web's charts read a
 * table in the page by its id.
 *
 * **A phone has no document to look an id up in**, so a table that has an id
 * publishes its rows here as it is drawn, and a chart whose `for` names that
 * id reads them, and draws again as they change. A table drawn after the chart
 * that reads it still reaches it, and a table that goes away takes its rows
 * with it.
 *
 * The rows are core's `Row`, the same shape the web's `readRows` reads from a
 * table, so a chart says a reading in the table's own words on both platforms.
 */

import type { Row } from '@fusion.dev/helix-core/chart'
import { useSyncExternalStore } from 'react'

/** What a table publishes: its rows, and its caption, which names a single series. */
export interface ChartSource {
  readonly caption: string
  readonly rows: readonly Row[]
}

/** Each table's rows, by its id. */
const sources = new Map<string, ChartSource>()

/** Who hears a table's rows change. */
const listeners = new Set<() => void>()

const tell = (): void => {
  for (const listener of listeners) {
    listener()
  }
}

/**
 * Publishes a table's rows under `id`, in place of any it published before,
 * and returns what takes them away again.
 */
export const publishChartSource = (id: string, source: ChartSource): (() => void) => {
  sources.set(id, source)
  tell()
  return () => {
    if (sources.get(id) === source) {
      sources.delete(id)
      tell()
    }
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The rows the table with this id publishes, or none where no table has it or the id is empty. */
export const useChartSource = (id: string): ChartSource | undefined =>
  useSyncExternalStore(
    subscribe,
    () => (id === '' ? undefined : sources.get(id)),
    () => undefined,
  )

/**
 * The series a legend hid on each table, by its id and by lowercased name,
 * where the web holds them on the table element: **a legend writes them and
 * every chart reading the same table reads them**, so a chart draws without a
 * hidden series, and a series keeps its color while it is hidden. For a ring
 * the names are its rows, the slices being the rows.
 */
const hidden = new Map<string, ReadonlySet<string>>()

/** No series hidden. */
const NONE: ReadonlySet<string> = new Set()

/** A name as a heading is matched, without regard to case or the space around it. */
const keyOf = (name: string): string => name.trim().toLowerCase()

/**
 * Hides `names` on the table with this id, in place of those hidden before.
 * Given `among`, only those names are shown or hidden, and a series hidden
 * outside them stays hidden, as two legends on one table, one of its rows and
 * one of its columns, each keep their own. Nothing is told where the set is
 * already this one, so two writers that agree stop asking each other to draw.
 */
export const hideChartSeries = (
  id: string,
  names: Iterable<string>,
  among?: Iterable<string>,
): void => {
  if (id === '') {
    return
  }
  const now = hidden.get(id) ?? NONE
  const mine = among === undefined ? undefined : new Set([...among].map(keyOf))
  const kept = mine === undefined ? [] : [...now].filter((one) => !mine.has(one))
  const next = new Set([...kept, ...[...names].map(keyOf)].filter(Boolean))
  if (next.size === now.size && [...next].every((one) => now.has(one))) {
    return
  }
  if (next.size === 0) {
    hidden.delete(id)
  } else {
    hidden.set(id, next)
  }
  tell()
}

/** The series hidden on the table with this id, by lowercased name. */
export const useHiddenSeries = (id: string): ReadonlySet<string> =>
  useSyncExternalStore(
    subscribe,
    () => (id === '' ? NONE : (hidden.get(id) ?? NONE)),
    () => NONE,
  )

/** Whether a series of this name is drawn, which it is unless a legend hid it. */
export const showsSeries = (set: ReadonlySet<string>, name: string): boolean =>
  !set.has(keyOf(name))
