import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* Where an avatar's initials sit. The line box was centered, and the capitals
   rode above the middle by the room it keeps for descenders: 1.25px high at a
   26px avatar in the system face. These measure the glyphs' own gaps to the
   circle, in a browser that trims, with `bun run specs:browser avatar`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const trims = hasLayout() && CSS.supports('text-box', 'trim-both cap alphabetic')
const geometry = trims ? test : (): void => {}

/**
 * Where the capitals are drawn: their top and their baseline, in the page.
 *
 * Read off the run of text and the face's own metrics, so the answer is the
 * glyphs' whether or not the box around them is trimmed. A text run's rect is
 * its content area: the face's ascent above the baseline and its descent below.
 */
const capitals = (element: Element): { bottom: number; top: number } => {
  const style = getComputedStyle(element)
  const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const metrics = context.measureText('H')
  const range = document.createRange()
  range.selectNodeContents(element)
  const run = range.getClientRects()[0] as DOMRect
  const baseline = run.top + metrics.fontBoundingBoxAscent
  return { bottom: baseline, top: baseline - metrics.actualBoundingBoxAscent }
}

const SIZES = [
  ['sm', 'size="sm"'],
  ['md', ''],
  ['lg', 'size="lg"'],
  ['26px', 'style="--avatar-size: 26px"'],
  ['64px', 'style="--avatar-size: 64px"'],
] as const

describe('the initials', () => {
  for (const [name, attributes] of SIZES) {
    geometry(
      `sit on the middle of a ${name} avatar, the same gap above the capitals as below`,
      async () => {
        const avatar = (await mount(
          `<helix-avatar name="Ada Hopper" ${attributes}></helix-avatar>`,
        )) as HTMLElement & Updatable
        await settle(avatar)
        await document.fonts.ready
        const circle = avatar.getBoundingClientRect()
        const letters = capitals(part(avatar, 'initials') as HTMLElement)
        const above = letters.top - circle.top
        const below = circle.bottom - letters.bottom
        /* A pixel, since layout and a canvas round the face's metrics their
           own ways. Before the trim, the md avatar was 2.8px off. */
        expect(Math.abs(above - below)).toBeLessThanOrEqual(1)
      },
    )
  }
})
