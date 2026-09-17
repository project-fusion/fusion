import { beforeAll, describe, expect, test } from 'bun:test'
import { label, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** What the host says names it, which is the heading and not a string. */
const naming = (host: HTMLElement): Element | undefined =>
  (host as unknown as { internals: ElementInternals }).internals.ariaLabelledByElements?.[0]

/** Whether the heading this drew is the thing the host says names it. */
const namedByItsHeading = (host: HTMLElement): boolean => {
  const heading = part(host, 'label')
  return heading !== null && naming(host) === heading
}

/**
 * What the consumer put in the heading slot, read off the slot.
 *
 * Never the heading's `textContent`, which walks the shadow tree: an assigned
 * node stays in the light DOM, so the part reports its fallback whatever was
 * put into it. `Option` records the same trap about its own label.
 */
const slotted = (host: HTMLElement): Node | undefined =>
  (part(host, 'label') as HTMLElement | null)?.querySelector('slot')?.assignedNodes().at(0)

/**
 * A run of options under a heading, and the part's own contract.
 *
 * **Thin on purpose, and asserting what only this element answers for.** The
 * options inside it are exercised by the listbox and the combobox that own
 * them, which is the arrangement that means anything for a child element: what
 * is left over is the group's own job, which is to name a run so a screen
 * reader can say which one it is reading.
 *
 * Copying the parent's assertions into a second file would prove nothing the
 * first did not.
 */
describe('a group of options', () => {
  test('is a group, named by its label, so a reader is told which run this is', async () => {
    const host = await mount(
      '<helix-headless-option-group label="Recent"></helix-headless-option-group>',
    )
    expect(role(host)).toBe('group')
    expect(label(host)).toBe('Recent')
  })

  /* The heading is drawn and is `aria-hidden`, because the name is already on
     the host: read out again it would announce the run twice. */
  test('draws its heading without announcing it a second time', async () => {
    const host = await mount(
      '<helix-headless-option-group label="Recent"></helix-headless-option-group>',
    )
    const label = part(host, 'label') as HTMLElement
    expect(label.textContent?.trim()).toBe('Recent')
    expect(label.getAttribute('aria-hidden')).toBe('true')
  })

  /* A slotted label wins over the string, which is the point of having both:
     the property is the common case and the slot is for a heading that needs
     more than text.

     **Asserted on the name and not on the light DOM.** Reading `[slot="label"]`
     back out of the host reports what the consumer wrote whatever this element
     did with it, so the old assertion held with the slot going nowhere: what it
     proved was that a `<b>` still says "Rich". */
  test('takes a slotted label over the string', async () => {
    const host = await mount(
      '<helix-headless-option-group label="Plain"><b slot="label">Rich</b></helix-headless-option-group>',
    )
    expect(role(host)).toBe('group')
    expect(namedByItsHeading(host)).toBe(true)
    expect(slotted(host)?.textContent).toBe('Rich')
  })

  /* The case the string never covered. A consumer who takes the slot and
     writes no `label` had a run with no accessible name at all, and the
     heading they wrote carries `aria-hidden`, so the words were the one thing
     a screen reader could not reach. */
  test('and names the run by its heading where that is the only heading there is', async () => {
    const host = await mount(
      '<helix-headless-option-group><b slot="label">Recent</b></helix-headless-option-group>',
    )
    expect(role(host)).toBe('group')
    expect(label(host)).toBeNull()
    expect(namedByItsHeading(host)).toBe(true)
    expect(slotted(host)?.textContent).toBe('Recent')
  })

  /* The options themselves land in the run rather than beside it, which is the
     one structural promise this element makes to whatever renders into it. */
  test('holds its options in the run it draws', async () => {
    const host = await mount(
      `<helix-headless-option-group label="Recent">
        <helix-headless-option value="a">A</helix-headless-option>
        <helix-headless-option value="b">B</helix-headless-option>
      </helix-headless-option-group>`,
    )
    expect(part(host, 'items')).not.toBeNull()
    expect(host.querySelectorAll('helix-headless-option').length).toBe(2)
  })
})
