/**
 * One call, in any framework: `initDiagnostics()`.
 *
 * ```ts
 * import { initDiagnostics } from '@fusion.dev/helix-diagnostics'
 *
 * initDiagnostics({ environment: import.meta.env.MODE })
 * ```
 *
 * **Once, at the app's entry, before the app mounts**, in whatever builds it:
 * `main.ts` in Vite, Vue, Svelte, or Solid, before `bootstrapApplication` in
 * Angular, `instrumentation-client.ts` in Next.js, or a module script with no
 * bundler. It needs nothing from a framework: it reads the DOM, hears
 * elements render through core's listener, and hears navigation from the
 * browser.
 *
 * **It never breaks the app.** It never throws; a setting that names nothing
 * is printed with the closest setting, and the handle it returns does
 * nothing. A run that throws is printed, and three in a row stop it. Each
 * place a run goes is isolated from the others.
 *
 * **It never runs in production by accident.** With no environment declared
 * it runs only on a local host, since each framework says development its
 * own way. Production runs only with `environment: 'production'` and a sample
 * rate.
 */

import { type Config, checkConfig, LOCAL, resolveConfig } from './config.js'
import { report as print } from './console.js'
import { diagnose } from './diagnose.js'
import type { LintData, Tier } from './manifest.js'
import { type Overlay, overlayOn } from './overlay.js'
import type { Configuration, Environment, Report } from './report.js'
import { type Schedule, schedule } from './schedule.js'
import { loadedVersions, type Watcher, watch } from './usage.js'

/** What `initDiagnostics()` takes: the settings, and where the run comes from. */
export interface InitOptions extends Config {
  /**
   * Where lint data is loaded from, where `tiers` is not given: a base the
   * package and version follow, as
   * `https://cdn.jsdelivr.net/npm/@fusion.dev/helix@0.138.0/lint.json`.
   * `false` loads nothing. jsDelivr by default.
   */
  cdn?: string | false | undefined
  /** `duplicateRegistrations` from `@fusion.dev/helix-core`, as `diagnose` takes it. */
  duplicates?: (() => string[]) | undefined
  /**
   * Where the page runs, as the project declares it. Undeclared, it runs only
   * on a local host: `localhost`, `127.0.0.1`, `[::1]`, `*.localhost`, and
   * `*.test`.
   */
  environment?: Environment | undefined
  /** The project's own file, `helix-diagnostics.json`, parsed. */
  file?: Config | undefined
  /** Called with each run, after the console has it. */
  onReport?: ((run: Report) => void) | undefined
  /**
   * The page's path as the app's router names it, such as `/products/[id]`,
   * asked at each run. The location, made a pattern, otherwise.
   */
  page?: (() => string | undefined) | undefined
  /**
   * The lint data or manifests to check against. Loaded from `cdn`, for the
   * Helix version core lists on the page, where not given.
   */
  tiers?: Tier[] | undefined
}

/** What `initDiagnostics()` returns. */
export interface Diagnostics {
  /** Whether it is running: false where it declined to start, and after `stop()`. */
  readonly active: boolean
  /** The last run, once there is one. */
  readonly latest: Report | undefined
  /** Runs now, outside the schedule, and returns the run, where it can run yet. */
  run(): Report | undefined
  /** Calls `listener` with every run from now on, and returns its removal. */
  subscribe(listener: (run: Report) => void): () => void
  /** Stops it: nothing more runs. A later `initDiagnostics()` starts afresh. */
  stop(): void
}

/**
 * The key the running instance is kept under: a second call returns it, as
 * React's strict mode, hot module replacement, and a component mounting twice
 * each make, and an end-to-end test reads it to assert a page has no findings.
 */
export const INSTANCE = Symbol.for('fusion.dev/helix/diagnostics')

/** Where lint data comes from by default. */
const CDN = 'https://cdn.jsdelivr.net/npm'

/** Where `helix diagnostics` listens by default. */
const RELAY = 'http://127.0.0.1:7417'

/** The largest body sent with `keepalive`, which browsers cap at 64 KB. */
const KEEPALIVE = 60_000

/** How many failed runs in a row stop it. */
const FAILURES = 3

/** A handle that does nothing, for a page it declined to run on. */
const inert = (): Diagnostics => ({
  active: false,
  latest: undefined,
  run: () => undefined,
  stop: () => {},
  subscribe: () => () => {},
})

/** What has been printed, so each thing is said once. */
const said = new Set<string>()

/** Prints through `print`, once for each `key`, and never throws. */
const once = (key: string, print: () => void): void => {
  if (said.has(key)) {
    return
  }
  said.add(key)
  try {
    print()
  } catch {
    /* A console that throws has nowhere better to say so. */
  }
}

/** A thrown value's message. */
const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Starts diagnostics on this page, or returns the handle it already has.
 *
 * Never throws. On a server, with no `document`, it returns a handle that
 * does nothing, so it is safe in code server-side rendering also runs.
 */
export const initDiagnostics = (options: InitOptions = {}): Diagnostics => {
  const page = globalThis.document
  if (page === undefined) {
    return inert()
  }
  const store = globalThis as Record<symbol, unknown>
  const existing = store[INSTANCE] as Diagnostics | undefined
  if (existing?.active) {
    return existing
  }
  try {
    const started = start(options, page)
    if (started.active) {
      store[INSTANCE] = started
    }
    return started
  } catch (error) {
    once(`start ${messageOf(error)}`, () =>
      console.error('helix diagnostics: not started, and the page goes on as usual.', error),
    )
    return inert()
  }
}

/** Decides whether to run here, and runs. */
const start = (options: InitOptions, page: Document): Diagnostics => {
  const {
    cdn = CDN,
    duplicates,
    environment,
    file,
    onReport,
    page: route,
    tiers,
    ...call
  } = options
  /* A setting that names nothing: said, and nothing started. */
  let configuration: ReturnType<typeof resolveConfig>['configuration']
  try {
    configuration = resolveConfig(file, call).configuration
  } catch (error) {
    once(`settings ${messageOf(error)}`, () =>
      console.error(`helix diagnostics: not started. ${messageOf(error)}`),
    )
    return inert()
  }
  const host = globalThis.location?.hostname ?? ''
  if (environment === undefined && !LOCAL.test(host)) {
    once(`host ${host}`, () =>
      console.info(
        `helix diagnostics: not running on ${host || 'this page'}, which is no local host, with no environment declared. Pass \`environment\` to run here.`,
      ),
    )
    return inert()
  }
  if (environment === 'production') {
    const production = configuration.environments.production
    if (production === false || Math.random() >= production.sample) {
      return inert()
    }
  }
  return running({
    call,
    cdn,
    duplicates,
    environment,
    file,
    onReport,
    page,
    route,
    sinks: configuration.sinks,
    tiers,
  })
}

/** Everything a running instance holds. */
interface Running {
  call: Config
  cdn: string | false
  duplicates: (() => string[]) | undefined
  environment: Environment | undefined
  file: Config | undefined
  onReport: ((run: Report) => void) | undefined
  page: Document
  route: (() => string | undefined) | undefined
  sinks: Configuration['sinks']
  tiers: Tier[] | undefined
}

/** The running instance: the watcher, the schedule, the triggers, and the sinks. */
const running = (given: Running): Diagnostics => {
  const { call, cdn, duplicates, environment, page, route, sinks } = given
  /* **The sinks for the developer stay with the developer.** A visitor never
     sees the console's findings or the overlay, and a visitor's browser never
     reaches a port on the visitor's own machine, so production runs go to the
     app alone. CI keeps the console and the relay, and its screenshots never
     hold the overlay. Undeclared, the page is on a local host: development. */
  const production = environment === 'production'
  const development = environment === undefined || environment === 'development'
  /* The project's settings: given, or served by the relay once it answers. */
  let file = given.file
  let overlay: Overlay | undefined
  /* The relay: where it is, whether it answered, and the last run sent for each page. */
  const relay = production ? undefined : sinks.relay === true ? RELAY : sinks.relay || undefined
  let relayed = false
  const sent = new Map<string, string>()
  const listeners = new Set<(run: Report) => void>()
  if (given.onReport) {
    listeners.add(given.onReport)
  }
  /* The fingerprints printed so far, by page, so a page repeats nothing. */
  const shown = new Map<string, Set<string>>()
  let lint = given.tiers
  let loading = false
  let latest: Report | undefined
  let failures = 0
  let active = true

  /** Hands one run to one place, isolated from the others. */
  const deliver = (where: string, send: () => void): void => {
    try {
      send()
    } catch (error) {
      once(`sink ${where}`, () =>
        console.error(`helix diagnostics: ${where} threw on a run, and the others had it.`, error),
      )
    }
  }

  /** One run, now. Returns how long it took, which spaces the next. */
  const runNow = (): number => {
    const begun = globalThis.performance?.now() ?? Date.now()
    if (!active) {
      return 0
    }
    if (!lint) {
      load()
      return 0
    }
    let path: string | undefined
    try {
      path = route?.()
    } catch {
      path = undefined
    }
    let run: Report
    try {
      run = diagnose({
        ...call,
        duplicates,
        environment,
        file,
        from: page,
        page: path,
        tiers: lint,
        watcher,
      })
      failures = 0
    } catch (error) {
      failures += 1
      once(`run ${messageOf(error)}`, () =>
        console.error('helix diagnostics: a run failed.', error),
      )
      if (failures >= FAILURES) {
        once('stopped', () =>
          console.error(
            `helix diagnostics: stopped after ${FAILURES} failed runs in a row, and the page goes on as usual.`,
          ),
        )
        stop()
      }
      return (globalThis.performance?.now() ?? Date.now()) - begun
    }
    latest = run
    const key = run.run.page ?? ''
    const seen = shown.get(key) ?? new Set<string>()
    shown.set(key, seen)
    if (!production) {
      deliver('the console', () => print(run, console, { shown: seen }))
    }
    for (const listener of listeners) {
      deliver('a subscriber', () => listener(run))
    }
    deliver('the helix-diagnostics event', () =>
      page.dispatchEvent(new CustomEvent('helix-diagnostics', { detail: run })),
    )
    if (sinks.overlay && development) {
      deliver('the overlay', () => {
        /* Made the first time there is something to show, and not before. */
        if (overlay || run.findings.length > 0) {
          overlay ??= overlayOn(page)
          overlay.show(run)
        }
      })
    }
    if (relay && relayed) {
      deliver('the relay', () => {
        /* **Only a run that differs from the last one sent for its page.** */
        const same = JSON.stringify([
          run.findings.map((one) => [one.fingerprint, one.severity]),
          run.coverage.read,
          run.coverage.sheets,
          run.usage.tags,
        ])
        if (sent.get(key) === same) {
          return
        }
        sent.set(key, same)
        const body = JSON.stringify(run)
        fetch(`${relay}/runs`, {
          body,
          credentials: 'omit',
          headers: { 'content-type': 'text/plain' },
          keepalive: body.length < KEEPALIVE,
          method: 'POST',
        }).catch(() => {
          relayed = false
          once('relay gone', () =>
            console.warn(
              'helix diagnostics: the relay stopped answering, so runs are no longer sent to it.',
            ),
          )
        })
      })
    }
    return run.run.duration
  }

  /**
   * Loads the lint data for the Helix version on the page, once. **Both tiers
   * where the styled one is in use**, since a part the headless tier publishes
   * and the styled tier never forwarded is only visible with both.
   */
  const load = (): void => {
    if (loading || cdn === false) {
      if (cdn === false) {
        once('no lint', () =>
          console.warn(
            'helix diagnostics: no lint data, since `cdn` is false and no `tiers` were given, so this page is not checked.',
          ),
        )
      }
      return
    }
    const [version] = loadedVersions()
    if (version === undefined) {
      /* Core has not loaded yet: the first element's render asks again. */
      return
    }
    const counts = watcher.counts()
    const tags = [...Object.keys(counts.tags), ...Object.keys(counts.composed)]
    const styled = tags.some(
      (tag) => tag.startsWith('helix-') && !tag.startsWith('helix-headless-'),
    )
    const packages = styled
      ? ['@fusion.dev/helix', '@fusion.dev/helix-headless']
      : ['@fusion.dev/helix-headless']
    loading = true
    Promise.all(
      packages.map(async (name) => {
        const url = `${cdn}/${name}@${version}/lint.json`
        const response = await fetch(url, { credentials: 'omit' })
        if (!response.ok) {
          throw new Error(`${url} answered ${response.status}`)
        }
        const data = (await response.json()) as LintData
        if (typeof data?.tags !== 'object' || data.tags === null) {
          throw new Error(`${url} is not lint data`)
        }
        return { lint: data }
      }),
    ).then(
      (loaded) => {
        lint = loaded
        plan.poke()
      },
      (error: unknown) => {
        once('no lint', () =>
          console.warn(
            `helix diagnostics: the lint data for Helix ${version} could not be loaded (${messageOf(error)}), so this page is not checked. Pass \`tiers\` to initDiagnostics() to check it without the network.`,
          ),
        )
      },
    )
  }

  /* **One probe of the relay, at start**: absent, it is not asked again. */
  if (relay) {
    const ask = (path: string) =>
      fetch(`${relay}${path}`, {
        credentials: 'omit',
        ...(typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(1000) } : {}),
      })
    ask('/health')
      .then(async (answer) => {
        if (!answer.ok) {
          throw new Error(`it answered ${answer.status}`)
        }
        relayed = true
        if (!given.file) {
          const settings = await ask('/config')
          if (settings.ok) {
            const served = (await settings.json()) as Config
            try {
              checkConfig(served, 'file')
              file = served
            } catch (error) {
              once(`relay settings ${messageOf(error)}`, () =>
                console.error(
                  `helix diagnostics: the settings the relay served were not used. ${messageOf(error)}`,
                ),
              )
            }
          }
        }
        plan.poke()
      })
      .catch((error: unknown) =>
        once('no relay', () =>
          console.warn(
            `helix diagnostics: no relay at ${relay} (${messageOf(error)}). Start it with \`helix diagnostics\`, or turn \`sinks.relay\` off.`,
          ),
        ),
      )
  }

  const plan: Schedule = schedule(runNow)
  const watcher: Watcher = watch(page, { onRender: () => plan.poke() })
  const poke = (): void => plan.poke()
  /* A change to the page's own markup, stylesheets among it, and never the
     overlay arriving, which is diagnostics' own. */
  const observer =
    typeof MutationObserver === 'function'
      ? new MutationObserver((records) => {
          if (
            records.some((record) =>
              [...record.addedNodes, ...record.removedNodes].some(
                (node) => node !== overlay?.element,
              ),
            )
          ) {
            poke()
          }
        })
      : undefined
  observer?.observe(page.documentElement, { childList: true, subtree: true })
  /* A navigation: the Navigation API where there is one, history otherwise.
     A route's new markup is also a change the observer sees. */
  const navigation = (globalThis as { navigation?: EventTarget }).navigation
  if (navigation) {
    navigation.addEventListener('navigatesuccess', poke)
  } else {
    globalThis.addEventListener?.('popstate', poke)
    globalThis.addEventListener?.('hashchange', poke)
  }
  /* The first run, once the page has loaded. */
  if (page.readyState === 'complete') {
    poke()
  } else {
    globalThis.addEventListener?.('load', poke, { once: true })
  }

  const stop = (): void => {
    if (!active) {
      return
    }
    active = false
    plan.stop()
    observer?.disconnect()
    watcher.stop()
    navigation?.removeEventListener('navigatesuccess', poke)
    globalThis.removeEventListener?.('popstate', poke)
    globalThis.removeEventListener?.('hashchange', poke)
    globalThis.removeEventListener?.('load', poke)
    listeners.clear()
    overlay?.remove()
    const store = globalThis as Record<symbol, unknown>
    if (store[INSTANCE] === handle) {
      delete store[INSTANCE]
    }
  }

  const handle: Diagnostics = {
    get active() {
      return active
    },
    get latest() {
      return latest
    },
    run: () => {
      runNow()
      return latest
    },
    stop,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return handle
}
