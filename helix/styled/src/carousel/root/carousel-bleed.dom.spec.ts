import { beforeAll, describe, expect, test } from 'bun:test'
import { at, hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The room the scroller keeps for whatever a slide draws outside itself, which is a length this tier sets.

   The behavior is the headless element's and is tested there. */
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
        at(host.children, 0).getBoundingClientRect().left - track.getBoundingClientRect().left
      expect(Math.round(room)).toBe(Math.round(bleed))
    })

    test('and the trailing slide keeps it with the track run to its end', async () => {
      const host = await wide()
      const track = part(host, 'track') as HTMLElement
      track.scrollTo({ behavior: 'instant', left: track.scrollWidth })
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const last = at(host.children, host.children.length - 1).getBoundingClientRect()
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

    /* **A turned track keeps it on the side it now scrolls on**, which is the
       same fault the two tests above are for, arrived at on the other axis. A
       vertical track snaps on the block axis, so with no `scroll-padding-block`
       the leading pane snapped its own edge onto the clip edge: measured at a
       resting `scrollTop` of 16 against 16px of block padding, the room spent
       and the component's own arithmetic, which asks for 0 there, 16 out of
       step with where the scroller actually came to rest. */
    const tall = async (): Promise<HTMLElement> => {
      const host = (await mount(`<helix-carousel label="Shots" orientation="vertical"
        style="--carousel-block-size: 9rem">
        <div>One</div><div>Two</div><div>Three</div>
      </helix-carousel>`)) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      return host
    }

    test('a vertical track keeps its room on the axis it scrolls on', async () => {
      const host = await tall()
      const track = part(host, 'track') as HTMLElement
      const bleed = Number.parseFloat(getComputedStyle(track).paddingTop)
      expect(bleed).toBeGreaterThan(0)
      expect(track.scrollTop).toBe(0)
      const room =
        at(host.children, 0).getBoundingClientRect().top - track.getBoundingClientRect().top
      expect(Math.round(room)).toBe(Math.round(bleed))
    })

    test('and the room turns with it, so a raised bleed is room where it clips', async () => {
      /* One length for all four sides only while nobody sets the hook, and the
         hook exists to be set: a slide on `--helix-shadow-lg` reaches 44px. */
      const host = await tall()
      host.style.setProperty('--carousel-bleed', '44px')
      await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
      const track = part(host, 'track') as HTMLElement
      expect(Number.parseFloat(getComputedStyle(track).paddingTop)).toBe(44)
      expect(Number.parseFloat(getComputedStyle(track).scrollPaddingTop)).toBe(44)
    })
  })
}
