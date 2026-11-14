import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import type {
  readColor as ReadColor,
  readColorAlpha as ReadColorAlpha,
} from '@fusion.dev/helix-core'
import {
  framesBooked,
  hasLayout,
  hasState,
  internalsOf,
  label,
  mount,
  readyToMove,
  registerDom,
  role,
} from '@fusion.dev/helix-testing/dom'

/* Registered before the module is evaluated, and the import is dynamic for
   exactly that reason: `@customElement` runs at evaluation, and a static import
   would run it before `registerDom` has installed a `customElements` to
   register against. The element then never upgrades and every assertion about
   its shadow root reads `undefined`. Core is imported here too: it reads
   the globals it finds when it is evaluated, and a static import of it breaks
   six of these when the file runs alone. */
let readColor: typeof ReadColor
let readColorAlpha: typeof ReadColorAlpha
beforeAll(async () => {
  registerDom()
  ;({ readColor, readColorAlpha } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

type Upgraded = HTMLElement & {
  internals?: ElementInternals
  state: string
  updateComplete: Promise<boolean>
}

/** Runs `body` on a page claiming `ratio` device pixels to the CSS pixel. */
const atDensity = async (ratio: number, body: () => Promise<void>): Promise<void> => {
  const density = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: ratio })
  try {
    await body()
  } finally {
    Reflect.deleteProperty(window, 'devicePixelRatio')
    if (density) {
      Object.defineProperty(window, 'devicePixelRatio', density)
    }
  }
}

describe('orb', () => {
  test('renders a canvas and keeps the name on the host', async () => {
    const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
    await host.updateComplete
    const canvas = host.shadowRoot?.querySelector('canvas')
    expect(canvas).toBeDefined()
    /* The canvas has nothing of its own to announce; the host carries the role
       and the name through `ElementInternals`, so a consumer walking the light
       DOM finds them. */
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
  })

  /* Browser only: happy-dom never runs the frame the state is recorded from. */
  if (hasLayout()) {
    test('settles like every other element, so a transition on it can run', async () => {
      const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
      await readyToMove(host)
      expect(hasState(host, 'settled')).toBe(true)
    })
  }

  test('survives a machine that refuses a 2D context', async () => {
    /* happy-dom returns null from `getContext`, which is exactly what a reader
       on a refused context gets. The element must render and stay connected:
       the canvas simply never paints. */
    const host = (await mount('<helix-orb state="working"></helix-orb>')) as Upgraded
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('canvas')).toBeDefined()
    expect(host.isConnected).toBe(true)
  })

  test('names itself from the state, through internals rather than an attribute', async () => {
    const host = (await mount('<helix-orb state="fetching"></helix-orb>')) as Upgraded
    await host.updateComplete
    expect(role(host)).toBe('progressbar')
    expect(label(host)).toBe('Fetching')
    expect(internalsOf(host)?.ariaBusy).toBe('true')
    /* Said through `ElementInternals`, so a consumer's server markup never had
       an attribute here to reconcile. */
    expect(host.getAttribute('role')).toBeNull()
    expect(host.getAttribute('aria-label')).toBeNull()
  })

  test('stops calling itself a progress bar once it is done', async () => {
    const host = (await mount('<helix-orb state="fetching"></helix-orb>')) as Upgraded
    await host.updateComplete
    host.state = 'done'
    await host.updateComplete
    /* A finished orb still announcing itself as a progress bar leaves a screen
       reader waiting for a bar that never fills. */
    expect(role(host)).toBe('img')
    expect(label(host)).toBe('Done')
    expect(internalsOf(host)?.ariaBusy).toBe('false')
  })

  test('a label the caller wrote wins over the state word', async () => {
    const host = (await mount(
      '<helix-orb state="working" label="Running tests"></helix-orb>',
    )) as Upgraded
    await host.updateComplete
    expect(label(host)).toBe('Running tests')
  })

  test('names a state in the words it is given, and keeps English for the rest', async () => {
    const host = (await mount('<helix-orb state="working"></helix-orb>')) as Upgraded & {
      stateLabels: Record<string, string>
    }
    host.stateLabels = { working: 'En cours' }
    await host.updateComplete
    expect(label(host)).toBe('En cours')
    host.state = 'done'
    await host.updateComplete
    expect(label(host)).toBe('Done')
  })

  test('names a state from the words its `state-labels` attribute holds', async () => {
    const host = (await mount(
      `<helix-orb state="done" state-labels='{"done":"Terminé"}'></helix-orb>`,
    )) as Upgraded
    expect(label(host)).toBe('Terminé')
    const broken = (await mount(
      `<helix-orb state="done" state-labels="not json"></helix-orb>`,
    )) as Upgraded
    expect(label(broken)).toBe('Done')
  })

  test('each state is a custom state, and one it does not draw is `thinking`', async () => {
    const host = (await mount('<helix-orb state="working"></helix-orb>')) as Upgraded
    expect(hasState(host, 'working')).toBe(true)
    expect(hasState(host, 'thinking')).toBe(false)
    host.state = 'done'
    await host.updateComplete
    expect(hasState(host, 'done')).toBe(true)
    expect(hasState(host, 'working')).toBe(false)
    host.state = 'compiling'
    await host.updateComplete
    expect(hasState(host, 'thinking')).toBe(true)
    expect(host.hasAttribute('state')).toBe(true)
    expect(host.getAttribute('state')).toBe('working')
  })

  /* A live region inside a progress bar or an image may never be heard: what
     those two hold is presentation to assistive technology. So an orb that
     announces is the region itself, a `status` holding the state's word. */
  test('says a new state aloud only when `announce` is set, as a status region of its own', async () => {
    const quiet = (await mount('<helix-orb state="working"></helix-orb>')) as Upgraded
    quiet.state = 'done'
    await quiet.updateComplete
    expect(quiet.shadowRoot?.querySelector('[part="live"]')).toBeNull()
    expect(role(quiet)).toBe('img')

    const loud = (await mount('<helix-orb announce state="working"></helix-orb>')) as Upgraded
    expect(role(loud)).toBe('status')
    expect(internalsOf(loud)?.ariaBusy ?? null).toBeNull()
    expect(label(loud)).toBe('Working')
    const live = loud.shadowRoot?.querySelector('[part="live"]')
    expect(live?.getAttribute('role')).toBeNull()
    expect(live?.textContent).toBe('Working')
    loud.state = 'done'
    await loud.updateComplete
    expect(role(loud)).toBe('status')
    expect(loud.shadowRoot?.querySelector('[part="live"]')?.textContent).toBe('Done')
  })

  /* **Lit updates an element whether or not it is still connected**, so one
     inserted and removed in the same task reaches `firstUpdated` detached. What
     it installed there had no disconnection left to take it down, and the
     document listener among it held the element for the life of the page.
     Both lanes: happy-dom refuses the context, but the asking is what is
     counted. */
  /* The dots were the only shape an orb could take: a page with a mark of its
     own gave up the orb's name and states to draw it. */
  test('a shape in the default slot takes the place of the dots, and the orb keeps its name', async () => {
    const host = (await mount(
      '<helix-orb state="working"><svg viewBox="0 0 1 1"></svg></helix-orb>',
    )) as Upgraded
    const turn = async (): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await host.updateComplete
    }
    await turn()
    const canvas = host.shadowRoot?.querySelector('canvas')
    expect(host.shadowRoot?.querySelector('slot:not([name])')).not.toBeNull()
    expect(canvas?.hasAttribute('hidden')).toBe(true)
    expect(role(host)).toBe('progressbar')
    expect(label(host)).toBe('Working')
    expect(hasState(host, 'working')).toBe(true)
    if (hasLayout()) {
      expect(await framesBooked(4)).toBe(0)
    }
    host.replaceChildren()
    await turn()
    expect(canvas?.hasAttribute('hidden')).toBe(false)
    if (hasLayout()) {
      expect(await framesBooked(4)).toBeGreaterThan(0)
    }
  })

  test('removed before its first update, it never sets up', async () => {
    const host = document.createElement('helix-orb')
    const original = HTMLCanvasElement.prototype.getContext
    let asked = 0
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<HTMLCanvasElement['getContext']>
    ) {
      if (this.getRootNode() === host.shadowRoot) {
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

  /* The loop, which only a browser runs. */
  if (hasLayout()) {
    test('removed, it books no frame, even when its state changes after', async () => {
      const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
      /* Running first, which the intersection observer decides on a frame of
         its own: a running orb books one on every frame. */
      expect(await framesBooked(4)).toBeGreaterThan(0)
      host.remove()
      /* A change of state starts a transition, and a transition plays. On a
         detached orb that was a loop with nothing left to stop it. */
      host.state = 'working'
      await host.updateComplete
      expect(await framesBooked(4)).toBe(0)
    })

    test('put back, it runs again', async () => {
      const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
      const parent = host.parentElement
      expect(await framesBooked(4)).toBeGreaterThan(0)
      host.remove()
      expect(await framesBooked(2)).toBe(0)
      parent?.append(host)
      expect(await framesBooked(4)).toBeGreaterThan(0)
    })

    /* A page has no way to make a 2D context lose itself, so the two events are
       sent by hand, and `reset` does to the state what a real restore does: a
       crashed GPU process under headless Chromium gave the canvas back with
       the identity for its transform. At twice the density, where the identity
       is not also the right answer. */
    test('a canvas the browser takes stops it, and it comes back at its own size', () =>
      atDensity(2, async () => {
        const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
        const canvas = host.shadowRoot?.querySelector('canvas')
        const context = canvas?.getContext('2d')
        if (!canvas || !context) {
          return
        }
        expect(await framesBooked(4)).toBeGreaterThan(0)

        canvas.dispatchEvent(new Event('contextlost', { cancelable: true }))
        expect(await framesBooked(4)).toBe(0)
        // Out of the way, leaving the empty box that is the orb's fallback.
        expect(canvas.checkVisibility()).toBe(false)

        context.reset()
        canvas.dispatchEvent(new Event('contextrestored'))
        expect(canvas.checkVisibility()).toBe(true)
        expect(context.getTransform().a).toBe(2)
        expect(await framesBooked(4)).toBeGreaterThan(0)
      }))

    /* The same, given back while the orb is out of the page and nothing is
       listening. What it missed is the transform and the loss being over.

       Only where the context has `isContextLost()`, which is how the orb asks
       on its return. WebKit's 2D context has no such method and never sends
       `contextlost`, so an orb there never reaches the question, and the loss
       sent by hand here made it ask anyway. */
    test('given back while it is away, it returns shown and at its own size', () =>
      atDensity(2, async () => {
        const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
        const parent = host.parentElement
        const canvas = host.shadowRoot?.querySelector('canvas')
        const context = canvas?.getContext('2d')
        if (!canvas || !context || !('isContextLost' in context)) {
          return
        }
        canvas.dispatchEvent(new Event('contextlost', { cancelable: true }))
        host.remove()
        context.reset()
        canvas.dispatchEvent(new Event('contextrestored'))

        parent?.append(host)
        expect(canvas.checkVisibility()).toBe(true)
        expect(context.getTransform().a).toBe(2)
        expect(await framesBooked(4)).toBeGreaterThan(0)
      }))
  }
})

/**
 * The conversion the orb's ramp depends on, asserted where a browser runs it.
 *
 * **A core utility with its spec in a family, deliberately.** The browser suite
 * walks the two element tiers, so a `.dom.spec.ts` under `helix/core` only ever
 * runs against happy-dom, which refuses a 2D context and would skip every one
 * of these. The orb is the caller that goes wrong when the conversion does, and
 * this is the only place the assertion is worth anything.
 */
describe('reading a color the engine resolved but did not convert', () => {
  /* Registered only where there is a real 2D context, rather than skipped:
     happy-dom refuses one and the browser runner has no `test.if`. */
  const painting =
    typeof document !== 'undefined' && !!document.createElement('canvas').getContext('2d')

  if (painting) {
    test('converts lab, which is what these tokens compute to', () => {
      expect(readColor('lab(100 0 0)')).toEqual([255, 255, 255])
      expect(readColor('lab(0 0 0)')).toEqual([0, 0, 0])
    })

    test('leaves rgb alone', () => {
      expect(readColor('rgb(12, 34, 56)')).toEqual([12, 34, 56])
    })

    test('refuses a value no engine will parse, rather than guessing', () => {
      expect(readColor('not-a-color')).toBeUndefined()
    })

    /* Painting over two grounds is what makes that refusal honest, and these
       are the two: black over black reports the same three bytes whether the
       value landed or was thrown away. */
    test('and still answers the grounds it paints over', () => {
      expect(readColor('#000000')).toEqual([0, 0, 0])
      expect(readColor('#ffffff')).toEqual([255, 255, 255])
    })

    /* A see-through `--orb-color` drew mid gray: painted over black and over
       white it read back two ways, and was refused as if it did not parse. */
    test('reads a see-through color with its alpha', () => {
      const read = readColorAlpha('rgb(255 0 0 / 50%)')
      expect(read?.slice(0, 3)).toEqual([255, 0, 0])
      expect(Math.abs((read?.[3] ?? 0) - 0.5) < 0.01).toBe(true)
      expect(readColorAlpha('rgb(12, 34, 56)')).toEqual([12, 34, 56, 1])
      expect(readColorAlpha('not-a-color')).toBeUndefined()
    })

    test('an orb in a see-through ink draws in that ink', async () => {
      const host = (await mount(
        '<helix-orb state="idle" style="--orb-color: rgb(255 0 0 / 50%); --orb-ground: rgb(255 0 0 / 50%)"></helix-orb>',
      )) as Upgraded
      await readyToMove(host)
      const canvas = host.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
      const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data
      let red = 0
      let other = 0
      for (let index = 0; index < (pixels?.length ?? 0); index += 4) {
        if ((pixels?.[index + 3] ?? 0) > 0) {
          red += pixels?.[index] ?? 0
          other += (pixels?.[index + 1] ?? 0) + (pixels?.[index + 2] ?? 0)
        }
      }
      expect(red).toBeGreaterThan(0)
      expect(other).toBe(0)
    })
  }
})

/* A still orb, which a page that paused its motion leaves drawn once, follows
 * a change of its colors, as a theme switched to dark changes them. Only a
 * browser paints. */
describe('a still orb', () => {
  const painting =
    typeof document !== 'undefined' && !!document.createElement('canvas').getContext('2d')

  if (painting) {
    test('draws again in the new colors once its colors change', async () => {
      const { pauseMotion } = await import('@fusion.dev/helix-core')
      const host = (await mount(
        '<helix-orb state="idle" style="--orb-color: rgb(255 0 0); --orb-ground: rgb(255 0 0)"></helix-orb>',
      )) as Upgraded
      await readyToMove(host)
      pauseMotion()
      try {
        const canvas = host.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
        const ended = new Promise((done) =>
          canvas.addEventListener('transitionend', done, { once: true }),
        )
        host.style.setProperty('--orb-color', 'rgb(0 0 255)')
        host.style.setProperty('--orb-ground', 'rgb(0 0 255)')
        await ended
        const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data
        let [red, blue] = [0, 0]
        for (let index = 0; index < (pixels?.length ?? 0); index += 4) {
          red += pixels?.[index] ?? 0
          blue += pixels?.[index + 2] ?? 0
        }
        expect(blue).toBeGreaterThan(0)
        expect(red).toBe(0)
      } finally {
        pauseMotion(false)
      }
    })
  }
})
