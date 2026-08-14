/**
 * The spec API, reimplemented for a real browser.
 *
 * The specs are written against `bun:test` and happy-dom, and neither exists in
 * a page. Rather than write a second suite, the same spec files are bundled for
 * the browser with `bun:test` and `@fusion-io/testing/dom` pointed here, so what
 * runs in the sandbox is the file that runs in CI, not a copy of it.
 *
 * **This is not a weaker environment than happy-dom. It is a stronger one.**
 * happy-dom does not implement `attachInternals`, so the node harness shims it
 * with something inert, and it reports `:popover-open` as unmatched for an open
 * popover and returns nothing from `assignedNodes({ flatten: true })` where a
 * browser returns the fallback. Every one of those has already produced a spec
 * that passed while asserting the opposite of what ships. Here they are the
 * platform's own.
 *
 * Only what the specs actually use is implemented: five globals, five matchers
 * and a negation. A matcher that is missing throws by name rather than passing
 * quietly, so a spec reaching for one is a visible failure and not a green tick.
 */

/**
 * How long a single test may take before it is called a failure.
 *
 * A runner with no timeout does not report a hanging test, it becomes one: the
 * run never finishes and there is nothing on screen saying which test is the
 * reason. `bun test` has its own; this is the same idea at the size a component
 * spec should need.
 */
const TIMEOUT = 2000

/** How one test came out. */
export interface SpecResult {
  /** How long it took, in milliseconds. */
  duration: number
  /** Why it failed, when it did. */
  error?: string
  /** The describe blocks it sits in, outermost first. */
  suite: string[]
  /** What the test is called. */
  name: string
  /** Whether it passed. */
  passed: boolean
}

interface Case {
  body: () => unknown
  name: string
  suite: string[]
}

const cases: Case[] = []
const hooks: { body: () => unknown; depth: number }[] = []
let suite: string[] = []

/** How much of the above a previous bundle has already claimed. */
let claimedCases = 0
let claimedHooks = 0

/** Groups tests. Nests, and the names join for reporting. */
export const describe = (name: string, body: () => void): void => {
  suite = [...suite, name]
  body()
  suite = suite.slice(0, -1)
}

/** Registers one test. */
export const test = (name: string, body: () => unknown): void => {
  cases.push({ body, name, suite: [...suite] })
}

/** `it` and `test` are the same thing, and the specs use both. */
export const it = test

/** Runs once before the tests in the block it was declared in. */
export const beforeAll = (body: () => unknown): void => {
  hooks.push({ body, depth: suite.length })
}

const show = (value: unknown): string => {
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (value instanceof Element) {
    return `<${value.tagName.toLowerCase()}>`
  }
  if (value === null || value === undefined || typeof value !== 'object') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

/** Structural equality, enough for the shapes the specs compare. */
const same = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => same(item, b[index]))
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const left = a as Record<string, unknown>
    const right = b as Record<string, unknown>
    const keys = Object.keys(left)
    return (
      keys.length === Object.keys(right).length && keys.every((key) => same(left[key], right[key]))
    )
  }
  return false
}

interface Matchers {
  toBe: (expected: unknown) => void
  toBeNull: () => void
  toContain: (expected: unknown) => void
  toEqual: (expected: unknown) => void
  toHaveLength: (expected: number) => void
}

const build = (actual: unknown, negated: boolean): Matchers => {
  const check = (ok: boolean, description: string): void => {
    if (ok === negated) {
      throw new Error(
        `expected ${show(actual)}${negated ? ' not' : ''} ${description}`.replace(/\s+/g, ' '),
      )
    }
  }
  return {
    toBe: (expected) => check(Object.is(actual, expected), `to be ${show(expected)}`),
    toBeNull: () => check(actual === null, 'to be null'),
    toContain: (expected) => {
      const held =
        typeof actual === 'string'
          ? actual.includes(String(expected))
          : Array.isArray(actual) && actual.some((item) => same(item, expected))
      check(held, `to contain ${show(expected)}`)
    },
    toEqual: (expected) => check(same(actual, expected), `to equal ${show(expected)}`),
    toHaveLength: (expected) => {
      const length = (actual as { length?: number } | null)?.length
      check(length === expected, `to have length ${expected}, and it has ${show(length)}`)
    },
  }
}

/** The assertion entry point, with `.not` for the negated form. */
export const expect = (actual: unknown): Matchers & { not: Matchers } =>
  Object.assign(build(actual, false), { not: build(actual, true) })

/**
 * Hands back a runner for everything registered since the last call.
 *
 * The bundles share this module, because splitting them apart would emit Lit
 * and the harness into every one of thirty-six files. Sharing it means they
 * share this list too: with a plain `run`, opening badge after accordion ran
 * accordion's nine tests again and reported twenty-eight under badge's name,
 * measured.
 *
 * Each bundle calls this once, after its spec imports have evaluated, which
 * `import` hoisting guarantees. It takes what it registered and nothing else,
 * so a family runs its own specs however many families were opened first.
 */
export const claim = (): (() => Promise<SpecResult[]>) => {
  const mine = cases.slice(claimedCases)
  const myHooks = hooks.slice(claimedHooks)
  claimedCases = cases.length
  claimedHooks = hooks.length
  return () => runThese(myHooks, mine)
}

/**
 * Runs one bundle's hooks and tests, in order.
 *
 * Sequential on purpose. `mount` replaces the document body, so two tests in
 * flight at once would be mounting over each other.
 */
const runThese = async (
  ownHooks: { body: () => unknown; depth: number }[],
  ownCases: Case[],
): Promise<SpecResult[]> => {
  for (const hook of ownHooks) {
    await Promise.race([
      hook.body(),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`a beforeAll hook timed out after ${TIMEOUT}ms`)),
          TIMEOUT,
        )
      }),
    ])
  }
  const results: SpecResult[] = []
  for (const entry of ownCases) {
    const started = performance.now()
    try {
      await Promise.race([
        entry.body(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`timed out after ${TIMEOUT}ms`)), TIMEOUT)
        }),
      ])
      results.push({
        duration: performance.now() - started,
        name: entry.name,
        passed: true,
        suite: entry.suite,
      })
    } catch (error) {
      results.push({
        duration: performance.now() - started,
        error: error instanceof Error ? error.message : String(error),
        name: entry.name,
        passed: false,
        suite: entry.suite,
      })
    }
  }
  return results
}

/* The DOM helpers. Same names and same behaviour as the node harness, minus the
   parts that only existed to paper over happy-dom. */

/** Nothing to install: this is a browser, and it brought its own DOM. */
export const registerDom = (): void => undefined

/** An element with Lit's update barrier. */
export type Updatable = HTMLElement & { updateComplete?: Promise<unknown> }

/** Renders markup and waits for the first element in it to finish updating. */
export const mount = async (markup: string): Promise<HTMLElement> => {
  document.body.innerHTML = markup
  const root = document.body.firstElementChild as Updatable
  await root.updateComplete
  return root
}

/** The role a screen reader sees on the host. */
export const role = (host: HTMLElement): string | null =>
  host.getAttribute('role') ??
  (host as unknown as { internals?: ElementInternals }).internals?.role ??
  null

/** Finds a shadow part by name. */
export const part = (host: HTMLElement, name: string): Element | null =>
  host.shadowRoot?.querySelector(`[part="${name}"]`) ?? null

/** Elements the consumer assigned to a slot, by slot name. */
export const slotted = (host: HTMLElement, name?: string): Element[] => {
  const selector = name ? `slot[name="${name}"]` : 'slot:not([name])'
  const slot = host.shadowRoot?.querySelector(selector) as HTMLSlotElement | null
  return (slot?.assignedElements?.() ?? []) as Element[]
}
