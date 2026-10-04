/**
 * The runtime events `@fusion.dev/helix-core` reports as the library runs,
 * such as a selectable table with no `row-key`: heard, counted, and kept for
 * each run.
 *
 * **Through the slots core writes to**, under registered symbols, so this
 * package imports nothing from the library it diagnoses, and every copy of
 * core on a page is heard.
 *
 * **The events from before diagnostics started are read from core's log**,
 * since the first ones happen as the modules load: a tag registered twice is
 * reported before any listener can exist. Core printed those, since nothing
 * listened.
 */
import { runtimeFingerprint } from './identity.js'
import type { RuntimeEntry } from './report.js'

/** The key core reports each event to. */
export const RUNTIME_SLOT = Symbol.for('fusion.dev/helix/runtime')

/** The key core keeps the events it reported under, the first two hundred. */
export const RUNTIME_LOG = Symbol.for('fusion.dev/helix/runtime-log')

/**
 * The kinds a finding already reports, which the console and the overlay leave
 * out: two copies of Helix on a page is the `duplicate-registration` finding.
 */
export const AS_FINDINGS: ReadonlySet<string> = new Set(['duplicate-registration'])

/** An event as core reports it, read without importing core. */
export interface Heard {
  detail?: unknown
  kind: string
  level?: 'error' | 'warn'
  message: string
  tag?: string | undefined
}

/** Whether a value is an event core could have reported. */
const isHeard = (value: unknown): value is Heard =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Heard).kind === 'string' &&
  typeof (value as Heard).message === 'string'

/** The events core has kept so far. */
export const logged = (): Heard[] => {
  const log = (globalThis as Record<symbol, unknown>)[RUNTIME_LOG]
  return Array.isArray(log) ? log.filter(isHeard) : []
}

/** One entry per distinct event, counted as each is heard. */
export interface Tally {
  /** Counts one event; `printed` says whether core printed it. */
  add(event: unknown, printed: boolean): void
  /** The entries so far. Copies: counting goes on after they are read. */
  entries(): RuntimeEntry[]
}

/** Starts a count. */
export const tally = (): Tally => {
  const entries = new Map<string, RuntimeEntry>()
  return {
    add(event, printed) {
      if (!isHeard(event)) {
        return
      }
      const fingerprint = runtimeFingerprint(event.kind, event.tag, event.message)
      const known = entries.get(fingerprint)
      if (known) {
        known.count += 1
        return
      }
      entries.set(fingerprint, {
        count: 1,
        fingerprint,
        kind: event.kind,
        level: event.level === 'error' ? 'error' : 'warn',
        message: event.message,
        printed,
        ...(event.tag === undefined ? {} : { tag: event.tag }),
      })
    },
    entries: () => [...entries.values()].map((one) => ({ ...one })),
  }
}

/** The entries a reader is shown: those no finding reports already. */
export const shownRuntime = (entries: readonly RuntimeEntry[]): RuntimeEntry[] =>
  entries.filter((one) => !AS_FINDINGS.has(one.kind))
