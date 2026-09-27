/**
 * The spec API, reimplemented for a real browser.
 *
 * The specs are written against `bun:test` and happy-dom, and neither exists in
 * a page. Rather than write a second suite, the same spec files are bundled for
 * the browser with `bun:test` and `@fusion.dev/helix-testing/dom` pointed here, so what
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
 * Only what the specs actually use is implemented: a few globals, the matchers
 * those specs reach for, and a negation. A matcher that is missing throws by
 * name rather than passing quietly, so a spec reaching for one is a visible
 * failure and not a green tick.
 *
 * `fusion spec`'s `matchers` reads the specs and this file against each other, so the
 * list moves whenever a spec reaches for something new and a count written
 * beside it is stale by the next one.
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
const teardowns: { body: () => unknown; depth: number }[] = []
let suite: string[] = []

/** How much of the above a previous bundle has already claimed. */
let claimedCases = 0
let claimedHooks = 0
let claimedTeardowns = 0

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
 * in the run. Making a skip visible rather than merely absent needs a third
 * outcome on the runner.
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

/**
 * Runs after every test in the block it was declared in, passed or failed.
 *
 * **Every name `bun:test` exports has to exist here too**, which is what
 * `fusion spec`'s `matchers` polices: `build-specs.mjs` points `bun:test` at this file
 * for the browser, so a spec importing something this module lacks compiles
 * under happy-dom and fails to bundle here. The error names the missing export
 * rather than the spec's own line, so it reads as a harness fault and is one.
 *
 * After the test rather than before the next one, and in a `finally`, because
 * what it is for is putting a global back: a spec that shadows
 * `document.activeElement` and fails would otherwise leave the shadow standing
 * for every file that runs after it in the same page.
 */
export const afterEach = (body: () => unknown): void => {
  teardowns.push({ body, depth: suite.length })
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
 * compared equal and every assertion about one asserted nothing.
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
  toBeFalsy: () => void
  toBeTruthy: () => void
  toBeUndefined: () => void
  toBeGreaterThan: (expected: number) => void
  toBeGreaterThanOrEqual: (expected: number) => void
  toBeInstanceOf: (expected: abstract new (...args: never[]) => unknown) => void
  toBeLessThan: (expected: number) => void
  toBeLessThanOrEqual: (expected: number) => void
  toBeNull: () => void
  toContain: (expected: unknown) => void
  toEqual: (expected: unknown) => void
  toHaveLength: (expected: number) => void
  toHaveProperty: (path: string | string[], value?: unknown) => void
  toMatch: (expected: RegExp | string) => void
  toMatchObject: (expected: Record<string, unknown>) => void
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
    toBeFalsy: () => check(!actual, 'to be falsy'),
    toBeGreaterThan: (expected) => check(number > expected, `to be greater than ${expected}`),
    toBeGreaterThanOrEqual: (expected) => check(number >= expected, `to be at least ${expected}`),
    /* The class is named in the message. A matcher missing from this object is a
       `TypeError` on an undefined method, reported as a failed assertion about a
       comparison that never happened, which says nothing at all. */
    toBeInstanceOf: (expected) =>
      check(actual instanceof expected, `to be an instance of ${expected.name}`),
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
    /* Presence, not value, which is what makes it the matcher for "this key is
       absent". `toEqual({ label, value })` cannot say that: an extra key fails
       for the wrong reason, and `undefined` in the expectation passes against a
       key that is present and undefined. A reader asking whether a point carries
       no `tone` at all is asking about the shape.

       Dot paths, because `bun:test` takes them, and a spec that means one thing
       here and another there is the one thing this harness must never be. */
    toHaveProperty: (path, ...rest) => {
      const keys = Array.isArray(path) ? path : String(path).split('.')
      let cursor: unknown = actual
      let held = true
      for (const key of keys) {
        if (typeof cursor !== 'object' || cursor === null || !(key in cursor)) {
          held = false
          break
        }
        cursor = (cursor as Record<string, unknown>)[key]
      }
      if (rest.length === 0) {
        check(held, `to have property ${show(keys.join('.'))}`)
        return
      }
      check(
        held && same(cursor, rest[0]),
        `to have property ${show(keys.join('.'))} equal to ${show(rest[0])}`,
      )
    },
    toMatch: (expected) => {
      const pattern = typeof expected === 'string' ? new RegExp(expected) : expected
      check(typeof actual === 'string' && pattern.test(actual), `to match ${show(expected)}`)
    },
    /* The named keys and no others, which is the difference from `toEqual` and
       the whole reason a spec reaches for it: an element's geometry is written
       as four properties and a test about two of them should not have to
       restate the other two to say so.
     *
       Recursive through `same` for a nested object, and deliberately *not*
       recursive into a partial one: `bun:test` matches a nested object
       partially too, and matching it wholly here would make a spec mean
       something different in the two runners, which is the one thing this
       harness must never do. So a nested expectation descends by the same rule
       rather than falling through to whole-value equality. */
    toMatchObject: (expected) => {
      const partial = (value: unknown, shape: Record<string, unknown>): boolean => {
        if (typeof value !== 'object' || value === null) {
          return false
        }
        const held = value as Record<string, unknown>
        return Object.entries(shape).every(([key, wanted]) =>
          typeof wanted === 'object' && wanted !== null && !Array.isArray(wanted)
            ? partial(held[key], wanted as Record<string, unknown>)
            : same(held[key], wanted),
        )
      }
      check(partial(actual, expected), `to match ${show(expected)}`)
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
  const myTeardowns = teardowns.slice(claimedTeardowns)
  claimedCases = cases.length
  claimedHooks = hooks.length
  claimedTeardowns = teardowns.length
  return () => runThese(myHooks, myTeardowns, mine)
}

/**
 * Runs one bundle's hooks and tests, in order.
 *
 * Sequential on purpose. `mount` replaces the document body, so two tests in
 * flight at once would be mounting over each other.
 */
const runThese = async (
  ownHooks: { body: () => unknown; depth: number }[],
  ownTeardowns: { body: () => unknown; depth: number }[],
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
    let failure: string | undefined
    try {
      await Promise.race([
        entry.body(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`timed out after ${TIMEOUT}ms`)), TIMEOUT)
        }),
      ])
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
    }
    /* Whatever the test did, because what a teardown is for is putting a global
       back and the failing test is the one most likely to have left it. A
       teardown that throws fails the test it followed rather than being
       swallowed: a restore that did not happen is the fault that shows up three
       files later as somebody else's failure. */
    for (const teardown of ownTeardowns) {
      try {
        await teardown.body()
      } catch (error) {
        failure ??= `an afterEach hook threw: ${
          error instanceof Error ? error.message : String(error)
        }`
      }
    }
    results.push({
      duration: performance.now() - started,
      ...(failure === undefined ? {} : { error: failure }),
      name: entry.name,
      passed: failure === undefined,
      suite: entry.suite,
    })
  }
  return results
}

/* The DOM helpers. Same names and same behavior as the node harness, minus the
   parts that only existed to paper over happy-dom. */

/* Nothing to install: this is a browser, and it brought its own DOM. */
/** What a control may report: a field's value, a set of them, or nothing. */
type FormValue = File | FormData | string | null

/**
 * What every control has reported, shared by every bundle on the page.
 *
 * **On `globalThis` because the guard below is on `HTMLElement.prototype`, and
 * the two have to have the same reach.** `build-specs.mjs` emits one bundle per
 * family, each carrying its own copy of this module, and the runner imports all
 * of them into one page. So the prototype is shared and a module-scoped map is
 * not: the first family to call `registerDom` set the flag and patched the
 * prototype to write into *its* map, every family after it returned early at
 * the flag, and each of those read a map nothing had ever written to.
 *
 * Measured: `radio` passes 24 alone and fails three in any pair, whichever
 * family goes first, `accordion` included. **Every form-value assertion outside
 * the first family had stopped meaning anything**, and the failure reads as
 * `expected undefined to be "two"`, which looks exactly like a control that
 * never reported to its form rather than like a harness that never recorded.
 * Under happy-dom, where each file gets the node shim, all of them passed.
 */
const shared = globalThis as typeof globalThis & {
  __helixReported?: WeakMap<HTMLElement, FormValue>
}
const reported: WeakMap<HTMLElement, FormValue> =
  shared.__helixReported ?? new WeakMap<HTMLElement, FormValue>()
shared.__helixReported = reported

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

/** What the last script an example inserts calls, once every one before it has run. */
const RAN = '__helixExampleRan'

/**
 * Renders an example the way the sandbox frame does, scripts and all, and waits
 * for them to have run.
 *
 * **`mount` cannot, because `innerHTML` parses a script and refuses to run it.**
 * An example whose behavior lives in its script mounts as markup that answers
 * nothing, which is how a filter example shipped adding two chips for one pick:
 * every spec passed, and nothing that ran ever ran that script. The frame makes
 * a script run by replacing it with a fresh element, and this does the same,
 * as a module when it names no type, for the frame's reason.
 *
 * **Then it waits, which the frame never has to.** A script inserted by script
 * is async unless told otherwise, and an async module runs whenever it is ready.
 * With `async` off they run in the order they went in, so one more appended
 * after them resolves only once they all have.
 *
 * Takes the imported file as it arrives. `with { type: 'text' }` hands over a
 * string, and `bun-types` declares every `.html` import an `HTMLBundle`,
 * whatever the attribute says: the type is wrong and the value is right.
 *
 * **And its stylesheet, where it has one**, because the sandbox hands the
 * frame the example's `.css` beside its markup. An example whose behavior
 * depends on layout, an outline tracking which section a scroll container is
 * showing, behaves differently without it, and silently.
 *
 * The example's own `<link rel="stylesheet">` is removed first, as the preview
 * frame removes it. The stylesheet arrives as `styles`, and the link's relative
 * `href` would otherwise request a file that is not there, such as
 * `/helix/sandbox/styles.css` from the sandbox's spec results.
 */
export const example = async (file: unknown, styles: unknown = ''): Promise<HTMLElement> => {
  document.body.innerHTML = String(file).replace(
    /<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>\s*/gi,
    '',
  )
  if (String(styles) !== '') {
    const sheet = document.createElement('style')
    sheet.textContent = String(styles)
    document.body.prepend(sheet)
  }
  for (const original of [...document.body.querySelectorAll('script')]) {
    const script = document.createElement('script')
    for (const { name, value } of original.attributes) {
      script.setAttribute(name, value)
    }
    if (!script.type) {
      script.type = 'module'
    }
    script.async = false
    script.text = original.text
    original.replaceWith(script)
  }
  await new Promise<void>((done) => {
    const last = document.createElement('script')
    ;(window as unknown as Record<string, () => void>)[RAN] = done
    last.type = 'module'
    last.async = false
    last.text = `window.${RAN}()`
    document.body.append(last)
  })
  await Promise.all(
    [...document.body.querySelectorAll('*')].map((one) => (one as Updatable).updateComplete),
  )
  return [...document.body.children].find((one) => one.localName !== 'style') as HTMLElement
}

/**
 * Waits until nothing in the document has an update pending, and a frame has
 * been drawn: what a reader's press sets moving, a spec reads after this.
 */
export const idle = async (): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    await Promise.all(
      [...document.querySelectorAll('*')].map((one) => (one as Updatable).updateComplete),
    )
  }
}

/**
 * How many animation frames the page books while `count` frames pass.
 *
 * For a component that draws in a loop, which books its next frame from each
 * one, so this is how a spec asks whether it is running and whether it
 * stopped. Counted at the global a component calls, and the wait itself is
 * booked on the original so it never counts itself.
 */
export const framesBooked = async (count: number): Promise<number> => {
  const original = window.requestAnimationFrame
  let calls = 0
  window.requestAnimationFrame = (callback) => {
    calls += 1
    return original.call(window, callback)
  }
  try {
    await new Promise<void>((done) => {
      let left = count
      const step = (): void => {
        left -= 1
        if (left <= 0) {
          done()
        } else {
          original.call(window, step)
        }
      }
      original.call(window, step)
    })
  } finally {
    window.requestAnimationFrame = original
  }
  return calls
}

/**
 * What an `events` example has logged, as the event name each row opens with.
 *
 * Every one of them keeps the same log, a `#log` list whose rows are the event
 * that arrived with what it carried underneath, so a spec reads the names off
 * the rows and says which should be there. Empty until the first event: the
 * placeholder row is replaced rather than kept.
 */
export const logged = (): string[] => {
  const log = document.getElementById('log')
  if (!log || log.textContent?.includes('No events yet')) {
    return []
  }
  return [...log.children].map((row) => row.firstChild?.textContent?.trim() ?? '')
}

/** The role a screen reader sees on the host. */
export const role = (host: HTMLElement): string | null =>
  host.getAttribute('role') ??
  (host as unknown as { internals?: ElementInternals }).internals?.role ??
  null

/**
 * The accessible name a screen reader announces on the host.
 *
 * The same shape as `role` above and for the same reason: components name
 * themselves through `ElementInternals`, which writes no attribute, so
 * `getAttribute('aria-label')` reports nothing on an element that is correctly
 * named. An author's own `aria-label` still wins, which is the platform's
 * precedence and why the attribute is checked first.
 */
export const label = (host: HTMLElement): string | null =>
  host.getAttribute('aria-label') ??
  (host as unknown as { internals?: ElementInternals }).internals?.ariaLabel ??
  null

/**
 * Whether a component has recorded a custom state on itself.
 *
 * The same shape as `role` and `label` above and for the same reason: a state a
 * stylesheet selects on with `:state()` is kept in `ElementInternals` and writes
 * no attribute, so `hasAttribute('data-open')` reports nothing on an element
 * that is correctly open. It is the reading half of `HelixElement.toggleState`.
 *
 * Written twice, here and in `dom.ts`, because the two harnesses share no code.
 * A real `CustomStateSet` in this one, so a spec here may also ask whether the
 * rule keyed on it matched, which is the question happy-dom cannot answer.
 */
export const hasState = (host: Element, name: string): boolean =>
  (
    host as unknown as { internals?: { states?: { has(value: string): boolean } } }
  ).internals?.states?.has(name) ?? false

/** Finds a shadow part by name, among the names an element carries. */
export const part = (host: HTMLElement, name: string): Element | null =>
  host.shadowRoot?.querySelector(`[part~="${name}"]`) ?? null

/**
 * Waits until a component has stopped asking for updates, with a ceiling.
 *
 * The same helper `dom.ts` carries and for the same reason: a single
 * `await host.updateComplete` reads the state from before the last update
 * landed, and an unbounded loop hangs the whole run when a component never
 * settles. Written twice because the two harnesses share no code, which is the
 * arrangement `fusion spec`'s `matchers` already exists to police from the other side.
 */
export const settle = async (host: Updatable, turns = 40): Promise<void> => {
  let taken = 0
  while ((await host.updateComplete) === false) {
    taken += 1
    if (taken > turns) {
      throw new Error(
        `<${host.localName}> asked for another update ${taken} times without settling. ` +
          'Something it renders is requesting an update from its own update, which is a loop ' +
          'rather than a slow component.',
      )
    }
  }
}

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
 * one and not the other does not fail a spec, it fails the bundle. Waits on the
 * animations rather than on a duration,
 * a timeout being a number kept beside a token and either flaky or slow
 * depending on which way it is wrong.
 */
export const settled = async (element: Element | null): Promise<void> => {
  const running = (element as HTMLElement | null)?.getAnimations?.() ?? []
  await Promise.allSettled(running.map((animation) => animation.finished))
}

/**
 * Waits until a component's transitions are switched on.
 *
 * **`HelixElement` suppresses every transition until it has settled**, with
 * `:host(:not(:state(settled))) *  { transition: none !important }`, and records
 * that state a frame after `firstUpdated` rather than in it. That is
 * deliberate and is what stops a component animating its own arrival. It also
 * means `await mount(...)` is not enough for any spec that asserts a transition:
 * `updateComplete` resolves in the same microtask checkpoint the suppression is
 * still active in, so the property jumps to its resting value and
 * `getAnimations()` is empty.
 *
 * Two checkbox specs failed exactly that way and were read as a token or a
 * cascade fault for days. Measured on the mark: the rule was in the adopted
 * sheet, `--helix-duration-fast` resolved to `120ms` on the element itself,
 * `prefers-reduced-motion` was false, and a plain div took the identical
 * declaration, while the mark computed `transition-property: none`. The only
 * rule that reached it was the settle guard.
 *
 * **Waits on the element's own `settled` promise**, rather than on a frame count,
 * so it is right whether the component settles in one frame or the runner is
 * busy. There is no attribute to watch instead: the flag is an
 * `ElementInternals.states` entry, deliberately outside the DOM, because on the
 * host it was an attribute React had not rendered and hydration said so.
 * `settled()` is the other half and is not this: that one waits for animations
 * to *finish*, where this one waits for them to become possible at all.
 *
 * **The promise alone, with no timer beside it, which is where this parts from
 * the node harness's copy.** That one races a 50ms timeout because happy-dom
 * never runs the frame the promise resolves from. A browser always does, and a
 * timer here is a bet on how long a frame takes: measured 15 Sep 2026 on four
 * workers, a page in the run went 400 to 1600ms without one while the aura
 * specs in another page drew their shader, the timer won, and both checkbox
 * mark specs read a transition that had not been switched on yet. A frame that
 * never comes is still bounded, by the harness's own two seconds, and named as
 * a timeout rather than as a missing transition.
 */
export const readyToMove = async (element: Element | null): Promise<void> => {
  await (element as (Element & { whenSettled?: Promise<void> }) | null)?.whenSettled
}

/**
 * The item at `index`, or a failure naming the list.
 *
 * **A spec indexes a fixture it built**, so `rows[1]` is known to be there in a
 * way `noUncheckedIndexedAccess` cannot see, and writing `rows[1] as Row` at
 * every call site trades a real check for a cast. This keeps the check and
 * makes it say something: an absent row fails with the index and the length
 * rather than with `Cannot read properties of undefined`.
 *
 * Not a matcher, because the failure is in the fixture rather than in what is
 * being asserted: a spec that cannot find its second row has not got as far as
 * having an opinion.
 */
export const at = <T>(list: ArrayLike<T>, index: number): T => {
  const item = list[index]
  if (item === undefined) {
    throw new Error(`at(${index}): the list has ${list.length}`)
  }
  return item
}
