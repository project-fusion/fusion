import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('option', () => {
  test('is an option, which is what an owning listbox needs it to be', async () => {
    const host = (await mount('<helix-option value="a">Alpha</helix-option>')) as HTMLElement & {
      internals: ElementInternals
    }
    expect(host.internals.role).toBe('option')
  })

  test('announces rather than selecting itself', async () => {
    /* An option that selected itself would be a second answer to which one is
       chosen, and the two would disagree the first time a listener refused. */
    const host = (await mount('<helix-option value="a">Alpha</helix-option>')) as HTMLElement & {
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
      '<helix-option disabled value="a">Alpha</helix-option>',
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
    const host = (await mount('<helix-option value="a"> Alpha </helix-option>')) as HTMLElement & {
      text: string
    }
    /* Asserted through the slot rather than the label's `textContent`, which
       walks the DOM tree: assigned nodes stay in the light DOM, so a slot
       reports its fallback and never what was put into it. */
    expect(host.text).toBe('Alpha')
    const slot = (part(host, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(slot.assignedNodes()[0]?.textContent?.trim()).toBe('Alpha')
  })
})
