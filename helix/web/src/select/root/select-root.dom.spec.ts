import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  mount,
  part,
  registerDom,
  type Updatable,
} from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const settle = async (host: Updatable): Promise<void> => {
  while ((await host.updateComplete) === false) {
    // Validity and slot assignment both move outside the property system.
  }
}

const select = async (extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-select label="L" name="c" ${extra}>
    <helix-option value="one">Alpha</helix-option>
    <helix-option value="two">Beta</helix-option>
  </helix-select>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

const trigger = (host: Updatable): HTMLElement =>
  part(host as HTMLElement, 'trigger') as HTMLElement
const shown = (host: Updatable): string =>
  (part(host as HTMLElement, 'value') as HTMLElement).textContent?.trim() ?? ''

describe('select', () => {
  test('the options reach the listbox through the slot', async () => {
    /* The fault the three-family split was for. The options are the consumer's
       light DOM, slotted into a listbox in this component's shadow root, so
       from the listbox's side its only child is a slot: a plain
       `querySelectorAll` finds the slot and no options, and the whole thing
       comes up empty. */
    const host = await select()
    const listbox = part(host as HTMLElement, 'listbox') as HTMLElement & {
      options: HTMLElement[]
    }
    expect(listbox.options.length).toBe(2)
  })

  test('nothing chosen shows the placeholder', async () => {
    const host = await select('placeholder="Pick one"')
    expect(shown(host)).toBe('Pick one')
  })

  test('the trigger says whether the list is open', async () => {
    const host = await select()
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false')
    ;(host as Updatable & { open: boolean }).open = true
    await settle(host)
    expect(trigger(host).getAttribute('aria-expanded')).toBe('true')
  })

  test('the answer is the select own, and is what the form submits', async () => {
    // The listbox is the thing being operated, not a second place the answer
    // lives.
    const host = await select('value="one"')
    expect(formValue(host)).toBe('one')
  })

  test('required says so in its own words once asked', async () => {
    const host = await select('required')
    expect(part(host as HTMLElement, 'feedback')).toBeNull()

    host.dispatchEvent(new Event('invalid'))
    await settle(host)
    expect((part(host as HTMLElement, 'feedback') as HTMLElement).textContent?.trim()).toBe(
      'Choose one to continue.',
    )
  })

  test('the inner list is named by the label, not labelled with it', async () => {
    /* The select already shows the words above its trigger, so the listbox
       inside the panel rendering them again put a heading in the dropdown.
       It still needs the name, which is why this is `hide-label` and not a
       dropped attribute: clipped, still read, still the list's own name. */
    const host = (await select()) as unknown as HTMLElement
    const listbox = part(host, 'listbox')
    expect(listbox?.getAttribute('label')).toBe('L')
    expect(listbox?.hasAttribute('hide-label')).toBe(true)
  })
})

if (hasLayout()) {
  test('the panel is placed rather than left where the stylesheet put it', async () => {
    // The controller was constructed and never started, which is invisible in
    // review: the field renders, the list opens, and the panel simply sits at
    // the host's own top-left, over the label and above the trigger. What says
    // it ran is `position: fixed`, which the controller writes inline and the
    // stylesheet does not: the sheet says `absolute`.
    const host = (await select('open')) as unknown as HTMLElement
    expect((part(host, 'surface') as HTMLElement).style.position).toBe('fixed')
  })

  test('the panel takes the trigger"s width, and the content is its floor', async () => {
    /* Two rules in one declaration, and the second is what stops a long option
       from wrapping to fit a field it has no relationship to. The panel has no
       inline padding of its own, so its width is the rows" width exactly. */
    const host = (await select('open')) as unknown as HTMLElement
    const surface = part(host, 'surface') as HTMLElement
    const trigger = part(host, 'trigger') as HTMLElement
    const style = getComputedStyle(surface)
    expect(style.minInlineSize).toBe('max-content')
    expect(style.paddingInline).toBe('0px')
    expect(surface.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      trigger.getBoundingClientRect().width,
    )
  })

  test('the panel is told how wide its trigger is, because CSS cannot ask', async () => {
    // `min-inline-size: 100%` on a `position: fixed` panel is the viewport, so
    // the list came out the full width of the window. The controller publishes
    // the anchor's width and the stylesheet reads that instead.
    const host = (await select('open')) as unknown as HTMLElement
    const surface = part(host, 'surface') as HTMLElement
    expect(surface.style.getPropertyValue('--floating-anchor-width')).toMatch(/^\d+px$/)
  })

  describe('select trigger text', () => {
    /* Only in a browser, and not for layout: what these need is slot
       flattening across two roots. The options are the select's light DOM,
       assigned to a slot that is itself inside a listbox in the select's shadow
       root, and `assignedElements({ flatten: true })` does not resolve that
       chain in happy-dom. `hasLayout` is standing in for "a real engine",
       which is the same thing being asked for. */
    test('the trigger says what is chosen, once the options have arrived', async () => {
      /* Read off the options rather than stored, because the words are the
         consumer's content and a copy goes stale. Which is why it waits: on the
         first render the slot is not assigned, so a select with a value came up
         showing its placeholder. */
      const host = await select('value="two"')
      expect(shown(host)).toBe('Beta')
    })

    test('several chosen are read out together', async () => {
      const host = await select('multiple value="one,two"')
      expect(shown(host)).toBe('Alpha, Beta')
    })
  })
}
