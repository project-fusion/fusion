import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'
import { exitOf, tiltFor } from './aura-axis.js'

/* Registered before the module is evaluated, and the import is dynamic for
   exactly that reason: `@customElement` runs at evaluation, and a static import
   would run it before `registerDom` has installed a `customElements` to
   register against. The element then never upgrades and every assertion about
   its shadow root reads `undefined`, which `not.toBeNull()` happily passes. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('aura', () => {
  test('renders a canvas and hides it from assistive technology', async () => {
    /* Decorative by definition: it draws light behind content and has nothing
       to announce. The host stays visible to the tree so a consumer can label
       the region it sits behind. */
    const host = (await mount('<helix-aura></helix-aura>')) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    const canvas = host.shadowRoot?.querySelector('canvas')
    expect(canvas).toBeDefined()
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(host.getAttribute('aria-hidden')).toBeNull()
  })

  test('survives a machine with no WebGL, because the fallback is underneath', async () => {
    /* happy-dom returns null from `getContext`, which is exactly the case a
       reader on a refused context gets. The element must render and stay
       usable: the canvas simply never paints, and the host's own token
       gradient is what shows. Nothing detects this, which is the point. */
    const host = (await mount('<helix-aura variant="rays"></helix-aura>')) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('canvas')).toBeDefined()
    expect(host.isConnected).toBe(true)
  })

  test('the fallback never paints the brand color at full strength', async () => {
    /* **A regression guard on a bug nobody could catch by looking once.** The
       canvas is transparent until its first paint, so whatever the host paints
       is what a reader sees on every load. The hot stop of that gradient was
       `--helix-color-primary` undiluted, which is the top of the shader's range
       and far from its average: measured on a page at half opacity it sat at
       68.3 luma against a settled 20.8 in dark, and 174 against 231 in light.
       Every hard reload flashed, brighter in one scheme and darker in the other,
       and a screen recording is what finally named it.

       Asserted against the sheet rather than a rendered pixel because happy-dom
       has no WebGL and no compositor: there is nothing here that could paint the
       comparison. What is checkable is that the stop is mixed into the ground,
       which is the property that was wrong. */
    /* Imported here rather than at the top of the file, for the reason the
       note above `beforeAll` gives: this module calls `createSheet` at
       evaluation, and a static import would run that before `registerDom` has
       installed a DOM to build a stylesheet against. Doing it statically took
       out five unrelated tests in this file. */
    const { styles } = await import('./aura-root.css.js')
    const sheet = (styles as { cssText?: string }).cssText ?? String(styles)
    expect(sheet).toContain('color-mix(in oklab, var(--helix-color-primary) 38%')
    expect(sheet).not.toMatch(/var\(--helix-color-primary\)\s+0%/)
  })

  test('the variant reflects and the numbers do not', async () => {
    // Reflection exists so a selector can reach a value. The fallback gradient
    // selects on `variant`; nothing selects on `speed`.
    const host = (await mount('<helix-aura></helix-aura>')) as HTMLElement & {
      variant: string
      speed: number
      updateComplete: Promise<boolean>
    }
    host.variant = 'aurora'
    host.speed = 2
    await host.updateComplete
    expect(host.getAttribute('variant')).toBe('aurora')
    expect(host.getAttribute('speed')).toBeNull()
  })
  test('takes no pointer events at rest, and takes them when asked', async () => {
    /* The two halves are one decision. A background that is hit-testable
       swallows clicks meant for what is laid over it; one that is not never
       receives the `pointermove` the pointer feature is built on. Measured on a
       real gesture before this: the host reported `pointer-events: none` and
       not one mark reached the wake, while synthetic events kept passing
       because dispatching skips hit-testing entirely. */
    const host = (await mount('<helix-aura></helix-aura>')) as HTMLElement & {
      interactive: boolean
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    expect(host.hasAttribute('interactive')).toBe(false)

    host.interactive = true
    await host.updateComplete
    expect(host.hasAttribute('interactive')).toBe(true)
  })

  /* The reconnection, which was one-way and silent.
   *
   * `disconnectedCallback` gives the context back through `WEBGL_lose_context`,
   * because a browser caps live contexts at about sixteen. What it cannot do is
   * assume the canvas recovers: `getContext` hands back the very same dead
   * object, so `link` failed, `start` returned before installing one observer,
   * and the element sat connected and permanently blind holding its last frame.
   * On the landing page that frame was the 2x2 the first `measure` took before
   * layout, stretched over two screens as a gray smear.
   *
   * Both halves are asserted because they are two mechanisms. A move is a
   * removal and an insertion with nothing between them, so the release is
   * canceled and no GL work happens at all; a real departure lets it fire, and
   * what comes back has to take a fresh canvas.
   *
   * This is the lane that runs twice, and only one of the two can see it:
   * happy-dom answers `null` to `getContext`, which is a reader with no WebGL
   * rather than a reader whose context was spent. That case is the test above
   * and the fallback gradient is its contract, so this returns rather than
   * asserting something the double cannot know. `specs:browser` is where it
   * bites. */
  test('comes back from a reorder, and from a real removal', async () => {
    const host = (await mount('<helix-aura></helix-aura>')) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await host.updateComplete

    /* Read through the canvas the element is currently showing, never a held
       reference: recovering from a spent context replaces that node. */
    const painting = (): boolean | null => {
      const canvas = host.shadowRoot?.querySelector('canvas')
      const gl = canvas?.getContext('webgl2')
      return gl ? !gl.isContextLost() : null
    }
    if (painting() === null) {
      return
    }

    /* Put back with `append` rather than before the sibling it had. Where it
       lands is not what is under test, and the two lanes disagree about what
       else is in the body, so a held `nextSibling` is a child of nothing by the
       time the browser lane reaches it. */
    const parent = host.parentElement
    expect(parent).not.toBeNull()

    // A framework reordering its children. The release never fires.
    host.remove()
    parent?.append(host)
    expect(painting()).toBe(true)

    // A real departure, given long enough for the release to run.
    host.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    parent?.append(host)
    expect(painting()).toBe(true)
  })
})

/* The axis, asserted where it lands rather than at what angle.
 *
 * `terminus` exists so nobody has to reason about an angle, so a fixture on the
 * angle would guard the wrong number: it was the angle that was right-looking
 * and wrong twice while the docstring promised a position. These go through
 * `exitOf`, which models what `aura-shader.ts` does with the tilt, so what is
 * being checked is that the property keeps its promise about the picture.
 *
 * In this file rather than a lane of its own because this is the lane that runs
 * twice. `bun test` runs it under happy-dom and `specs:browser` runs the same
 * file in a real browser, and a `.dom.spec.ts` may only use matchers both of
 * those have. Pure arithmetic needs neither environment and
 * loses nothing by being in the one that is already wired. */
describe('aura axis', () => {
  /* The three the docstring names, at four boxes including the two the hero has
     actually had. A property whose contract is "at every size" is one whose
     fixture has to say which sizes it tried. */
  test('puts the named positions where the words say, in every box', () => {
    for (const aspect of [0.8, 1, 1.78, 2.5]) {
      expect(exitOf(tiltFor(0, aspect), aspect)).toBeCloseTo(0, 6)
      expect(exitOf(tiltFor(0.5, aspect), aspect)).toBeCloseTo(0.5, 6)
      expect(exitOf(tiltFor(1, aspect), aspect)).toBeCloseTo(1, 6)
    }
  })

  /* The loop that catches a one-sided edit. `exitOf` mirrors the shader and
     `tiltFor` inverts it, so changing either alone breaks this and changing the
     shader without touching either leaves `exitOf` lying, which is the one
     failure mode left and the reason `exitOf` is written as the shader's own
     steps rather than as the collapsed formula. */
  test('round trips every position at every aspect', () => {
    for (const aspect of [0.5, 0.8, 1, 1.6, 3]) {
      for (const terminus of [0, 0.15, 0.35, 0.5, 0.62, 0.85, 1]) {
        expect(exitOf(tiltFor(terminus, aspect), aspect)).toBeCloseTo(terminus, 6)
      }
    }
  })

  /* The bug itself, kept as a number. `bearing` was `atan(terminus * width /
     height)`, which on the landing page's 1440 by 1800 hero put `0.5` at 81.3%
     of the width. Asserting the old expression still lands there proves the
     fixture can see the fault it was written for, which a fixture that only
     agrees with the current code cannot. */
  test('sees the fault it was written for', () => {
    const aspect = 1440 / 1800
    const wasDrawn = (Math.atan(0.5 * (1440 / 1800)) * 180) / Math.PI
    expect(exitOf(wasDrawn, aspect)).toBeCloseTo(0.813, 3)
    expect(exitOf(tiltFor(0.5, aspect), aspect)).toBeCloseTo(0.5, 6)
  })
})
