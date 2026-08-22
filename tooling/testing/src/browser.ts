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

const register = (name: string, body: () => unknown): void => {
  cases.push({ body, name, suite: [...suite] })
}

/**
 * What a spec file gets when it imports `test` from `bun:test`.
 *
 * **The methods matter as much as the call.** This stands in for Bun's `test`,
 * and a spec written against Bun that reaches for one this does not have throws
 * where it is written, which is module scope: the bundle never finishes
 * importing, so the runner reports one `family > load` failure and counts every
 * spec in that family as failed. Six uses of `skipIf` took `tree` and
 * `breadcrumbs` down entirely, and hid the three real failures underneath.
 *
 * A skip here is an absence. `SpecResult` has no skipped state, so a test that
 * is skipped is one that was never registered, which is exactly what the
 * `if (hasLayout())` guard already produced and reports the same way: it is not
 * in the run. Giving the runner a third outcome is a bigger change than making
 * the two harnesses agree on their API, and it is the change worth having next
 * if a skip should ever be visible rather than merely absent.
 *
 * `only` is deliberately absent. It does not mean "register this", it means
 * "and drop the rest", and a shim that accepted it while running everything
 * would answer a spec author's question with a lie. Better it throws.
 */
interface TestApi {
  (name: string, body: () => unknown): void
  /** Registers nothing. */
  skip(name: string, body: () => unknown): void
  /** Registers nothing when the condition holds, and normally when it does not. */
  skipIf(condition: boolean): (name: string, body: () => unknown) => void
}

/** Registers one test. */
export const test: TestApi = Object.assign(register, {
  skip: (): void => {},
  skipIf:
    (condition: boolean) =>
    (name: string, body: () => unknown): void => {
      if (condition) {
        return
      }
      register(name, body)
    },
})

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
  /* A thunk, which is the only thing `toThrow` is ever handed. Printed through
     the branches below it is its own source text, so a one-line failure became
     the whole arrow function and the message after it scrolled off. */
  if (typeof value === 'function') {
    return 'the call'
  }
  if (value === null || value === undefined || typeof value !== 'object') {
    return String(value)
  }
  /* Named for the same reason they are named in `same`: `JSON.stringify` renders
     either as `{}`, so a failure said "expected {} not to equal {}" and told the
     reader nothing about which sets those were. */
  if (value instanceof Set) {
    return `Set(${value.size}) {${[...value].map((item) => show(item)).join(', ')}}`
  }
  if (value instanceof Map) {
    return `Map(${value.size}) {${[...value]
      .map(([key, item]) => `${show(key)} => ${show(item)}`)
      .join(', ')}}`
  }
  try {
    return JSON.stringify(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

/**
 * Structural equality, enough for the shapes the specs compare.
 *
 * **Sets and Maps are named, because the object branch below silently passes
 * them.** `Object.keys(new Set([1, 2, 3]))` is `[]`, so two sets of anything
 * compared equal and every assertion about one asserted nothing. Caught by a
 * spec that both `toEqual`d one set and `not.toEqual`d a different one and had
 * the second fail, which is a pair of results no real comparison can produce.
 *
 * Membership by identity for a set, which is what `has` does: the specs here
 * hold strings. A set of objects would need pairing every member against every
 * other, and nothing compares one.
 */
const same = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => same(item, b[index]))
  }
  if (a instanceof Set && b instanceof Set) {
    return a.size === b.size && [...a].every((item) => b.has(item))
  }
  if (a instanceof Map && b instanceof Map) {
    return (
      a.size === b.size && [...a].every(([key, value]) => b.has(key) && same(value, b.get(key)))
    )
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
  toBeCloseTo: (expected: number, digits?: number) => void
  toBeDefined: () => void
  toBeTruthy: () => void
  toBeUndefined: () => void
  toBeGreaterThan: (expected: number) => void
  toBeGreaterThanOrEqual: (expected: number) => void
  toBeLessThan: (expected: number) => void
  toBeLessThanOrEqual: (expected: number) => void
  toBeNull: () => void
  toContain: (expected: unknown) => void
  toEqual: (expected: unknown) => void
  toHaveLength: (expected: number) => void
  toMatch: (expected: RegExp | string) => void
  toThrow: (expected?: RegExp | string) => void
}

const build = (actual: unknown, negated: boolean): Matchers => {
  const check = (ok: boolean, description: string): void => {
    if (ok === negated) {
      throw new Error(
        `expected ${show(actual)}${negated ? ' not' : ''} ${description}`.replace(/\s+/g, ' '),
      )
    }
  }
  /* The comparisons exist for geometry, which is the one thing only this
     harness can answer, and every one of them is a fact about a measurement.

     The rest of the list is whatever the specs use, and it is not guesswork:
     `bun:test` has every matcher, so a spec written against it type-checks and
     passes under happy-dom, then dies here on a name this object never had.
     Three of the six failures in the first browser run were exactly that, and
     said nothing at all about the components under test.
     `actual` is cast rather than checked: a spec comparing something that is not
     a number has a bug the assertion should not be papering over, and `NaN`
     fails every comparison, which is the right answer for a rectangle that was
     never laid out. */
  const number = actual as number
  return {
    toBe: (expected) => check(Object.is(actual, expected), `to be ${show(expected)}`),
    /* `bun:test`'s tolerance exactly, which is what makes a spec mean the same
       thing in both runners: within half a unit of the last digit asked for, so
       the default of 2 accepts a difference under 0.005. Geometry is why the
       charts reach for it, an arc length landing on 100.00000000000001 being
       the same arc as one landing on 100. */
    toBeCloseTo: (expected, digits = 2) =>
      check(
        Math.abs(number - expected) < 10 ** -digits / 2,
        `to be within ${10 ** -digits / 2} of ${expected}`,
      ),
    toBeDefined: () => check(actual !== undefined, 'to be defined'),
    toBeGreaterThan: (expected) => check(number > expected, `to be greater than ${expected}`),
    toBeGreaterThanOrEqual: (expected) => check(number >= expected, `to be at least ${expected}`),
    toBeLessThan: (expected) => check(number < expected, `to be less than ${expected}`),
    toBeLessThanOrEqual: (expected) => check(number <= expected, `to be at most ${expected}`),
    toBeNull: () => check(actual === null, 'to be null'),
    toBeTruthy: () => check(Boolean(actual), 'to be truthy'),
    toBeUndefined: () => check(actual === undefined, 'to be undefined'),
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
    toMatch: (expected) => {
      const pattern = typeof expected === 'string' ? new RegExp(expected) : expected
      check(typeof actual === 'string' && pattern.test(actual), `to match ${show(expected)}`)
    },
    /* The thunk is called here rather than by the spec, which is the whole
       point of it: a spec that called it would throw before reaching the
       assertion. A non-function is a bug in the spec and says so, rather than
       quietly reporting that the value did not throw, which it never could. */
    toThrow: (expected) => {
      if (typeof actual !== 'function') {
        throw new Error(`toThrow needs a function to call, and was given ${show(actual)}`)
      }
      let thrown: unknown
      let threw = false
      try {
        ;(actual as () => unknown)()
      } catch (error) {
        thrown = error
        threw = true
      }
      if (expected === undefined) {
        check(threw, 'to throw')
        return
      }
      const message = thrown instanceof Error ? thrown.message : String(thrown)
      const matched =
        threw &&
        (typeof expected === 'string' ? message.includes(expected) : expected.test(message))
      check(
        matched,
        `to throw ${show(expected)}, and it threw ${threw ? show(message) : 'nothing'}`,
      )
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

/* The DOM helpers. Same names and same behavior as the node harness, minus the
   parts that only existed to paper over happy-dom. */

/* Nothing to install: this is a browser, and it brought its own DOM. */
/** What a control may report: a field's value, a set of them, or nothing. */
type FormValue = File | FormData | string | null

const reported = new WeakMap<HTMLElement, FormValue>()

/**
 * Nothing to register, but `setFormValue` is watched on the way past.
 *
 * The node harness shims `attachInternals` because happy-dom has none. Here it
 * is the platform's, so the call is made for real and only recorded: the value
 * genuinely reaches the form, and the spec can still read what was sent. That
 * makes the browser the stronger of the two environments for this as well,
 * which is the point of running the same file in both.
 *
 * Patched here rather than at module load because the specs import their
 * components after calling this, so nothing has constructed yet and no element
 * gets the unpatched version.
 */
export const registerDom = (): void => {
  const proto = HTMLElement.prototype as HTMLElement & {
    attachInternals: () => ElementInternals
    __helixWatched?: boolean
  }
  if (proto.__helixWatched) {
    return
  }
  proto.__helixWatched = true
  const original = proto.attachInternals
  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const internals = original.call(this)
    const send = internals.setFormValue.bind(internals)
    internals.setFormValue = (value: FormValue, state?: FormValue): void => {
      reported.set(this, value)
      send(value as Parameters<typeof send>[0], state as Parameters<typeof send>[1])
    }
    return internals
  }
}

/**
 * The value a control last reported to its form.
 *
 * `undefined` means it never reported at all, which is a different failure from
 * reporting `null`: the first is a control not wired to a form, the second one
 * that is wired and has nothing to submit.
 */
export const formValue = (host: HTMLElement): FormValue | undefined => reported.get(host)

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

/**
 * Whether this environment lays anything out.
 *
 * happy-dom has no layout engine, so every rectangle in it is zero and every
 * computed length is whatever was written rather than what resolved. An
 * assertion about where something sits does not fail there, which is worse: it
 * passes against nothing, and a spec that cannot fail is a spec that is lying.
 *
 * Guard a geometry block with it and the same file says something true in both
 * places: measured for real in the browser, and honestly absent under `bun
 * test` rather than quietly green.
 *
 * See the note in the node harness for why this is a constant rather than a
 * measurement.
 */
export const hasLayout = (): boolean => true

/**
 * Waits for an element's own animations to finish, and returns at once where
 * there are none.
 *
 * For the exit half of anything that closes. A panel that transitions out with
 * `transition-behavior: allow-discrete` keeps its box until the transition
 * ends, because that is what `allow-discrete` is: the browser holds the
 * discrete `display` change back so the animated properties have somewhere to
 * run. Measured on `Megamenu`, immediately after the update that closed it:
 * `hidden` present, `open` false, `display: grid`, 900 by 85, three transitions
 * running. Six hundred milliseconds later, `display: none` and zero by zero.
 *
 * The same function in both harnesses, and it has to be: a name exported from
 * one and not the other does not fail a spec, it fails the bundle, which is how
 * this one announced itself. Waits on the animations rather than on a duration,
 * a timeout being a number kept beside a token and either flaky or slow
 * depending on which way it is wrong.
 */
export const settled = async (element: Element | null): Promise<void> => {
  const running = (element as HTMLElement | null)?.getAnimations?.() ?? []
  await Promise.allSettled(running.map((animation) => animation.finished))
}
