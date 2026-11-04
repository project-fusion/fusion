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
