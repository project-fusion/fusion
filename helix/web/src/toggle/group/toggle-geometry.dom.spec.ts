import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  mount,
  part,
  registerDom,
  role,
  type Updatable,
} from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-toggle-group label="Color mode" default-value="light">
  <helix-toggle value="system">System</helix-toggle>
  <helix-toggle value="light">Light</helix-toggle>
  <helix-toggle value="dark">Dark</helix-toggle>
</helix-toggle-group>`

const items = (group: HTMLElement) =>
  [...group.querySelectorAll('helix-toggle')] as (HTMLElement & {
    selected: boolean
    value: string
  })[]

/* Where the thumb lands and how it is inset, which is this tier's drawing. The
   base tier has no thumb to place, so the numbers there are the box's own and
   mean nothing. Selection, the form value and the keyboard stay on the base. */
if (hasLayout()) {
  describe('toggle group geometry', () => {
    /* The indicator is placed from a measurement and slides there, so the box it
       reports mid-flight is not the box it rests at.
 
       Ended rather than waited out. A sleep long enough to be safe went over the
       runner's two second budget, and one short enough to fit would pass only on
       a fast machine. Awaiting `finished` was worse in a way worth writing down:
       a transition in a document the browser is not painting is started and then
       never advanced, so the promise never settles and both specs hung. That is
       every backgrounded tab, not a quirk of one. `finish()` puts the transition
       at its end state synchronously and asks nothing of the timeline, so this
       reads the same geometry whether or not anyone is looking at it. */
    const settle = async (group: Updatable): Promise<void> => {
      await group.updateComplete
      for (const moving of (part(group, 'indicator') as HTMLElement).getAnimations()) {
        moving.finish()
      }
    }

    test('the thumb sits exactly on the segment it marks', async () => {
      const group = (await mount(markup)) as Updatable & { value: string }
      await settle(group)

      for (const value of ['system', 'light', 'dark']) {
        group.value = value
        await settle(group)

        const indicator = part(group, 'indicator') as HTMLElement
        const segment = group.querySelector(`helix-toggle[value="${value}"]`) as HTMLElement
        const marker = indicator.getBoundingClientRect()
        const target = segment.getBoundingClientRect()

        /* Before anything is compared, because every one of these compares two
           measurements and zero equals zero. An unlaid-out runner would pass all
           four while measuring nothing at all, which it did: this suite was
           green against a known misplacement until the frame was moved
           somewhere it gets laid out. */
        expect(target.width).toBeGreaterThan(0)
        expect(marker.width).toBeGreaterThan(0)

        expect(Math.abs(marker.left - target.left)).toBeLessThan(1)
        expect(Math.abs(marker.top - target.top)).toBeLessThan(1)
        expect(Math.abs(marker.width - target.width)).toBeLessThan(1)
        expect(Math.abs(marker.height - target.height)).toBeLessThan(1)
      }
    })

    test('the thumb is inset evenly on every side of the track', async () => {
      // Even gaps are the whole job of a thing sitting in a groove, and the
      // asymmetry this catches reads as "the spacing is off" rather than as a
      // misplacement, which is why it survived being looked at.
      const group = (await mount(markup)) as Updatable & { value: string }
      group.value = 'system'
      await settle(group)

      /* The track, not the host. The host is the whole stack now, a label and a
         hint included, so its box has not been the groove's box since the field
         parts landed. Measured against the host this asserted the inset from
         the top of a label, which is not a fact about anything. */
      const track = (part(group, 'track') as HTMLElement).getBoundingClientRect()
      expect(track.width).toBeGreaterThan(0)
      const marker = (part(group, 'indicator') as HTMLElement).getBoundingClientRect()
      const above = marker.top - track.top
      const below = track.bottom - marker.bottom
      const before = marker.left - track.left

      expect(Math.abs(above - below)).toBeLessThan(1)
      expect(Math.abs(above - before)).toBeLessThan(1)
    })
  })
}
