/**
 * What a project can set, and where it can set it.
 *
 * **One shape, three places, and a later place wins**: the shipped defaults
 * below, the project's own file (`helix-diagnostics.json`, imported by the
 * build and handed over, since a page cannot read files), and the call to
 * `diagnose`. Every withheld category and every override says which place
 * decided it.
 *
 * **A setting that names nothing throws**, and names the closest setting that
 * does exist: a misspelled option silently doing nothing is the fault class
 * this package exists to find.
 *
 * **Nothing here sends anything.** `send`, `detail`, and `environments` are
 * read by the sinks that send, and recorded in every run so a dashboard knows
 * what a project withheld.
 */
import { nearest } from './manifest.js'
import { CATEGORIES, type Category, type Configuration, type Layer, type Report } from './report.js'
import { checkRules, type Rules } from './rules.js'

/** Everything a project can set. Every field is optional; see `DEFAULTS`. */
export interface Config {
  /** The lowest level each category prints at in the console, or `off`. */
  console?: Partial<Configuration['console']>
  /** How much detail goes with what is sent. */
  detail?: Partial<Configuration['detail']>
  /** Where sending happens. Production takes `{ sample }`, from 0 to 1. */
  environments?: Partial<Configuration['environments']>
  /**
   * The project: its key, which opts it in to sending, and its own name and
   * labels. `tags` are free, and `fusion` marks Fusion's own projects.
   */
  project?: { key?: string; name?: string; tags?: string[] }
  /** Severities by kind; see `Rules`. */
  rules?: Rules
  /** Each category, sent or withheld. Nothing is sent without a key. */
  send?: Partial<Record<Category, boolean>>
  /**
   * Where `initDiagnostics()` hands each run, beside the console: the
   * `overlay` on the page, and the `relay`, `helix diagnostics`, on or off or
   * at an address of its own.
   */
  sinks?: Partial<Configuration['sinks']>
}

/** The shipped defaults. */
export const DEFAULTS = {
  console: { coverage: 'info', findings: 'info', usage: 'debug' },
  detail: { evidence: 'full', hookValues: true, pages: 'patterns' },
  environments: { ci: true, development: true, production: false },
  send: {
    assist: true,
    configuration: true,
    coverage: true,
    findings: true,
    performance: false,
    runtime: true,
    usage: true,
  },
  /* **The relay is off until asked for.** A page asking for a relay that is
     not running prints a refused connection in DevTools on every load, for
     every project that never runs one. */
  sinks: { overlay: true, relay: false },
} as const satisfies {
  console: Configuration['console']
  detail: Configuration['detail']
  environments: Configuration['environments']
  send: Record<Category, boolean>
  sinks: Configuration['sinks']
}

/**
 * A local host: `localhost`, `127.0.0.1`, `[::1]`, `*.localhost`, and `*.test`.
 * A page with no declared environment runs only on one, and the relay is only
 * ever at one, as `helix diagnostics` takes runs only from one: a relay at
 * another address would be a second way to send, with no key and no `send`.
 */
export const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/

/** Whether `address` is an origin on a local host, such as `http://127.0.0.1:7417`. */
const local = (address: string): boolean => {
  if (!/^https?:\/\/[^/?#@]+$/.test(address)) {
    return false
  }
  try {
    return LOCAL.test(new URL(address).hostname)
  } catch {
    return false
  }
}

/** The values each setting may take, for the errors below. */
const ALLOWED: Record<
  string,
  Record<string, readonly unknown[] | 'address' | 'sample' | 'string' | 'tags'>
> = {
  console: {
    coverage: ['info', 'off'],
    findings: ['error', 'warn', 'info', 'off'],
    usage: ['debug', 'off'],
  },
  detail: {
    evidence: ['full', 'selector', 'none'],
    hookValues: [true, false],
    pages: ['patterns', 'full', 'none'],
  },
  environments: { ci: [true, false], development: [true, false], production: 'sample' },
  project: { key: 'string', name: 'string', tags: 'tags' },
  send: Object.fromEntries(CATEGORIES.map((category) => [category, [true, false]])),
  sinks: { overlay: [true, false], relay: 'address' },
}

/** A value's name in an error. */
const shown = (value: unknown): string =>
  typeof value === 'string' ? `\`${value}\`` : String(value)

/** Throws on a setting that names nothing, or a value it cannot take. */
export const checkConfig = (config: Config | undefined, layer: Exclude<Layer, 'shipped'>): void => {
  if (config === undefined) {
    return
  }
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error(`The ${layer} is not a configuration object.`)
  }
  for (const [section, value] of Object.entries(config)) {
    if (section === 'rules') {
      checkRules(value as Rules, layer)
      continue
    }
    const allowed = ALLOWED[section]
    if (!allowed) {
      const close = nearest(section, [...Object.keys(ALLOWED), 'rules'])
      throw new Error(
        `The ${layer} sets \`${section}\`, which is no setting.` +
          (close ? ` The closest is \`${close}\`.` : ''),
      )
    }
    for (const [name, one] of Object.entries(value as Record<string, unknown>)) {
      const takes = allowed[name]
      if (takes === undefined) {
        const close = nearest(name, Object.keys(allowed))
        throw new Error(
          `The ${layer} sets \`${section}.${name}\`, which is no setting.` +
            (close ? ` The closest is \`${section}.${close}\`.` : ''),
        )
      }
      const fits =
        takes === 'string'
          ? typeof one === 'string'
          : takes === 'tags'
            ? Array.isArray(one) && one.every((tag) => typeof tag === 'string')
            : takes === 'address'
              ? typeof one === 'boolean' || (typeof one === 'string' && local(one))
              : takes === 'sample'
                ? one === false ||
                  (typeof one === 'object' &&
                    one !== null &&
                    typeof (one as { sample?: unknown }).sample === 'number' &&
                    (one as { sample: number }).sample >= 0 &&
                    (one as { sample: number }).sample <= 1)
                : takes.includes(one)
      if (!fits) {
        const expected =
          takes === 'string'
            ? 'a string'
            : takes === 'tags'
              ? 'a list of strings'
              : takes === 'address'
                ? '`true`, `false`, or an address on a local host, such as `http://127.0.0.1:7417`'
                : takes === 'sample'
                  ? '`false`, or `{ sample }` from 0 to 1'
                  : takes.map(shown).join(', ')
        throw new Error(
          `The ${layer} sets \`${section}.${name}\` to \`${JSON.stringify(one)}\`. It takes ${expected}.`,
        )
      }
    }
  }
}

/** The settings in effect, from the defaults, the file, and the call. */
export interface Resolved {
  configuration: Omit<Configuration, 'overrides' | 'silenced'>
  project: Report['project']
  /** Each category's sending, and which place decided it. */
  send: Record<Category, { decidedBy: Layer; on: boolean }>
}

/** The three places, merged, with a later one winning field by field. */
export const resolveConfig = (file: Config | undefined, call: Config | undefined): Resolved => {
  checkConfig(file, 'file')
  checkConfig(call, 'argument')
  const merged = <T extends object>(
    section: 'console' | 'detail' | 'environments' | 'sinks',
    base: T,
  ): T => ({
    ...base,
    ...(file?.[section] ?? {}),
    ...(call?.[section] ?? {}),
  })
  const send = Object.fromEntries(
    CATEGORIES.map((category) => {
      const fromCall = call?.send?.[category]
      const fromFile = file?.send?.[category]
      return [
        category,
        fromCall !== undefined
          ? { decidedBy: 'argument', on: fromCall }
          : fromFile !== undefined
            ? { decidedBy: 'file', on: fromFile }
            : { decidedBy: 'shipped', on: DEFAULTS.send[category] },
      ]
    }),
  ) as Resolved['send']
  const project = { ...(file?.project ?? {}), ...(call?.project ?? {}) }
  return {
    configuration: {
      console: merged('console', { ...DEFAULTS.console }),
      detail: merged('detail', { ...DEFAULTS.detail }),
      environments: merged('environments', { ...DEFAULTS.environments }),
      sinks: merged('sinks', { ...DEFAULTS.sinks }),
    },
    /* The key opts a project in, and is never written into a report. */
    project: {
      ...(project.name === undefined ? {} : { name: project.name }),
      tags: project.tags ?? [],
    },
    send,
  }
}

/**
 * A page's path as a pattern: each segment that names one record, a number,
 * a UUID, or a long run of hex or mixed letters and digits, becomes `:id`.
 * `/orders/1042/items/9f8e7d6c5b4a` reads `/orders/:id/items/:id`.
 */
export const pagePattern = (path: string): string =>
  path
    .split('/')
    .map((segment) =>
      /^\d+$/.test(segment) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
      /^[0-9a-f]{8,}$/i.test(segment) ||
      (segment.length >= 12 && /\d/.test(segment) && /^[A-Za-z0-9_-]+$/.test(segment))
        ? ':id'
        : segment,
    )
    .join('/')
