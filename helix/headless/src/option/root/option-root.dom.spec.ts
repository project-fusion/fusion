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
    /* **The regression this exists for was silent and wide.** `text` read
       `this.textContent`, so an icon in `start` or a shortcut in `end` was run
       onto the end of the words. Six things read it: the collapsed field of
       Select and of Combobox, the listbox filter, Combobox's exact match, its
       inline completion, and the tag it labels a chosen value with.

       Measured on a font picker whose options carried a two-letter specimen in
       `end`, the field read `Noto Sans Linear BAg` and typing `ag` matched
       1,892 of 1,893 rows. Nothing threw, and the filter looked like it worked
       for every needle that happened not to occur in the slotted content. */
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
})
