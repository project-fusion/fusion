import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import {
  framesBooked,
  hasLayout,
  label,
  mount,
  registerDom,
  role,
  settle,
} from '@fusion.dev/helix-testing/dom'

/* Registered before the module is evaluated: `@customElement` runs at
   evaluation, and a static import would run it before `registerDom` has
   installed a `customElements` to register against. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Level = HTMLElement & {
  bands: string | readonly number[]
  label: string
  level: number
  still: boolean
  updateComplete: Promise<boolean>
  variant?: 'spectrum' | 'waves'
}

const level = async (markup: string): Promise<Level> => {
  const host = (await mount(markup)) as Level
  await host.updateComplete
  return host
}

describe('voice level', () => {
  test('is an image named for what it shows, with the canvas hidden from screen readers', async () => {
    const host = await level('<helix-voice-level></helix-voice-level>')
    expect(role(host)).toBe('img')
    expect(label(host)).toBe('Voice level')
    expect(host.shadowRoot?.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true')
    /* Said through `ElementInternals`, so server markup has nothing to
       reconcile. */
    expect(host.getAttribute('role')).toBeNull()
    expect(host.getAttribute('aria-label')).toBeNull()
  })

  test('a label the page wrote wins over the fallback', async () => {
    const host = await level('<helix-voice-level label="Your voice"></helix-voice-level>')
    expect(label(host)).toBe('Your voice')
    host.label = ''
    await host.updateComplete
    expect(label(host)).toBe('Voice level')
  })

  test('the fallback name is a word the page translates', async () => {
    registerWords('fr', { 'helix-voice-level': { fallbackLabel: 'Niveau de la voix' } })
    document.body.innerHTML = '<div lang="fr"><helix-voice-level></helix-voice-level></div>'
    const host = document.querySelector('helix-voice-level') as Level
    await settle(host)
    expect(label(host)).toBe('Niveau de la voix')
  })

  test('reads the level from its attribute, and keeps zero for one that is not a number', async () => {
    expect((await level('<helix-voice-level level="0.4"></helix-voice-level>')).level).toBe(0.4)
    expect((await level('<helix-voice-level level="loud"></helix-voice-level>')).level).toBe(0)
  })

  test('takes bands as an attribute or as an array', async () => {
    const written = await level('<helix-voice-level bands="0.1 0.5, 0.9"></helix-voice-level>')
    expect(written.bands).toBe('0.1 0.5, 0.9')
    written.bands = [0.2, 0.3]
    await written.updateComplete
    expect(written.bands).toEqual([0.2, 0.3])
  })

  test('reads still from its attribute, and does not write it back', async () => {
    expect((await level('<helix-voice-level still></helix-voice-level>')).still).toBe(true)
    const host = await level('<helix-voice-level></helix-voice-level>')
    expect(host.still).toBe(false)
    host.still = true
    await host.updateComplete
    expect(host.hasAttribute('still')).toBe(false)
  })

  test('reflects the variant, and writes nothing for the resting one', async () => {
    const host = await level('<helix-voice-level></helix-voice-level>')
    expect(host.hasAttribute('variant')).toBe(false)
    host.variant = 'waves'
    await host.updateComplete
    expect(host.getAttribute('variant')).toBe('waves')
  })

  test('survives a machine that refuses a 2D context', async () => {
    /* happy-dom returns null from `getContext`, which is what a reader on a
       refused context gets: the element renders and stays connected, and a
       reading draws nothing. */
    const host = await level('<helix-voice-level variant="waves"></helix-voice-level>')
    host.level = 0.8
    host.bands = [0.4, 0.9]
    await host.updateComplete
    expect(host.isConnected).toBe(true)
    expect(host.shadowRoot?.querySelector('canvas')).toBeDefined()
  })

  /* Browser only: happy-dom has no 2D context and runs no frames. */
  if (hasLayout()) {
    test('draws while there is a level, and stops once it has been zero for a while', async () => {
      const host = await level('<helix-voice-level variant="waves"></helix-voice-level>')
      host.level = 0.7
      await host.updateComplete
      expect(await framesBooked(10)).toBeGreaterThan(5)
      host.level = 0
      await host.updateComplete
      /* Two seconds at 60 frames a second: the fall finishes, the drawing
         rests, and the loop ends. */
      await framesBooked(120)
      expect(await framesBooked(10)).toBe(0)
      /* About 140 frames, over two seconds, which is past the default limit. */
    }, 5000)

    test('starts again with the next reading', async () => {
      const host = await level('<helix-voice-level></helix-voice-level>')
      await framesBooked(60)
      expect(await framesBooked(10)).toBe(0)
      host.bands = [0.3, 0.8, 0.5]
      await host.updateComplete
      expect(await framesBooked(10)).toBeGreaterThan(5)
    })

    test('a still level runs no frames, and clearing still starts them', async () => {
      const host = await level('<helix-voice-level still variant="waves"></helix-voice-level>')
      host.level = 0.8
      await host.updateComplete
      expect(await framesBooked(10)).toBe(0)
      host.still = false
      await host.updateComplete
      expect(await framesBooked(10)).toBeGreaterThan(5)
    })

    test('a still spectrum draws each bar at its band at once', async () => {
      const host = await level(
        '<helix-voice-level still style="--voice-level-color: rgb(255 0 0); --voice-level-bars: 8; inline-size: 80px; block-size: 20px"></helix-voice-level>',
      )
      host.level = 1
      await host.updateComplete
      const canvas = host.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      const ratio = canvas.width / 80
      /* The fourth bar, a center one, near the top of the box with no frame
         drawn: an eased bar would still stand at a dot. */
      const pixel = context.getImageData(Math.round(35 * ratio), Math.round(2 * ratio), 1, 1).data
      expect(pixel[0]).toBeGreaterThan(200)
    })

    test('still waves are the same picture on every load, and swing with the level', async () => {
      const picture = async (loudness = 0.7): Promise<string> => {
        const host = await level(
          `<helix-voice-level still level="${loudness}" variant="waves" style="inline-size: 90px; block-size: 30px"></helix-voice-level>`,
        )
        const canvas = host.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
        const url = canvas.toDataURL()
        host.remove()
        return url
      }
      const first = await picture()
      await framesBooked(5)
      expect(await picture()).toBe(first)
      expect(await picture(0)).not.toBe(first)
    })

    test('draws the center bars in the stronger color', async () => {
      const host = await level(
        '<helix-voice-level style="--voice-level-color: rgb(255 0 0); --voice-level-edge-color: rgb(0 0 255); --voice-level-bars: 8; inline-size: 80px; block-size: 20px"></helix-voice-level>',
      )
      host.level = 1
      await host.updateComplete
      await framesBooked(30)
      const canvas = host.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      const ratio = canvas.width / 80
      const pixel = (x: number): Uint8ClampedArray =>
        context.getImageData(Math.round(x * ratio), Math.round(10 * ratio), 1, 1).data
      /* Eight bars in slots of 10px: the first is an edge bar, the fourth a
         center one. */
      expect(pixel(5)[2]).toBeGreaterThan(200)
      expect(pixel(35)[0]).toBeGreaterThan(200)
    })
  }
})
