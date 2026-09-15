import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Stop = HTMLElement & { updateComplete: Promise<boolean> }

const stop = async (attributes = 'current'): Promise<Stop> =>
  (await mount(
    `<helix-headless-tour-stop ${attributes}>This is the sidebar.</helix-headless-tour-stop>`,
  )) as Stop

const asked = async (host: Stop, name: string): Promise<string | undefined> => {
  let what: string | undefined
  host.addEventListener('helix-tour-ask', (event) => {
    what = (event as CustomEvent<{ what: string }>).detail.what
  })
  ;(part(host, name) as HTMLElement | null)?.click()
  await host.updateComplete
  return what
}

/**
 * One stop, and the contract that is the stop's rather than the tour's.
 *
 * **The tour already proves the sequence**, which is which stop is current, what
 * a `next` advances to and what happens at the end. What one stop owns alone is
 * that it *asks* rather than moves, and that is the assertion that cannot be
 * made from the tour, where a stop that moved the tour itself and one that
 * asked it to look identical from outside.
 */
describe('one tour stop', () => {
  /* A stop does not know what is after it, and a stop that reached up to its
     parent to find out would be a stop that only works inside one. So all three
     controls say the same kind of thing and the root decides. */
  test('asks to be moved rather than moving, on every control it draws', async () => {
    expect(await asked(await stop(), 'next')).toBe('next')
    expect(await asked(await stop(), 'skip')).toBe('skip')
    expect(await asked(await stop('current'), 'back')).toBe('back')
  })

  /* The event has to leave this shadow root to reach the root's own slot, and a
     composed event is the only kind that does. */
  test('sends the ask across its own boundary, where the root is listening', async () => {
    const host = await stop()
    let composed: boolean | undefined
    host.addEventListener('helix-tour-ask', (event) => {
      composed = event.composed
    })
    ;(part(host, 'next') as HTMLElement).click()
    expect(composed).toBe(true)
  })

  /* Where the stop sits in the sequence changes what it offers: nowhere back to
     on the first, and the last one finishes rather than continuing. Both are
     told to the stop and both are the stop's to draw. */
  test('draws no way back from the first stop, and finishes on the last', async () => {
    expect(part(await stop('current first'), 'back')).toBeNull()
    expect(part(await stop('current'), 'back')).not.toBeNull()

    expect(part(await stop('current last'), 'next')?.textContent?.trim()).toBe('Done')
    expect(part(await stop('current'), 'next')?.textContent?.trim()).toBe('Next')
  })

  /* The panel is `popover="manual"`, which is what keeps a press elsewhere from
     ending the tour: elsewhere is the thing being pointed at. */
  test('holds its panel open itself rather than letting a press elsewhere close it', async () => {
    const bubble = part(await stop(), 'bubble')
    expect(bubble?.getAttribute('popover')).toBe('manual')
    expect(bubble?.hasAttribute('hidden')).toBe(false)
    expect(part(await stop(''), 'bubble')?.hasAttribute('hidden')).toBe(true)
  })
})

/**
 * Where the panel goes when the side it asked for has no room, and neither has
 * the other one.
 *
 * Browser-only because it is geometry: happy-dom lays nothing out, so every
 * side fits a box of no size and the question never comes up.
 *
 * The target is a band the width of the window, which is what a rail becomes on
 * a phone and what sent the tour's first stop off the window: beside it
 * there is no room on either side, whatever the window's width.
 */
if (hasLayout()) {
  const FIXTURE = `<style>
      #band { block-size: 3rem; inset-block-start: 4rem; inset-inline: 1rem; position: fixed }
      #post { block-size: 3rem; inline-size: 6rem; inset-block-start: 4rem; inset-inline-start: 1rem; position: fixed }
      helix-headless-tour-stop::part(bubble) { box-sizing: border-box; inline-size: 16rem; margin: 0; overflow: visible; padding: 0 }
    </style>
    <div id="band"></div>
    <div id="post"></div>`

  /* The direction on the root rather than on a wrapper, because the bubble is
     in the top layer and laid out against the viewport, whose direction is the
     root's. Under a `<div dir="rtl">` in an English page a panel placed from
     the wrong edge still landed, so a wrapper proved nothing: on a page that
     was right-to-left from the root, every stop sat a window's width out. */
  const placed = async (stop: string, direction = 'ltr'): Promise<Stop> => {
    document.documentElement.dir = direction
    await mount(`<div>${stop}${FIXTURE}</div>`)
    const host = document.querySelector('helix-headless-tour-stop') as Stop
    await host.updateComplete
    /* `computePosition` resolves after the update, and `autoUpdate` places once
       as it starts: two frames cover both. */
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    return host
  }

  const boxes = (host: Stop): { bubble: DOMRect; target: DOMRect } => ({
    bubble: (part(host, 'bubble') as HTMLElement).getBoundingClientRect(),
    target: (
      document.getElementById(host.getAttribute('for') ?? '') as HTMLElement
    ).getBoundingClientRect(),
  })

  const beside = (target: string): string =>
    `<helix-headless-tour-stop current for="${target}" placement="right-start">Here.</helix-headless-tour-stop>`

  describe('a stop placed beside its target', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('stays beside it where there is room', async () => {
      const host = await placed(beside('post'))
      const { bubble, target } = boxes(host)
      expect(part(host, 'bubble')?.getAttribute('data-placement')).toBe('right-start')
      expect(bubble.left).toBeGreaterThanOrEqual(target.right)
      expect(hasState(host, 'placed-right')).toBe(true)
      expect(hasState(host, 'placed-bottom')).toBe(false)
    })

    test('moves below it, inside the window, where neither side has room', async () => {
      const host = await placed(beside('band'))
      const { bubble, target } = boxes(host)
      expect(part(host, 'bubble')?.getAttribute('data-placement')).toBe('bottom-start')
      expect(bubble.top).toBeGreaterThanOrEqual(target.bottom)
      expect(bubble.left).toBeGreaterThanOrEqual(0)
      expect(bubble.right).toBeLessThanOrEqual(window.innerWidth)
      expect(bubble.bottom).toBeLessThanOrEqual(window.innerHeight)
      /* And the arrow can say so. The stop still asks for the right, so a sheet
         reading `placement` would point the arrow from a side the panel is not
         on. */
      expect(hasState(host, 'placed-bottom')).toBe(true)
      expect(hasState(host, 'placed-right')).toBe(false)
    })

    /* The side it falls back to does not turn with the writing direction, and
       the end it lines up with does: `-start` is the target's right edge in a
       right-to-left page, as it is for any other panel below its anchor. */
    test('lines up with the target’s start edge in either direction', async () => {
      const ltr = await placed(beside('band'))
      expect(Math.round(boxes(ltr).bubble.left)).toBe(Math.round(boxes(ltr).target.left))

      const rtl = await placed(beside('band'), 'rtl')
      expect(part(rtl, 'bubble')?.getAttribute('data-placement')).toBe('bottom-start')
      expect(Math.round(boxes(rtl).bubble.right)).toBe(Math.round(boxes(rtl).target.right))
    })

    /* The preview's first stop, mirrored: a rail at the start of a
       right-to-left page is at its right, so the right of it is the window's
       edge and the stop crosses to the left, saying so for its arrow. */
    test('crosses to the other side of a target at the start of a right-to-left page', async () => {
      const host = await placed(beside('post'), 'rtl')
      const { bubble, target } = boxes(host)
      expect(part(host, 'bubble')?.getAttribute('data-placement')).toBe('left-start')
      expect(bubble.right).toBeLessThanOrEqual(target.left)
      expect(bubble.left).toBeGreaterThanOrEqual(0)
      expect(hasState(host, 'placed-left')).toBe(true)
    })
  })
}
