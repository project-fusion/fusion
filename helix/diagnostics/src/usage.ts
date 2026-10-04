/**
 * What a page uses of Helix: the elements it renders, the axes and slots it
 * sets on them, and the parts and hooks its stylesheets reach for.
 *
 * **Two sources, because each sees what the other cannot.** The elements tell
 * `watch()` themselves, after their first render, through a slot
 * `@fusion.dev/helix-core` reads, so a dialog that opened and closed is
 * counted. The stylesheets are read by the collector, so a part styled is
 * counted whether or not anything on the page matches the rule yet.
 *
 * **Counted, never sent.** This file holds counts and nothing that leaves the
 * page. A sink decides where a report goes.
 */
import { parts, targets } from './analyze.js'
import type { Answered, Located } from './collect.js'
import type { Published } from './manifest.js'
import { OVERLAY, type Page, pageOf } from './page.js'
import { type Measurer, measure } from './performance.js'
import type { PerformanceReport, RuntimeEntry, Usage } from './report.js'
import { type Heard, logged, RUNTIME_SLOT, tally as tallyRuntime } from './runtime.js'

/**
 * The key `@fusion.dev/helix-core` reads a listener from. **A registered
 * symbol**, the one name every copy of core on the page and this package agree
 * on without either importing the other.
 */
const SLOT = Symbol.for('fusion.dev/helix/usage')

/** The axes counted, which are the visual axes every styled family shares. */
const AXES = ['emphasis', 'material', 'separation', 'tone'] as const

/** Adds one to a count, making the counts on the way. */
const bump = (into: Record<string, number>, key: string, by = 1): void => {
  into[key] = (into[key] ?? 0) + by
}

/** The counts under a key, made where absent. */
const under = <T>(into: Record<string, T>, key: string, make: () => T): T => {
  let found = into[key]
  if (found === undefined) {
    found = make()
    into[key] = found
  }
  return found
}

/** The element counts, before the stylesheets add theirs. */
type Counted = Pick<Usage, 'axes' | 'composed' | 'slots' | 'tags'>

const empty = (): Counted => ({ axes: {}, composed: {}, slots: {}, tags: {} })

/**
 * The Helix versions loaded on the page: every copy of core adds its own to
 * a list under a registered symbol as it loads. Empty for a core older than
 * 0.137, which lists nothing.
 */
export const loadedVersions = (): string[] => {
  const listed = (globalThis as Record<symbol, unknown>)[Symbol.for('fusion.dev/helix/versions')]
  return Array.isArray(listed) ? listed.filter((one) => typeof one === 'string').sort() : []
}

/**
 * Counts one element.
 *
 * **What a Helix element renders inside itself is counted apart**, as
 * `composed`: a pagination size draws a select, and counting that select as
 * the page's own would credit a component nobody reached for.
 */
const tally = (counted: Counted, element: Element): void => {
  const tag = element.localName
  if (!tag.startsWith('helix-') || tag === OVERLAY) {
    return
  }
  const root = element.getRootNode()
  const host = root instanceof ShadowRoot ? root.host.localName : ''
  if (host.startsWith('helix-')) {
    bump(counted.composed, tag)
    return
  }
  bump(counted.tags, tag)
  for (const axis of AXES) {
    const value = element.getAttribute(axis)
    if (value !== null && value !== '') {
      bump(
        under(
          under(counted.axes, tag, () => ({})),
          axis,
          () => ({}),
        ),
        value,
      )
    }
  }
  for (const child of element.children) {
    const name = child.getAttribute('slot')
    if (name) {
      bump(
        under(counted.slots, tag, () => ({})),
        name,
      )
    }
  }
}

/** The elements in the page now, counted once each. */
export const walk = (from: Document, page: Page = pageOf(from)): Counted => {
  const counted = empty()
  for (const element of page.elements) {
    tally(counted, element)
  }
  return counted
}

/**
 * The counts for the tags a manifest lists, and the rest apart as `unlisted`.
 *
 * Counted by prefix, since `watch()` runs before any manifest is at hand, and
 * sorted here, where one is.
 */
export const listed = (
  counted: Counted,
  tags: Map<string, Published>,
): Counted & Pick<Usage, 'unlisted'> => {
  const keep = <T>(counts: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(counts).filter(([tag]) => tags.has(tag)))
  const unlisted: Record<string, number> = {}
  for (const counts of [counted.tags, counted.composed]) {
    for (const [tag, count] of Object.entries(counts)) {
      if (!tags.has(tag)) {
        bump(unlisted, tag, count)
      }
    }
  }
  return {
    axes: keep(counted.axes),
    composed: keep(counted.composed),
    slots: keep(counted.slots),
    tags: keep(counted.tags),
    unlisted,
  }
}

/** A running count of what renders, from `watch()`. */
export interface Watcher {
  /** The counts so far. A copy: counting goes on after it is read. */
  counts(): Counted
  /** What the components cost so far, where the watcher was asked to measure. */
  performance(): PerformanceReport | undefined
  /**
   * The runtime events reported on this page from its first load, one entry
   * per distinct event: the ones core kept from before the watcher started,
   * and the ones heard since.
   */
  runtime(): RuntimeEntry[]
  /** Stops counting, and gives the slots back to whatever held them before. */
  stop(): void
}

/**
 * Starts counting the Helix elements that render, from now on, and the ones
 * already in the page.
 *
 * Hand the watcher to `diagnose`, and its report counts every element seen
 * since, including the ones that have gone. Without one, `diagnose` counts the
 * elements in the page at the moment it runs, and says so.
 *
 * **Start it early**, before the components load where you can, so the
 * elements an early route renders and removes are counted. The ones in the
 * page when it starts are counted by walking the page once.
 *
 * Two watchers on one page both count: a second one keeps the first's
 * listener and calls it too.
 */
export const watch = (
  from: Document = document,
  {
    onRender,
    onRuntime,
    performance,
    quiet,
  }: {
    /**
     * Called as each Helix element renders for the first time, after it is
     * counted: how `initDiagnostics()` hears that the page changed when an
     * element upgrades without adding anything to the DOM.
     */
    onRender?: ((element: Element) => void) | undefined
    /** Called with each runtime event core reports, after it is counted. */
    onRuntime?: ((event: Heard) => void) | undefined
    /**
     * Whether to measure what the components cost, from now on: each
     * element's first update, and the layout shift and long tasks the browser
     * reports.
     */
    performance?: boolean | undefined
    /**
     * Whether core should leave each runtime event for diagnostics to print,
     * asked as each arrives: `core.warnings: false`.
     */
    quiet?: (() => boolean) | undefined
  } = {},
): Watcher => {
  const counted = empty()
  const seen = new WeakSet<Element>()
  const see = (element: Element): void => {
    if (!seen.has(element)) {
      seen.add(element)
      tally(counted, element)
    }
  }
  const store = globalThis as Record<symbol, unknown>
  const before = store[SLOT]
  let live = true
  const listener = (element: Element): void => {
    if (live) {
      see(element)
      onRender?.(element)
    }
    if (typeof before === 'function') {
      before(element)
    }
  }
  store[SLOT] = listener
  for (const element of pageOf(from).elements) {
    see(element)
  }

  /* The runtime events: core printed the ones it kept, since nothing listened. */
  const heard = tallyRuntime()
  for (const event of logged()) {
    heard.add(event, true)
  }
  const beforeRuntime = store[RUNTIME_SLOT]
  const hear = (event: Heard): boolean => {
    let silent = false
    if (live) {
      silent = quiet?.() === true
      heard.add(event, !silent)
      onRuntime?.(event)
    }
    /* A watcher started before this one hears it too, and may print it itself. */
    if (typeof beforeRuntime === 'function' && beforeRuntime(event) === true) {
      silent = true
    }
    return silent
  }
  store[RUNTIME_SLOT] = hear
  const measured: Measurer | undefined = performance ? measure() : undefined
  return {
    counts: () => structuredClone(counted),
    performance: () => measured?.results(),
    runtime: () => heard.entries(),
    stop: () => {
      live = false
      measured?.stop()
      if (store[SLOT] === listener) {
        store[SLOT] = before
      }
      if (store[RUNTIME_SLOT] === hear) {
        store[RUNTIME_SLOT] = beforeRuntime
      }
    },
  }
}

/**
 * The parts and hooks a page's stylesheets reach for, where the manifest or
 * the element's own styles say they exist. A dead one is a finding and is not
 * counted as use.
 */
export const styled = (
  rules: Located[],
  tags: Map<string, Published>,
  answered: Answered,
  values = true,
): Pick<Usage, 'hookValues' | 'hooks' | 'parts'> => {
  const counted: Pick<Usage, 'hookValues' | 'hooks' | 'parts'> = {
    hooks: {},
    hookValues: {},
    parts: {},
  }
  /* The tags whose manifests list each hook, for a rule naming none. */
  const listing = new Map<string, string[]>()
  for (const [tag, element] of tags) {
    for (const property of element.hooks.keys()) {
      listing.set(property, [...(listing.get(property) ?? []), tag])
    }
  }
  /** One hook set for one tag, and its value where the project allows it. */
  const count = (located: Located, tag: string, property: string): void => {
    bump(
      under(counted.hooks, tag, () => ({})),
      property,
    )
    if (!values) {
      return
    }
    /* The declared value as written, cut at 200 characters so a gradient or
       a data URL cannot swell a report. */
    const value = (located.rule.style?.getPropertyValue?.(property) ?? '').trim().slice(0, 200)
    if (value !== '') {
      bump(
        under(
          under(counted.hookValues, tag, () => ({})),
          property,
          () => ({}),
        ),
        value,
      )
    }
  }
  for (const located of rules) {
    const selector = located.rule.selectorText
    if (!selector) {
      continue
    }
    for (const { names, tag } of selector.includes('helix-') ? parts(selector) : []) {
      for (const name of names) {
        if (tags.get(tag)?.parts.has(name)) {
          bump(
            under(counted.parts, tag, () => ({})),
            name,
          )
        }
      }
    }
    const named = targets(selector).filter((tag) => tags.has(tag))
    for (const property of Array.from(located.rule.style ?? [])) {
      if (!property.startsWith('--')) {
        continue
      }
      if (named.length > 0) {
        for (const tag of named) {
          if (tags.get(tag)?.hooks.has(property) || answered.get(tag)?.has(property)) {
            count(located, tag, property)
          }
        }
        continue
      }
      /* **A hook set on a class, `:root`, or any selector naming no Helix
         tag** counts for every tag whose manifest lists it: it is set for
         whichever of them sit under the selector, and most hooks are set this
         way. */
      for (const tag of listing.get(property) ?? []) {
        count(located, tag, property)
      }
    }
  }
  return counted
}
