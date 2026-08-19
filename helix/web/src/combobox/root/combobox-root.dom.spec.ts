import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, hasLayout, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

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

const combobox = async (extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-combobox label="L" name="c" ${extra}>
    <helix-option value="rs">Rust</helix-option>
    <helix-option value="rb">Ruby</helix-option>
    <helix-option value="go">Go</helix-option>
  </helix-combobox>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

const control = (host: Updatable): HTMLInputElement =>
  part(host as HTMLElement, 'control') as HTMLInputElement

const options = (host: Updatable): (HTMLElement & { active: boolean })[] =>
  [...(host as HTMLElement).querySelectorAll('helix-option')] as (HTMLElement & {
    active: boolean
  })[]

const shown = (host: Updatable): string[] =>
  options(host)
    .filter((option) => !option.hidden)
    .map((option) => option.textContent?.trim() ?? '')

const type = async (host: Updatable, text: string): Promise<void> => {
  const field = control(host)
  field.value = text
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await settle(host)
}

const press = async (host: Updatable, key: string): Promise<void> => {
  control(host).dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
  )
  await settle(host)
}

describe('combobox', () => {
  test('the options reach the listbox through the slot', async () => {
    /* The same fault the three-family split was for: the options are the
       consumer's light DOM slotted into a listbox in this shadow root, so from
       the listbox's side its only child is a slot. */
    const host = await combobox()
    const listbox = part(host as HTMLElement, 'listbox') as HTMLElement & { options: unknown[] }
    expect(listbox.options.length).toBe(3)
  })

  test('typing narrows the list without becoming the value', async () => {
    const host = await combobox()
    await type(host, 'ru')
    expect(shown(host)).toEqual(['Rust', 'Ruby'])
    expect((host as unknown as { value: string }).value).toBe('')
    expect(formValue(host as HTMLElement)).toBe(null)
  })

  test('the filter goes when the panel does', async () => {
    // A control reopened still narrowed by the last visit's search is one whose
    // second use starts from the first one's leftovers.
    const host = await combobox()
    await type(host, 'ru')
    await press(host, 'Escape')
    expect(shown(host)).toEqual(['Rust', 'Ruby', 'Go'])
    expect(control(host).value).toBe('')
  })

  test('choosing writes the value, shows the words, and shuts the panel', async () => {
    const host = await combobox()
    await type(host, 'go')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('go')
    expect(control(host).value).toBe('Go')
    expect((host as unknown as { open: boolean }).open).toBe(false)
  })

  test('the form is given the option, never the filter', async () => {
    /* The whole reason the component exists. A plain input would have submitted
       "ru", which is a search and not an answer. */
    const host = await combobox()
    await type(host, 'ru')
    await press(host, 'Enter')
    expect(formValue(host as HTMLElement)).toBe('rs')
  })

  test('the arrows move the list while the focus stays in the field', async () => {
    // Which is the whole of what a combobox is, and why the listbox has a
    // public `navigate` rather than this element moving the highlight itself.
    const host = await combobox()
    const field = control(host)
    field.focus()
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    expect(
      options(host)
        .find((option) => option.active)
        ?.textContent?.trim(),
    ).toBe('Ruby')
    expect((host as HTMLElement).shadowRoot?.activeElement).toBe(field)
  })

  test('the first Down opens the panel and lands on the first option', async () => {
    /* Both halves were wrong before, and both were the listbox's. Moving chose
       as it went, so one Down committed an option and shut the panel; and
       clearing the filter on close had already parked the highlight on the
       first option, so the Down that was meant to arrive at it started from it
       and reached the second. */
    const host = await combobox()
    expect(options(host).some((option) => option.active)).toBe(false)

    await press(host, 'ArrowDown')
    expect((host as unknown as { open: boolean }).open).toBe(true)
    expect(
      options(host)
        .find((option) => option.active)
        ?.textContent?.trim(),
    ).toBe('Rust')
    expect((host as unknown as { value: string }).value).toBe('')
  })

  test('a filter pre-highlights its top match, so Enter takes it', async () => {
    const host = await combobox()
    await type(host, 'ru')
    expect(
      options(host)
        .find((option) => option.active)
        ?.textContent?.trim(),
    ).toBe('Rust')
  })

  test('one choice is one change, under this element"s name', async () => {
    /* The listbox announces `helix-change` too, and a consumer listening here
       would otherwise hear two for one choice, one of them naming a control
       they never put on the page. */
    const host = await combobox()
    const heard: EventTarget[] = []
    host.addEventListener('helix-change', (event) => heard.push(event.target as EventTarget))
    await type(host, 'go')
    await press(host, 'Enter')
    expect(heard).toEqual([host as EventTarget])
  })

  test('required says so in its own words once asked', async () => {
    const host = await combobox('required')
    expect(part(host as HTMLElement, 'feedback')).toBeNull()

    host.dispatchEvent(new Event('invalid'))
    await settle(host)
    expect((part(host as HTMLElement, 'feedback') as HTMLElement).textContent?.trim()).toBe(
      'Choose one to continue.',
    )
  })

  test('the list is named by the label, not labelled with it', async () => {
    const host = await combobox()
    const listbox = part(host as HTMLElement, 'listbox') as HTMLElement
    expect(listbox.getAttribute('aria-label')).toBe('Options')
    expect(control(host).getAttribute('aria-controls')).toBe('listbox')
    expect(control(host).getAttribute('role')).toBe('combobox')
  })

  test('a disabled combobox does not open', async () => {
    const host = await combobox('disabled')
    control(host).dispatchEvent(new Event('click', { bubbles: true, composed: true }))
    await settle(host)
    expect((host as unknown as { open: boolean }).open).toBe(false)
    expect(control(host).disabled).toBe(true)
  })
})

if (hasLayout()) {
  describe('combobox in a browser', () => {
    /* Only in a browser, and not for layout: what this needs is slot flattening
       across two roots. The options are the combobox's light DOM, assigned to a
       slot that is itself inside a listbox in the combobox's shadow root, and
       `assignedElements({ flatten: true })` does not resolve that chain in
       happy-dom. Select's spec says the same, for the same reason. */
    test('the field shows the chosen option"s words, not its value', async () => {
      /* And it shows them on the first paint. The words are read off options
         that are not assigned yet when the element first renders, and slot
         assignment schedules no update of its own: a combobox with a value came
         up empty until the slot said so. */
      const host = await combobox('default-value="rs"')
      expect(control(host).value).toBe('Rust')
    })

    test('the panel is told how wide its field is, because CSS cannot ask', async () => {
      // `100%` on a `position: fixed` panel is the viewport, so the list would
      // come out the full width of the window.
      const host = await combobox('open')
      const surface = part(host as HTMLElement, 'surface') as HTMLElement
      for (let attempt = 0; attempt < 50 && !surface.hasAttribute('data-placed'); attempt += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      expect(surface.style.getPropertyValue('--_floating-anchor-width')).toMatch(/^\d+px$/)
    })
  })
}
