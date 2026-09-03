import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('option', () => {
  test('is an option, which is what an owning listbox needs it to be', async () => {
    const host = (await mount(
      '<helix-headless-option value="a">Alpha</helix-headless-option>',
    )) as HTMLElement & {
      internals: ElementInternals
    }
    expect(host.internals.role).toBe('option')
  })

  test('announces rather than selecting itself', async () => {
    /* An option that selected itself would be a second answer to which one is
       chosen, and the two would disagree the first time a listener refused. */
    const host = (await mount(
      '<helix-headless-option value="a">Alpha</helix-headless-option>',
    )) as HTMLElement & {
      select: () => void
      selected: boolean
    }
    let announced = ''
    host.addEventListener('helix-select', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    host.select()
    expect(announced).toBe('a')
    expect(host.selected).toBe(false)
  })

  test('a disabled option announces nothing at all', async () => {
    const host = (await mount(
      '<helix-headless-option disabled value="a">Alpha</helix-headless-option>',
    )) as HTMLElement & { select: () => void }
    let announced = false
    host.addEventListener('helix-select', () => {
      announced = true
    })
    host.select()
    expect(announced).toBe(false)
  })

  test('its words are read from its content, not asked for twice', async () => {
    // Which is what a listbox matches a filter against. Asking for both a
    // property and the content is asking for two things to disagree.
    const host = (await mount(
      '<helix-headless-option value="a"> Alpha </helix-headless-option>',
    )) as HTMLElement & {
      text: string
    }
    /* Asserted through the slot rather than the label's `textContent`, which
       walks the DOM tree: assigned nodes stay in the light DOM, so a slot
       reports its fallback and never what was put into it. */
    expect(host.text).toBe('Alpha')
    const slot = (part(host, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(slot.assignedNodes()[0]?.textContent?.trim()).toBe('Alpha')
  })

  test('takes the default slot and leaves the other two alone', async () => {
    /* **Never read `this.textContent` for `text`.** It runs an icon in `start`
       or a shortcut in `end` onto the end of the words, and the failure is
       silent and wide: six things read `text`, the collapsed field of Select
       and of Combobox, the listbox filter, Combobox's exact match, its inline
       completion, and the tag it labels a chosen value with.

       Measured on a font picker whose options carried a two-letter specimen in
       `end`, the field read `Noto Sans Linear BAg` and typing `ag` matched
       1,892 of 1,893 rows. Nothing throws, and the filter looks like it works
       for every needle that happens not to occur in the slotted content. */
    const host = (await mount(
      `<helix-headless-option value="save">
         <span slot="start">icon</span>
         Save
         <span slot="end">Cmd S</span>
       </helix-headless-option>`,
    )) as HTMLElement & { text: string }

    expect(host.text).toBe('Save')
    expect(host.text).not.toContain('icon')
    expect(host.text).not.toContain('Cmd')
  })

  test('leaves a comment out, which is what Lit puts inside every option it renders', async () => {
    /* The filter admitted anything that was not an element, and a comment is
       not an element: `textContent` on one is the comment's own body. Every
       option rendered from a template carries a child-binding marker,
       `<!--?lit$1234$-->`, so `pagination/footer`'s trigger painted
       `?lit$090648746$25` where it meant `25`, on both of its twins.

       Worse than a wrong label, for the six readers listed above: the filter and
       Combobox's match compare against this string, so a marker in it is in
       every comparison. And the marker's digits change per render, which is what
       made that example's width move between loads and kept it out of
       `check:spec:visual-parity` for as long as the exclusion stood. */
    const host = (await mount(
      '<helix-headless-option value="25"><!--?lit$090648746$-->25</helix-headless-option>',
    )) as HTMLElement & { text: string }

    expect(host.text).toBe('25')
    expect(host.text).not.toContain('lit$')
  })
})
