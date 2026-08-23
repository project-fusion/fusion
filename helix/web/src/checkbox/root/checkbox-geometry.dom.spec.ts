import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Checkbox = HTMLElement & {
  checked: boolean
  checked: boolean | undefined
  indeterminate: boolean
  updateComplete: Promise<unknown>
}

const _checkbox = async (attrs = ''): Promise<Checkbox> =>
  (await mount(`<helix-checkbox ${attrs}>Terms</helix-checkbox>`)) as Checkbox

const _control = (box: Checkbox): HTMLInputElement => part(box, 'control') as HTMLInputElement

/* Where the box, its mark and its message sit, which is this tier's arrangement.

   The behaviour is the base element's and is tested there. */
if (hasLayout()) {
  describe('checkbox geometry', () => {
    test('an unlabelled box carries no gap after it', async () => {
      /* The row is a flex line with a gap in it, so a label span rendered empty
         is still a box and still takes that gap. Measured at eight pixels of
         nothing after the box, which is what this is for.

         Only a browser can answer it: `slotchange` is what decides, and it does
         not fire without a real slot assignment. */
      /* Both in one mount, because `mount` replaces the body: measured
         separately, the first was detached by the time it was read, and a
         detached element reports zero for everything. Which the spec caught,
         by asking the box to be wider than nothing before comparing it. */
      const bare = (await mount(
        '<helix-checkbox></helix-checkbox><helix-checkbox label="Accept"></helix-checkbox>',
      )) as HTMLElement
      const labelled = bare.nextElementSibling as HTMLElement
      await (labelled as Updatable).updateComplete

      const rowOf = (host: HTMLElement): number =>
        (part(host, 'field') as HTMLElement).getBoundingClientRect().width
      const boxOf = (host: HTMLElement): number =>
        (part(host, 'control') as HTMLElement).getBoundingClientRect().width

      expect(boxOf(bare)).toBeGreaterThan(0)
      // The row is the box and nothing else, to within a subpixel.
      expect(Math.abs(rowOf(bare) - boxOf(bare))).toBeLessThan(1)
      // And a labelled one is wider, so the collapse is not hiding real labels.
      expect(rowOf(labelled)).toBeGreaterThan(rowOf(bare))
    })

    test('slotted words keep the room, with no property set', async () => {
      // The case gating on the property would have broken: a checkbox named by
      // its own content, which is how every checkbox was written before `label`.
      const host = await mount('<helix-checkbox>Accept</helix-checkbox>')
      expect(host.hasAttribute('data-has-label')).toBe(true)
      expect(getComputedStyle(part(host, 'label') as HTMLElement).display).not.toBe('none')
    })

    test('an invalid box is wrong at its own edge, not ringed outside it', async () => {
      /* It was a ring, offset outside the box, and the picture was a red square
         with a rounded gray box sitting inside it: a box inside a box rather
         than a box that is wrong. A ring is right where a component has no edge
         of its own to color, which stopped being true when this stopped
         letting the browser paint it. */
      const host = (await mount(
        '<helix-checkbox label="Accept" name="t" required></helix-checkbox>',
      )) as Updatable
      host.dispatchEvent(new Event('invalid'))
      while ((await host.updateComplete) === false) {
        // Validity moves outside the property system, so this takes two passes.
      }
      const box = getComputedStyle(part(host, 'control') as HTMLElement)
      const message = getComputedStyle(part(host, 'feedback') as HTMLElement)

      expect(box.borderTopColor).toBe(message.color)
      expect(box.outlineStyle).toBe('none')
    })

    test('the mark keeps its stencil the whole way out', async () => {
      /* The flash. `mask-image` does not animate, so it snapped to `none` the
         instant `data-checked` went, while `scale` still had its transition to
         run: for that whole duration the mark was an unmasked white square at
         full size, shrinking to nothing. Measured mid-uncheck, which is the
         only moment it exists, and is why nothing else caught it.

         Asserted at the moment of leaving rather than at either end, because
         both ends were always right. */
      const host = (await mount(
        '<helix-checkbox label="A" default-checked></helix-checkbox>',
      )) as Updatable & { checked: boolean }
      const mark = part(host, 'mark') as HTMLElement
      expect(getComputedStyle(mark).maskImage).not.toBe('none')

      host.checked = false
      await host.updateComplete
      expect(getComputedStyle(mark).scale).toBe('1')
      expect(getComputedStyle(mark).maskImage).not.toBe('none')
    })

    test('the mark scales in and out rather than appearing', async () => {
      /* Finished rather than awaited, for the reason the toggle group's specs
         finish theirs: a transition in a document the browser is not painting
         is started and never advanced, so waiting on it hangs. What is asserted
         is that a transition exists on the way in and on the way out, and where
         it ends up, which is the whole of the behavior. */
      const host = (await mount('<helix-checkbox label="A"></helix-checkbox>')) as Updatable & {
        checked: boolean
      }
      const mark = part(host, 'mark') as HTMLElement
      expect(getComputedStyle(mark).scale).toBe('0')

      host.checked = true
      await host.updateComplete
      expect(mark.getAnimations().map((a) => a.transitionProperty)).toContain('scale')
      for (const moving of mark.getAnimations()) {
        moving.finish()
      }
      expect(getComputedStyle(mark).scale).toBe('1')

      host.checked = false
      await host.updateComplete
      expect(mark.getAnimations().map((a) => a.transitionProperty)).toContain('scale')
      for (const moving of mark.getAnimations()) {
        moving.finish()
      }
      expect(getComputedStyle(mark).scale).toBe('0')
    })
  })
}
