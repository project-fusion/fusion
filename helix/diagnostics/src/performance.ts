/**
 * What the components cost on a page, by tag: each element's first update,
 * the layout shift its elements moved, and the long tasks its first updates
 * ran in.
 *
 * **Measured only where a project asks**, with `console.performance` or
 * `send.performance`: measuring costs a little, and a page that did not ask
 * pays nothing. Core times each first update where a listener is in its slot,
 * and nothing where none is.
 *
 * **Layout shift and long tasks are Chromium's.** `PerformanceObserver` takes
 * `layout-shift` and `longtask` there and nowhere else, so a run says which it
 * could measure, and a browser that cannot is never read as a page with no
 * shift.
 */
import { OVERLAY } from './page.js'
import type { PerformanceReport } from './report.js'

/** The key `@fusion.dev/helix-core` hands each first update's timing to. */
export const RENDER_SLOT = Symbol.for('fusion.dev/helix/render')

/** How many first updates are kept per tag, for the long tasks to be laid over. */
const KEPT = 1000

/** What is gathered for one tag. */
interface Gathered {
  durations: number[]
  shift: number
  /** The first updates, as spans on the `performance.now()` clock. */
  spans: Array<{ end: number; start: number }>
}

/** A measure as the page holds it, until a run reads it. */
export interface Measurer {
  /** The measures so far. A copy: measuring goes on after it is read. */
  results(): PerformanceReport
  /** Stops measuring, and gives the slot back to whatever held it before. */
  stop(): void
}

/**
 * The tag of the Helix element a node belongs to: the node itself, or the
 * nearest Helix element above it, through shadow roots.
 */
export const helixOf = (node: Node | null | undefined): string | undefined => {
  let at: Node | null | undefined = node
  while (at) {
    if (at.nodeType === 1) {
      const tag = (at as Element).localName
      if (tag.startsWith('helix-') && tag !== OVERLAY) {
        return tag
      }
    }
    at = at.parentNode ?? (at as ShadowRoot).host ?? null
  }
  return undefined
}

/** The value at a fraction of the way through sorted numbers, by nearest rank. */
export const percentile = (sorted: readonly number[], fraction: number): number =>
  sorted.length === 0
    ? 0
    : (sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)] ?? 0)

/** Milliseconds to a tenth, and a score to a thousandth, which is all a reader compares. */
const tenth = (value: number): number => Math.round(value * 10) / 10
const thousandth = (value: number): number => Math.round(value * 1000) / 1000

/** A layout-shift entry's part, as this reads it. */
interface Shift {
  hadRecentInput?: boolean
  sources?: ReadonlyArray<{ node?: Node | null | undefined }>
  value: number
}

/**
 * Shares one shift's score out among the Helix elements its sources belong
 * to, an equal share each. A shift a reader caused, by typing or pressing, is
 * no fault of the page's, which is how the browser scores it too.
 */
export const shares = (shift: Shift): Map<string, number> => {
  const out = new Map<string, number>()
  const sources = shift.sources ?? []
  if (shift.hadRecentInput || sources.length === 0) {
    return out
  }
  const each = shift.value / sources.length
  for (const source of sources) {
    const tag = helixOf(source.node)
    if (tag) {
      out.set(tag, (out.get(tag) ?? 0) + each)
    }
  }
  return out
}

/** Whether this browser's `PerformanceObserver` takes an entry type. */
const supports = (type: string): boolean =>
  typeof PerformanceObserver === 'function' &&
  (PerformanceObserver.supportedEntryTypes ?? []).includes(type)

/** Starts measuring, from now on, and the layout shift and long tasks the browser kept from before. */
export const measure = (): Measurer => {
  const gathered = new Map<string, Gathered>()
  const of = (tag: string): Gathered => {
    let one = gathered.get(tag)
    if (!one) {
      one = { durations: [], shift: 0, spans: [] }
      gathered.set(tag, one)
    }
    return one
  }
  const long: Array<{ end: number; start: number }> = []

  const store = globalThis as Record<symbol, unknown>
  const before = store[RENDER_SLOT]
  let live = true
  const listener = (element: Element, timing: { duration: number; start: number }): void => {
    if (live && element?.localName !== OVERLAY) {
      const one = of(element.localName)
      one.durations.push(timing.duration)
      if (one.spans.length < KEPT) {
        one.spans.push({ end: timing.start + timing.duration, start: timing.start })
      }
    }
    if (typeof before === 'function') {
      before(element, timing)
    }
  }
  store[RENDER_SLOT] = listener

  const observers: PerformanceObserver[] = []
  const observe = (type: string, take: (entry: PerformanceEntry) => void): boolean => {
    if (!supports(type)) {
      return false
    }
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          take(entry)
        }
      })
      observer.observe({ buffered: true, type })
      observers.push(observer)
      return true
    } catch {
      /* A browser that lists the type and refuses it measures nothing. */
      return false
    }
  }
  const layoutShift = observe('layout-shift', (entry) => {
    for (const [tag, share] of shares(entry as unknown as Shift)) {
      of(tag).shift += share
    }
  })
  const longTasks = observe('longtask', (entry) => {
    long.push({ end: entry.startTime + entry.duration, start: entry.startTime })
  })

  return {
    results: () => {
      const tags: PerformanceReport['tags'] = {}
      for (const [tag, one] of [...gathered].sort(([a], [b]) => (a < b ? -1 : 1))) {
        const sorted = [...one.durations].sort((a, b) => a - b)
        tags[tag] = {
          longTasks: long.filter((task) =>
            one.spans.some((span) => span.start < task.end && span.end > task.start),
          ).length,
          render: {
            count: sorted.length,
            max: tenth(sorted.at(-1) ?? 0),
            p50: tenth(percentile(sorted, 0.5)),
            p95: tenth(percentile(sorted, 0.95)),
          },
          shift: thousandth(one.shift),
        }
      }
      return { measured: { layoutShift, longTasks }, tags }
    },
    stop: () => {
      live = false
      for (const observer of observers) {
        observer.disconnect()
      }
      if (store[RENDER_SLOT] === listener) {
        store[RENDER_SLOT] = before
      }
    },
  }
}
