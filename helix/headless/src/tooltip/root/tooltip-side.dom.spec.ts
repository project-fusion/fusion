import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  hasState,
  idle,
  mount,
  part,
  registerDom,
} from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tip = HTMLElement & {
  placement: string
  reposition(): void
  show(): void
  updateComplete: Promise<unknown>
}

const SIDES = ['bottom', 'left', 'right', 'top'] as const

/** The side the bubble says it landed on, which the controller writes. */
const landed = (tip: Tip): string =>
  (part(tip, 'tooltip')?.getAttribute('data-placement') ?? '').split('-')[0] ?? ''

/**
 * Which side each of the three names says, and they have to agree: the arrow's
 * second part, the bubble's, and the host's state.
 */
const named = (tip: Tip): { arrow: string[]; bubble: string[]; state: string[] } => {
  const arrow = (part(tip, 'arrow')?.getAttribute('part') ?? '').split(' ')
  const bubble = (part(tip, 'tooltip')?.getAttribute('part') ?? '').split(' ')
  return {
    arrow: SIDES.filter((side) => arrow.includes(`arrow-${side}`)),
    bubble: SIDES.filter((side) => bubble.includes(`tooltip-${side}`)),
    state: SIDES.filter((side) => hasState(tip, `placed-${side}`)),
  }
}

/* `computePosition` resolves after the update, and the part names arrive with
   the render after that. */
const placed = async (tip: Tip): Promise<void> => {
  await new Promise((done) => setTimeout(done, 0))
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  await tip.updateComplete
}

/**
 * The side a bubble landed on, where a sheet outside the shadow root can read it.
 *
 * The controller writes `data-placement` on the bubble, and a document sheet
 * reaches the bubble through `::part()`, which no attribute can follow. So the
 * side is a second part name on the arrow and the bubble, and a state on the
 * host, and all three follow the side it landed on rather than the one asked
 * for. Read against `data-placement` rather than against a side written here,
 * so this holds under happy-dom, where nothing is laid out and a bubble lands
 * wherever a box of no size fits.
 */
describe('the side a bubble landed on', () => {
  test('is named on the arrow and the bubble, and recorded on the host, and nowhere else', async () => {
    const host = await mount(
      `<div><button aria-describedby="tip" id="save">Save</button><helix-headless-tooltip content="Writes the file" for="save" id="tip" placement="bottom"></helix-headless-tooltip></div>`,
    )
    const tip = host.querySelector('helix-headless-tooltip') as Tip
    await tip.updateComplete
    expect(named(tip)).toEqual({ arrow: [], bubble: [], state: [] })
    tip.show()
    await placed(tip)
    const side = landed(tip)
    expect(SIDES).toContain(side as (typeof SIDES)[number])
    expect(named(tip)).toEqual({ arrow: [side], bubble: [side], state: [side] })
    /* The plain names stay beside them, which is what every sheet that does
       not care about the side selects. */
    expect(part(tip, 'arrow')?.getAttribute('part')).toBe(`arrow arrow-${side}`)
    expect(part(tip, 'tooltip')?.getAttribute('part')).toBe(`tooltip tooltip-${side}`)
  })

  test('and moves with it', async () => {
    const host = await mount(
      `<div><button aria-describedby="tip" id="save">Save</button><helix-headless-tooltip content="Writes the file" for="save" id="tip" placement="bottom"></helix-headless-tooltip></div>`,
    )
    const tip = host.querySelector('helix-headless-tooltip') as Tip
    await tip.updateComplete
    tip.show()
    await placed(tip)
    const first = landed(tip)
    tip.placement = first === 'right' ? 'bottom' : 'right'
    await tip.updateComplete
    tip.reposition()
    await placed(tip)
    const second = landed(tip)
    expect(second).not.toBe(first)
    expect(named(tip)).toEqual({ arrow: [second], bubble: [second], state: [second] })
  })
})

/**
 * The preview's own sheet, with its trigger at the top of the window.
 *
 * **The case that shipped broken.** The bubble asks for `top`, has no room
 * there, and flips below; the sheet pinned the arrow to the bottom edge for
 * the placement it asked for, so the point hung off the far side and pointed
 * away from the trigger. The sheet draws the arrow's shape and no edge now,
 * and the controller puts it on the edge facing the trigger.
 *
 * Browser-only because it is geometry. The direction goes on the root, since
 * the bubble is in the top layer and laid out against the viewport.
 */
if (hasLayout()) {
  describe('a bubble flipped below its trigger by the top of the window', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    for (const direction of ['ltr', 'rtl']) {
      test(`points up at it from the middle of its top edge, ${direction}`, async () => {
        document.documentElement.dir = direction
        await example(preview, sheet)
        const tip = document.querySelector('helix-headless-tooltip') as Tip
        const trigger = document.getElementById('save') as HTMLElement
        expect(trigger.getBoundingClientRect().top).toBeLessThan(24)
        tip.show()
        await idle()
        const bubble = (part(tip, 'tooltip') as HTMLElement).getBoundingClientRect()
        const arrow = (part(tip, 'arrow') as HTMLElement).getBoundingClientRect()
        const anchor = trigger.getBoundingClientRect()
        expect(landed(tip)).toBe('bottom')
        expect(part(tip, 'arrow')?.getAttribute('part')).toBe('arrow arrow-bottom')
        expect(bubble.top).toBeGreaterThanOrEqual(anchor.bottom)
        expect(Math.abs(arrow.top + arrow.height / 2 - bubble.top)).toBeLessThanOrEqual(1)
        expect(
          Math.abs(arrow.left + arrow.width / 2 - (anchor.left + anchor.width / 2)),
        ).toBeLessThanOrEqual(1)
      })
    }
  })
}
