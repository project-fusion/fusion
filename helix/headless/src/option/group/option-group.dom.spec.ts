import { beforeAll, describe, expect, test } from 'bun:test'
import { label, mount, part, registerDom, role } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

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
 * first did not, and 198 records that as the shape to avoid.
 */
describe('a group of options', () => {
  test('is a group, named by its label, so a reader is told which run this is', async () => {
    const host = await mount('<helix-base-option-group label="Recent"></helix-base-option-group>')
    expect(role(host)).toBe('group')
    expect(label(host)).toBe('Recent')
  })

  /* The heading is drawn and is `aria-hidden`, because the name is already on
     the host: read out again it would announce the run twice. */
  test('draws its heading without announcing it a second time', async () => {
    const host = await mount('<helix-base-option-group label="Recent"></helix-base-option-group>')
    const label = part(host, 'label') as HTMLElement
    expect(label.textContent?.trim()).toBe('Recent')
    expect(label.getAttribute('aria-hidden')).toBe('true')
  })

  /* A slotted label wins over the string, which is the point of having both:
     the property is the common case and the slot is for a heading that needs
     more than text. */
  test('takes a slotted label over the string', async () => {
    const host = await mount(
      '<helix-base-option-group label="Plain"><b slot="label">Rich</b></helix-base-option-group>',
    )
    const slotted = host.querySelector('[slot="label"]')
    expect(slotted?.textContent).toBe('Rich')
    expect(role(host)).toBe('group')
  })

  /* The options themselves land in the run rather than beside it, which is the
     one structural promise this element makes to whatever renders into it. */
  test('holds its options in the run it draws', async () => {
    const host = await mount(
      `<helix-base-option-group label="Recent">
        <helix-base-option value="a">A</helix-base-option>
        <helix-base-option value="b">B</helix-base-option>
      </helix-base-option-group>`,
    )
    expect(part(host, 'items')).not.toBeNull()
    expect(host.querySelectorAll('helix-base-option').length).toBe(2)
  })
})
