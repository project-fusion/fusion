import { beforeAll, describe, expect, test } from 'bun:test'
import { at, hasLayout, idle, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Carousel = HTMLElement & {
  index: number
  positions: number
  updateComplete: Promise<unknown>
}

/* What `per-view="auto"` comes to, measured on the boxes rather than read off
   the declaration.

   Here rather than beside the headless element, because the whole of what is
   under test is a width, and a width on that tier is whatever sheet a consumer
   wrote: with none, every pane is the track's width and the arithmetic is never
   asked. The sheet under test is this one.

   **The dots are the part that had to be settled.** They count from a number
   the box resolved to, which nothing knows until there is a box, so what is
   asserted below is that the count they arrive at is the count the panes were
   laid out at, and that they arrive at it once. */
if (hasLayout()) {
  describe('a carousel fitting what it can hold', () => {
    const shelf = async (width: number, slides = 8): Promise<Carousel> => {
      const items = Array.from({ length: slides }, (_, at) => `<div>${at + 1}</div>`).join('')
      const host = (await mount(
        `<helix-carousel label="Shelf" per-view="auto"
          style="inline-size: ${width}px; --carousel-slide-min: 200px">${items}</helix-carousel>`,
      )) as Carousel
      await idle()
      return host
    }

    /** The room the panes are laid out in, and the gap between a pair of them. */
    const box = (host: Carousel): { gap: number; room: number } => {
      const track = part(host, 'track') as HTMLElement
      const style = getComputedStyle(track)
      return {
        gap: Number.parseFloat(style.columnGap),
        room:
          track.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight),
      }
    }

    const dots = (host: Carousel): number =>
      part(host, 'indicators')?.querySelectorAll('[part~="indicator"]').length ?? 0

    /* **The run is never wrong before it is right**, which is the part of this
       that had to be settled rather than discovered. `mount` resolves on the
       update that drew the panes, which is before any layout has been observed,
       and there are no dots there to be a guess; the count arrives with the
       reading and is the count it keeps. Recorded from the upgrade on, in
       Chromium and WebKit both, a fitted run goes none and then five and never
       another number. */
    test('draws no run of dots before it has one to draw', async () => {
      const items = Array.from({ length: 8 }, (_, at) => `<div>${at + 1}</div>`).join('')
      const host = (await mount(
        `<helix-carousel label="Shelf" per-view="auto"
          style="inline-size: 900px; --carousel-slide-min: 200px">${items}</helix-carousel>`,
      )) as Carousel
      expect(part(host, 'indicators')).toBe(null)
      await idle()
      expect(dots(host)).toBe(5)
    })

    /* The count is the sheet's under `auto`, declared on the track under the
       same name a declared count is written onto it with, so everything that
       divides by it reads one name in both modes. The component writes nothing
       there: an inline declaration would outrank the rule that fits it. */
    test('the sheet declares the count and the component hands over none', async () => {
      const track = part(await shelf(692), 'track') as HTMLElement
      expect(getComputedStyle(track).getPropertyValue('--carousel-per-view')).toContain('round(')
      expect(track.style.getPropertyValue('--carousel-per-view')).toBe('')
    })

    /* A vertical track's room is a height the consumer chose, so `auto` reads
       as one across there and is written on as any other count is. The sheet
       does not answer for that axis either, or a width and a count would
       disagree. */
    test('a vertical track is one across, in both places', async () => {
      const host = (await mount(
        `<helix-carousel label="Shelf" per-view="auto" orientation="vertical"
          style="inline-size: 692px; --carousel-slide-min: 200px"><div>1</div><div>2</div></helix-carousel>`,
      )) as Carousel
      await idle()
      const track = part(host, 'track') as HTMLElement
      expect(track.style.getPropertyValue('--carousel-per-view')).toBe('1')
      expect(getComputedStyle(track).getPropertyValue('--carousel-per-view').trim()).toBe('1')
      expect(host.positions).toBe(2)
    })

    /* 200px slides on a 16px gap: a gap belongs to every pane but the last, so
       the room and one more gap divided by a pane and a gap is how many fit.
       308 of room takes one, 660 takes three, 1249 takes five. */
    for (const [width, across] of [
      [340, 1],
      [692, 3],
      [1281, 5],
    ] as const) {
      test(`lays ${across} out across a track of ${width}`, async () => {
        const host = await shelf(width)
        const { gap, room } = box(host)
        const pane = at(host.children, 0).getBoundingClientRect().width
        expect(pane).toBeCloseTo((room - (across - 1) * gap) / across, 0)
      })

      test(`and counts the ${9 - across} positions that leaves`, async () => {
        const host = await shelf(width)
        expect(host.positions).toBe(9 - across)
        expect(dots(host)).toBe(9 - across)
      })
    }

    /* Fitting what it can hold is two claims, and this is the second: a track
       with room for five and three cards in it fills itself rather than laying
       three narrow panes out and leaving the rest of the row empty. */
    test('a track holding fewer than it fits divides itself between them', async () => {
      const host = await shelf(1281, 3)
      const { gap, room } = box(host)
      expect(at(host.children, 0).getBoundingClientRect().width).toBeCloseTo(
        (room - 2 * gap) / 3,
        0,
      )
      expect(host.positions).toBe(1)
    })

    /* **A fitted carousel's last position moves with the window**, which a
       declared one's never does. Widened, the reader is left resting somewhere
       the track can no longer be, so the index comes back inside what the new
       count leaves. Nobody asked for that move, so it is written with no
       `helix-select`: a request a consumer could refuse would leave the index
       past the last place. */
    test('widening the track brings the index back inside what it leaves', async () => {
      const host = await shelf(340)
      const heard: string[] = []
      host.addEventListener('helix-select', () => heard.push('helix-select'))
      host.index = 7
      await host.updateComplete
      host.style.inlineSize = '1281px'
      await idle()
      expect(host.positions).toBe(4)
      expect(host.index).toBe(3)
      expect(heard).toEqual([])
    })

    /* The other direction needs nothing said: a narrower track has more places
       to stand, not fewer, so wherever the reader was is still somewhere. */
    test('and narrowing it leaves the reader where they were', async () => {
      const host = await shelf(1281)
      host.index = 2
      await host.updateComplete
      host.style.inlineSize = '692px'
      await idle()
      expect(host.positions).toBe(6)
      expect(host.index).toBe(2)
    })
  })
}
