import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The dots over the slides, which the arrows could do and the dots could not.
   A hero put its controls on the picture and its indicators in a band beneath
   it, and nothing in either block said why the two differed.

   Measured rather than asserted about class names: what `overlay` means is that
   the run is inside the slide area and not in the row under it, which is a
   geometry question and reads the same whatever the rule is spelled. */
if (hasLayout()) {
  describe('the indicators over the slides', () => {
    const hero = async (placement: string): Promise<HTMLElement> => {
      /* A width, because the host mounts at zero otherwise and every rect
         collapses onto one point, where a geometry assertion is true of any
         arrangement at all. **Width only**: a `display` here overrides
         `:host { display: grid }`, every `grid-area` goes inert, and the run
         lands under the track whatever the rule says, which is a fixture
         reporting its own damage as the component's. */
      const host =
        (await mount(`<helix-carousel label="Highlights" indicator-placement="${placement}"
        style="inline-size: 480px">
        <div style="block-size: 200px; background: #333"></div>
        <div style="block-size: 200px; background: #666"></div>
      </helix-carousel>`)) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      return host
    }

    test('sit inside the slides rather than in the row beneath them', async () => {
      const rects = async (placement: string) => {
        const host = await hero(placement)
        const track = part(host, 'track') as HTMLElement
        const run = part(host, 'indicators') as HTMLElement
        return { run: run.getBoundingClientRect(), track: track.getBoundingClientRect() }
      }
      const over = await rects('overlay')
      const under = await rects('bottom')

      /* The track has real height, or neither assertion below means anything. */
      expect(over.track.height).toBeGreaterThan(100)

      expect(over.run.bottom).toBeLessThanOrEqual(over.track.bottom)
      expect(under.run.top).toBeGreaterThanOrEqual(under.track.bottom)
    })

    test('take a ground of their own, because a dot on a picture is half legible', async () => {
      /* The same measurement that put a surface under each arrow. One ground
         under the run and not one per dot: the dots are a single object whose
         gaps are too small to be edges. */
      const host = await hero('overlay')
      const run = part(host, 'indicators') as HTMLElement
      const ground = getComputedStyle(run).backgroundColor
      expect(ground).not.toBe('rgba(0, 0, 0, 0)')
      expect(getComputedStyle(run).boxShadow).not.toBe('none')
    })
  })
}
