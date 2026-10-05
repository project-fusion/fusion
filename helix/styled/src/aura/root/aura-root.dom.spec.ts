import { beforeAll, describe, expect, test } from 'bun:test'
import {
  framesBooked,
  hasLayout,
  hasState,
  mount,
  readyToMove,
  registerDom,
} from '@fusion.dev/helix-testing/dom'
import { exitOf, tiltFor } from '../axis.js'
import { FRAGMENT } from '../shader.js'

/* Registered before the module is evaluated, and the import is dynamic for
   exactly that reason: `@customElement` runs at evaluation, and a static import
   would run it before `registerDom` has installed a `customElements` to
   register against. The element then never upgrades and every assertion about
   its shadow root reads `undefined`, which `not.toBeNull()` happily passes. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* **Every aura here is mounted with no height, so none of them draws.** What
   these assert is markup, attributes and whether a context is alive, and not
   one reads a pixel: at no height the canvas, the context and the program are
   all still made, and only the draw is skipped, `measure` declining an empty
   box. The picture is the visual check's.

   The draw is the expensive part, and not for this page alone. Measured 15 Sep
   2026 in headless Chromium: the first frame a fresh context draws of this
   shader held the GPU process for about 450ms, and that process is every page's,
   so on four workers the other pages in the run went that long without a frame,
   once per aura mounted here, and specs there waiting on frames timed out. */
const undrawn = (attributes = ''): string =>
  `<helix-aura ${attributes} style="block-size: 0"></helix-aura>`

/* An aura with a box, so `measure` succeeds and the opening frame is booked:
   what the lifecycle specs need. Its draws are stubbed by `countDraws`, so it
   still never pays the cost the note above measures. */
const drawn = (): string => '<helix-aura style="block-size: 16px"></helix-aura>'

/**
 * Counts the draws the element's current context is asked for, and makes none.
 *
 * **Stubbed rather than spied on**, because a draw that reaches the GPU is the
 * 450ms the note above `undrawn` measured, once per fresh context. What these
 * specs are about is the loop that asks for draws, and the frames, the
 * observers and the release that drive it are all real.
 *
 * `null` where there is no WebGL, which is happy-dom and a refused context.
 */
const countDraws = (host: HTMLElement): { count: number } | null => {
  const gl = host.shadowRoot?.querySelector('canvas')?.getContext('webgl2')
  if (!gl || gl.isContextLost()) {
    return null
  }
  const tally = { count: 0 }
  gl.drawArrays = () => {
    tally.count += 1
  }
  return tally
}

/** `UNMASKED_RENDERER_WEBGL`, which a stubbed extension has to carry itself. */
const UNMASKED_RENDERER = 0x9246

/** Two real names, as this machine reports them through ANGLE. */
const HARDWARE = 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)'
const SOFTWARE =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)'

/**
 * Makes `WEBGL_debug_renderer_info` report one name, and gives back the undo.
 *
 * **The renderer is a fact about the machine, and every lane here runs on one
 * that draws in software.** Headless Chromium is SwiftShader, which is exactly
 * what the element now declines, so without this every spec below about a
 * context, a program or a loop would assert the drawing path on a machine that
 * has stopped taking it. Stubbed at the extension rather than at `getContext`,
 * so the context each spec gets is the real one and only the name it answers to
 * is the spec's.
 *
 * `null` for a renderer that cannot be read, which is the extension missing
 * rather than a name that says nothing.
 *
 * A no-op where there is no WebGL at all, which is the happy-dom lane.
 */
const reportRenderer = (name: string | null): (() => void) => {
  const proto = globalThis.WebGL2RenderingContext?.prototype
  if (!proto) {
    return () => {}
  }
  /* Held as the one-argument shapes they are called with here. `getExtension`
     is declared as an overload per extension name, so the real signature does
     not accept the `string` this is forwarding. */
  type Asked = (this: WebGL2RenderingContext, asked: never) => unknown
  const extension = proto.getExtension as Asked
  const parameter = proto.getParameter as Asked
  proto.getExtension = function (this: WebGL2RenderingContext, asked: string) {
    if (asked === 'WEBGL_debug_renderer_info') {
      return name === null ? null : { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER }
    }
    return extension.call(this, asked as never)
  } as WebGL2RenderingContext['getExtension']
  proto.getParameter = function (this: WebGL2RenderingContext, asked: number) {
    if (asked === UNMASKED_RENDERER && name !== null) {
      return name
    }
    return parameter.call(this, asked as never)
  } as WebGL2RenderingContext['getParameter']
  return () => {
    proto.getExtension = extension as WebGL2RenderingContext['getExtension']
    proto.getParameter = parameter as WebGL2RenderingContext['getParameter']
  }
}

/**
 * Every `webgl2` context the element's own canvas was asked for, counted.
 *
 * The detection probe asks on a canvas of its own, detached and one pixel
 * square, so what separates the two is a parent: the element's canvas is a
 * child of its shadow root and the probe's is a child of nothing.
 */
const askedOnElement = <T>(run: () => Promise<T>): Promise<{ asked: number; value: T }> => {
  const original = HTMLCanvasElement.prototype.getContext
  let asked = 0
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    ...args: Parameters<HTMLCanvasElement['getContext']>
  ) {
    if (args[0] === 'webgl2' && this.parentNode) {
      asked += 1
    }
    return original.apply(this, args)
  } as HTMLCanvasElement['getContext']
  return run()
    .then((value) => ({ asked, value }))
    .finally(() => {
      HTMLCanvasElement.prototype.getContext = original
    })
}

/** Waits a frame at a time, up to a second's worth, for `done` to hold. */
const until = async (done: () => boolean): Promise<boolean> => {
  for (let frame = 0; frame < 60 && !done(); frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  return done()
}

/**
 * Removes the element in the frame its opening draw is booked for, before it.
 *
 * Booked before `mount`, so before the element books its opening frame, and
 * the callbacks of one frame run in the order they were booked. That is the
 * order a busy page produces by accident, the removal landing between the
 * booking and the draw, and the one that left a detached aura looping forever.
 * `then` runs on the element as it is taken out, for a spec that puts it back.
 */
const removeBeforeOpening = (
  markup: string,
  then?: (host: HTMLElement, parent: HTMLElement | null) => void,
): Promise<{ host: HTMLElement; removed: Promise<void> }> => {
  let host: HTMLElement | undefined
  const removed = new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      const parent = host?.parentElement ?? null
      host?.remove()
      if (host) {
        then?.(host, parent)
      }
      resolve()
    })
  })
  return mount(markup).then((mounted) => {
    host = mounted
    return { host: mounted, removed }
  })
}

describe('aura', () => {
  /* **Declared once for the file, and deliberately never put back.** The
     browser lane gives this family a page of its own, so the stub outlives
     nothing, and the three specs that want another answer install their own and
     restore to this one. The harness has no `afterAll` to undo it in, which is
     the smaller reason. */
  beforeAll(() => {
    reportRenderer(HARDWARE)
  })

  test('renders a canvas and hides it from assistive technology', async () => {
    /* Decorative by definition: it draws light behind content and has nothing
       to announce. The host stays visible to the tree so a consumer can label
       the region it sits behind. */
    const host = (await mount(undrawn())) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    const canvas = host.shadowRoot?.querySelector('canvas')
    expect(canvas).toBeDefined()
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(host.getAttribute('aria-hidden')).toBeNull()
  })

  /* Browser only: happy-dom never runs the frame the state is recorded from. */
  if (hasLayout()) {
    test('settles like every other element, so a transition on it can run', async () => {
      const host = (await mount(undrawn())) as HTMLElement
      await readyToMove(host)
      expect(hasState(host, 'settled')).toBe(true)
    })
  }

  test('survives a machine with no WebGL, because the fallback is underneath', async () => {
    /* happy-dom returns null from `getContext`, which is exactly the case a
       reader on a refused context gets. The element must render and stay
       usable: the canvas simply never paints, and the host's own token
       gradient is what shows. Nothing detects this, which is the point. */
    const host = (await mount(undrawn('variant="rays"'))) as HTMLElement & {
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
       Every hard reload flashed, brighter in one scheme and darker in the
       other.

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
    const host = (await mount(undrawn())) as HTMLElement & {
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
    const host = (await mount(undrawn())) as HTMLElement & {
      interactive: boolean
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    expect(host.hasAttribute('interactive')).toBe(false)

    host.interactive = true
    await host.updateComplete
    expect(host.hasAttribute('interactive')).toBe(true)
  })

  /* The reconnection, which fails one-way and silently.
   *
   * `disconnectedCallback` gives the context back through `WEBGL_lose_context`,
   * because a browser caps live contexts at about sixteen. What it cannot do is
   * assume the canvas recovers: `getContext` hands back the very same dead
   * object, so `link` fails, `start` returns before installing one observer,
   * and the element sits connected and permanently blind holding its last
   * frame. On the landing page that frame was the 2x2 the first `measure` took
   * before layout, stretched over two screens as a gray smear.
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
    const host = (await mount(undrawn())) as HTMLElement & {
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

  /* **Lit updates an element whether or not it is still connected**, so one
     inserted and removed in the same task reaches `firstUpdated` detached. A
     context made there has no disconnection left to release it, and counts
     against the browser's cap of about sixteen until the element is collected.
     Both lanes: happy-dom answers `null`, but the asking is what is counted. */
  test('removed before its first update, it never asks for a context', async () => {
    const host = document.createElement('helix-aura')
    const original = HTMLCanvasElement.prototype.getContext
    let asked = 0
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<HTMLCanvasElement['getContext']>
    ) {
      if (args[0] === 'webgl2') {
        asked += 1
      }
      return original.apply(this, args)
    } as HTMLCanvasElement['getContext']
    try {
      document.body.replaceChildren(host)
      host.remove()
      await host.updateComplete
    } finally {
      HTMLCanvasElement.prototype.getContext = original
    }
    expect(asked).toBe(0)
  })

  /* What the renderer's own name decides, which only a browser can answer: the
     happy-dom lane has no WebGL to name, and its fallback is the spec above.
     All three mount at no height, so the context and the program are made where
     they are expected and not one draw is paid. */
  if (hasLayout()) {
    test('a renderer that draws in software takes the fallback, and asks for no context', async () => {
      /* The gradient is the same palette from the same tokens, and the shader
         costs about 450ms of first frame per element on a CPU. */
      const restore = reportRenderer(SOFTWARE)
      let host: HTMLElement
      try {
        const mounted = await askedOnElement(() => mount(undrawn()))
        host = mounted.value
        expect(mounted.asked).toBe(0)
      } finally {
        restore()
      }
      /* Not hidden, which is what separates this from a context the browser
         took: the canvas is simply never painted, and a canvas that never
         paints is transparent. */
      expect(host.shadowRoot?.querySelector('canvas')?.hasAttribute('hidden')).toBe(false)
      expect(getComputedStyle(host).backgroundImage).toContain('radial-gradient')
      expect(await framesBooked(4)).toBe(0)
    })

    test('a renderer with a hardware name keeps the drawing path', async () => {
      const host = await mount(undrawn())
      const gl = host.shadowRoot?.querySelector('canvas')?.getContext('webgl2')
      expect(gl).not.toBeNull()
      expect(gl?.isContextLost()).toBe(false)
    })

    test('a renderer it cannot read keeps it too, because declining is the worse mistake', async () => {
      /* The extension is optional and is withheld on purpose by the browsers
         that resist fingerprinting. Reading "we cannot tell" as software would
         take the shader from every reader whose machine hides a real GPU. */
      const restore = reportRenderer(null)
      try {
        const host = await mount(undrawn())
        const gl = host.shadowRoot?.querySelector('canvas')?.getContext('webgl2')
        expect(gl).not.toBeNull()
        expect(gl?.isContextLost()).toBe(false)
      } finally {
        restore()
      }
    })
  }

  /* The loop, which only a browser runs. Every draw is stubbed by `countDraws`,
     so none of these reaches the GPU. */
  if (hasLayout()) {
    test('removed before its first frame, it draws nothing and books nothing', async () => {
      const { host, removed } = await removeBeforeOpening(drawn())
      const draws = countDraws(host)
      if (!draws) {
        return
      }
      /* Four frames, which spans the release's task as well: a loop that
         outlived the removal books one on every one of them. */
      const frames = await framesBooked(4)
      await removed
      expect(draws.count).toBe(0)
      expect(frames).toBe(0)
    })

    test('removed while running, it stops and gives its context back', async () => {
      const host = await mount(drawn())
      const gl = host.shadowRoot?.querySelector('canvas')?.getContext('webgl2')
      const draws = countDraws(host)
      if (!draws) {
        return
      }
      // Two, so the loop is running rather than only the opening frame drawn.
      expect(await until(() => draws.count >= 2)).toBe(true)
      host.remove()
      const before = draws.count
      expect(await framesBooked(4)).toBe(0)
      expect(draws.count).toBe(before)
      expect(gl?.isContextLost()).toBe(true)
    })

    test('put back before its first frame, it still opens', async () => {
      /* A move cancels the opening along with everything else, and the box it
         comes back to is the same size, so `measure` reports nothing to do.
         The opening is still owed. */
      const { host, removed } = await removeBeforeOpening(drawn(), (moved, parent) => {
        parent?.append(moved)
      })
      const draws = countDraws(host)
      if (!draws) {
        return
      }
      await removed
      expect(await until(() => draws.count >= 1)).toBe(true)
    })

    test('comes back drawing after a real removal', async () => {
      const { host, removed } = await removeBeforeOpening(drawn())
      const parent = host.parentElement
      if (!countDraws(host)) {
        return
      }
      await removed
      // A task, so the release runs and the canvas is spent.
      await new Promise((resolve) => setTimeout(resolve, 0))
      parent?.append(host)
      /* Read again: coming back from a spent context replaces the canvas. Two
         draws, the opening frame and the loop behind it. */
      const draws = countDraws(host)
      expect(draws).not.toBeNull()
      expect(await until(() => (draws?.count ?? 0) >= 2)).toBe(true)
    })

    /* A context the browser takes, on a GPU reset or past its cap, forced here
       the one way a page can. The extension is held from before, because a
       lost context answers `null` to `getExtension`. */
    test('a context the browser takes stops it and shows the fallback, until it is given back', async () => {
      const host = await mount(drawn())
      const canvas = host.shadowRoot?.querySelector('canvas')
      const lose = canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')
      const draws = countDraws(host)
      if (!canvas || !lose || !draws) {
        return
      }
      expect(await until(() => draws.count >= 2)).toBe(true)

      /* Awaited through a listener added after the element's own, so it runs
         once the element has answered. */
      const lost = new Promise((resolve) => {
        canvas.addEventListener('webglcontextlost', resolve, { once: true })
      })
      lose.loseContext()
      await lost
      expect(await framesBooked(4)).toBe(0)
      /* The fallback is the host's own gradient, and what it needs is nothing
         in front of it: a lost canvas is not reliably transparent. */
      expect(getComputedStyle(host).backgroundImage).toContain('radial-gradient')
      expect(canvas.checkVisibility()).toBe(false)

      /* Given back only because the element canceled the loss: `restoreContext`
         refuses a context whose loss nobody asked to undo. */
      const before = draws.count
      const restored = new Promise((resolve) => {
        canvas.addEventListener('webglcontextrestored', resolve, { once: true })
      })
      lose.restoreContext()
      await restored
      expect(canvas.checkVisibility()).toBe(true)
      expect(await until(() => draws.count >= before + 2)).toBe(true)
    })

    test('a context lost after it is removed does nothing, and it still comes back', async () => {
      const host = await mount(drawn())
      const parent = host.parentElement
      const canvas = host.shadowRoot?.querySelector('canvas')
      const lose = canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')
      const draws = countDraws(host)
      if (!canvas || !lose || !draws) {
        return
      }
      expect(await until(() => draws.count >= 1)).toBe(true)

      host.remove()
      const lost = new Promise<Event>((resolve) => {
        canvas.addEventListener('webglcontextlost', resolve, { once: true })
      })
      lose.loseContext()
      /* Not asked back, since nothing is left to draw it, and not answered. */
      expect((await lost).defaultPrevented).toBe(false)
      expect(canvas.hasAttribute('hidden')).toBe(false)
      expect(await framesBooked(4)).toBe(0)

      parent?.append(host)
      const again = countDraws(host)
      expect(again).not.toBeNull()
      expect(await until(() => (again?.count ?? 0) >= 2)).toBe(true)
    })

    /* A move, with the loss landing between the removal and the return. Its
       event arrives later and at nobody, so nothing will restore it, and an
       element that kept the program it had waited on it for good. */
    test('lost while it is being moved, it draws on a fresh canvas', async () => {
      const host = await mount(drawn())
      const parent = host.parentElement
      const lose = host.shadowRoot
        ?.querySelector('canvas')
        ?.getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
      if (!lose || !countDraws(host)) {
        return
      }
      host.remove()
      lose.loseContext()
      parent?.append(host)
      const draws = countDraws(host)
      expect(draws).not.toBeNull()
      expect(await until(() => (draws?.count ?? 0) >= 2)).toBe(true)
    })

    /* The preference changing under a running field.
     *
     * **Stubbed, because the real one cannot be moved from inside the page.** A
     * browser answers `prefers-reduced-motion` from the platform and there is no
     * API to set it; what can be replaced is the query the element asks for, and
     * the wiring is the whole of what was missing. The query was created and
     * never listened to, so the preference was read at `play` and nowhere else,
     * and `tick` books its own next frame: a reader who turned it on kept the
     * shader running for the life of the page.
     *
     * Restored on the way out rather than in an `afterEach`, since this is the
     * one test in the file that touches a global. */
    test('turning reduce-motion on stops the loop, and turning it off starts it', async () => {
      const real = window.matchMedia.bind(window)
      const listeners = new Set<() => void>()
      const query = {
        addEventListener: (_name: string, run: () => void) => listeners.add(run),
        matches: false,
        removeEventListener: (_name: string, run: () => void) => listeners.delete(run),
      }
      const flip = (matches: boolean): void => {
        query.matches = matches
        for (const run of listeners) {
          run()
        }
      }
      window.matchMedia = ((ask: string) =>
        ask.includes('prefers-reduced-motion')
          ? query
          : real(ask)) as unknown as typeof window.matchMedia
      try {
        const host = await mount(drawn())
        const draws = countDraws(host)
        if (!draws) {
          return
        }
        expect(await until(() => draws.count >= 2)).toBe(true)

        flip(true)
        expect(await framesBooked(4)).toBe(0)
        const held = draws.count

        /* One still frame rather than the canvas keeping whatever was mid-drift
           on it, which is what the class doc block promises a reader who asks
           for no motion. Asked for from a stopped loop, so the count is the
           answer and not a race with a frame already in flight. */
        flip(true)
        expect(draws.count).toBe(held + 1)
        expect(await framesBooked(4)).toBe(0)

        flip(false)
        expect(await until(() => draws.count >= held + 3)).toBe(true)
      } finally {
        window.matchMedia = real
      }
    })
  }
})

/* The axis, asserted where it lands rather than at what angle.
 *
 * `terminus` exists so nobody has to reason about an angle, so a fixture on the
 * angle would guard the wrong number: an angle can be right-looking and wrong
 * while the docstring promises a position. These go through `exitOf`, which
 * models what `shader.ts` does with the tilt, so what is being checked is
 * that the property keeps its promise about the picture.
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

/* Which shapes read `variance`, held to the shader rather than to a sentence.
 *
 * The answer is written in four places and only one of them does anything: the
 * property's own docblock, the comment over `uVariance`, the bench's `VARIES`,
 * which decides whether the site offers the knob at all, and the shader. Nothing
 * held the four to each other, so a shape that starts or stops reading it leaves
 * three descriptions of the version before, and a bench offering a control that
 * silently does nothing is the one thing `VARIES` exists to prevent. The shipped
 * `pointer` example set `variance` on `braid`, which refuses it, for as long as
 * the property has existed, and no rule could see it: the value is a number the
 * component declares and the attribute is one it has.
 *
 * Read off the bodies, which is where all six reads are. A shape taking its
 * spread through a helper instead would read as inert here, and the answer then
 * is to follow the helper rather than to widen the list. */
describe('aura variance', () => {
  /** Every shape `variant` offers, which is the set this asks about. */
  const SHAPES = [
    'aurora',
    'braid',
    'caustics',
    'flow',
    'fracture',
    'lattice',
    'particles',
    'rays',
    'streaks',
    'threads',
    'waves',
  ]

  /** The six the property names. Moving this means moving the other three. */
  const VARIES = ['aurora', 'caustics', 'fracture', 'particles', 'rays', 'streaks']

  /** One shape's body, brace matched from its own signature. */
  const bodyOf = (name: string): string => {
    const signature = FRAGMENT.indexOf(`float ${name}(`)
    const opens = FRAGMENT.indexOf('{', signature)
    let depth = 0
    for (let at = opens; at < FRAGMENT.length; at += 1) {
      if (FRAGMENT[at] === '{') {
        depth += 1
      } else if (FRAGMENT[at] === '}') {
        depth -= 1
        if (depth === 0) {
          return FRAGMENT.slice(opens, at + 1)
        }
      }
    }
    return ''
  }

  test('every shape the eleven names is in the shader under that name', () => {
    for (const name of SHAPES) {
      expect(bodyOf(name).length).toBeGreaterThan(0)
    }
  })

  test('and exactly the six the property names read it', () => {
    expect(SHAPES.filter((name) => bodyOf(name).includes('uVariance'))).toEqual(VARIES)
  })
})

describe('aura shader', () => {
  test('ships no comment inside the string', () => {
    /* No minifier reads inside a template literal, so a GLSL comment ships in
       every bundle. The notes live in JavaScript comments the build strips. */
    expect(FRAGMENT).not.toContain('/*')
    expect(FRAGMENT).not.toContain('//')
  })
})
