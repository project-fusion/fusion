import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Carousel = HTMLElement & {
  index: number
  loop: boolean
  updateComplete: Promise<unknown>
  internals?: ElementInternals
}

const carousel = async (attrs = ''): Promise<Carousel> =>
  (await mount(`<helix-carousel label="Verticals" ${attrs}>
    <div>Design</div>
    <div>Mind</div>
    <div>Energy</div>
  </helix-carousel>`)) as Carousel

/* The room the scroller keeps for whatever a slide draws outside itself, which is a length this tier sets.

   The behaviour is the base element's and is tested there. */
if (hasLayout()) {
  describe('the bleed the scroller keeps for a slide’s own edge', () => {
    const wide = async (): Promise<HTMLElement> => {
      const host = (await mount(`<helix-carousel label="Shots" per-view="2">
        <div style="inline-size: 12rem">One</div>
        <div style="inline-size: 12rem">Two</div>
        <div style="inline-size: 12rem">Three</div>
        <div style="inline-size: 12rem">Four</div>
      </helix-carousel>`)) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      return host
    }

    const bleedOf = (track: HTMLElement): number =>
      Number.parseFloat(getComputedStyle(track).paddingLeft)

    test('the leading slide is inset by it at rest, not shaved by the clip edge', async () => {
      /* The fault this is here for. A snap position aligns a slide to the
         snapport, and with no `scroll-padding` that is the padding box, so the
         leading slide snapped its own edge onto the edge the scroller clips at:
         the track rested at `scrollLeft: 4` against a 4px bleed and the first
         card was shaved with nobody having scrolled anything. */
      const host = await wide()
      const track = part(host, 'track') as HTMLElement
      const bleed = bleedOf(track)
      expect(bleed).toBeGreaterThan(0)
      expect(track.scrollLeft).toBe(0)
      const room =
        host.children[0].getBoundingClientRect().left - track.getBoundingClientRect().left
      expect(Math.round(room)).toBe(Math.round(bleed))
    })

    test('and the trailing slide keeps it with the track run to its end', async () => {
      const host = await wide()
      const track = part(host, 'track') as HTMLElement
      track.scrollTo({ behavior: 'instant', left: track.scrollWidth })
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const last = host.children[host.children.length - 1].getBoundingClientRect()
      const room = track.getBoundingClientRect().right - last.right
      expect(Math.round(room)).toBe(Math.round(bleedOf(track)))
    })

    test('the bleed clears the shadow a slide is likely to carry', async () => {
      // `--helix-shadow-md` is `0 4px 12px`, so it reaches 16px below the box
      // it is on, which is the number the default is cut to.
      const host = await wide()
      const track = part(host, 'track') as HTMLElement
      expect(bleedOf(track)).toBeGreaterThanOrEqual(16)
    })
  })
}
