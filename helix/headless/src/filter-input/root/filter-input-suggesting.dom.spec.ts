import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The suggestions are options, and an unregistered one never upgrades.
  await import('../../option/index.js')
})

const control = (host: Updatable): HTMLInputElement =>
  part(host as HTMLElement, 'control') as HTMLInputElement

const surface = (host: Updatable): HTMLElement | null =>
  part(host as HTMLElement, 'surface') as HTMLElement | null

/** The options a consumer slotted, in the order the keyboard walks them. */
const options = (host: Updatable): (HTMLElement & { active: boolean; value: string })[] => [
  ...(host as HTMLElement).querySelectorAll<HTMLElement & { active: boolean; value: string }>(
    'helix-headless-option',
  ),
]

const activeValue = (host: Updatable): string | undefined =>
  options(host).find((option) => option.active)?.value

const type = async (host: Updatable, text: string): Promise<void> => {
  const field = control(host)
  field.value = text
  field.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
  await settle(host)
}

const press = async (host: Updatable, key: string): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  control(host).dispatchEvent(event)
  await settle(host)
  return event
}

/** Focus in the field, which is half of what decides whether the panel shows. */
const enter = async (host: Updatable): Promise<void> => {
  control(host).focus()
  control(host).dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
  await settle(host)
}

const mount = async (suggestions: readonly string[], attributes = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-filter-input label="Filter rows" ${attributes}>
    ${suggestions
      .map(
        (value) =>
          `<helix-headless-option slot="suggestions" value="${value}">${value}</helix-headless-option>`,
      )
      .join('')}
  </helix-headless-filter-input>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

describe('a filter field that suggests', () => {
  test('says nothing about a popup until a consumer offers one', async () => {
    /* A text field carrying `role="combobox"` promises a list. A filter field
       nobody gives options to has none, and saying otherwise sends a screen
       reader looking for something that does not exist. */
    const host = await mount([])

    expect(control(host).getAttribute('role')).toBeNull()
    expect(control(host).getAttribute('aria-expanded')).toBeNull()
    expect(control(host).getAttribute('aria-controls')).toBeNull()
  })

  test('and says all of it once one does', async () => {
    const host = await mount(['absent', 'stale'])

    expect(control(host).getAttribute('role')).toBe('combobox')
    expect(control(host).getAttribute('aria-autocomplete')).toBe('list')
    expect(control(host).getAttribute('aria-controls')).toBe('suggestions')
    // Closed, because focus is elsewhere.
    expect(control(host).getAttribute('aria-expanded')).toBe('false')
  })

  test('the panel is a listbox region of its own', async () => {
    /* Not a `helix-listbox`, which would hear the option's `helix-select` and
       write `selected` back onto it. A suggestion is not a persistent choice. */
    const host = await mount(['absent'])

    expect(surface(host)?.getAttribute('role')).toBe('listbox')
    expect((host as HTMLElement).shadowRoot?.querySelector('helix-headless-listbox')).toBeNull()
  })

  test('opens when there is something to show and focus is in the field', async () => {
    const host = await mount(['absent', 'stale'])
    expect((host as unknown as { open: boolean }).open).toBe(false)

    await enter(host)

    expect((host as unknown as { open: boolean }).open).toBe(true)
    expect(control(host).getAttribute('aria-expanded')).toBe('true')
  })

  test('opening is announced once, not on every render', async () => {
    /* Opening is settled after every render, so `requestOpen` is asked on every
       keystroke; what keeps that quiet is its own early return when the answer
       has not moved. This locks the guarantee where a consumer meets it, since
       hearing `toggle` on each keystroke is the shape of the bug. */
    const host = await mount(['absent', 'stale'])
    const toggles: string[] = []
    ;(host as HTMLElement).addEventListener('toggle', (event) => {
      toggles.push((event as ToggleEvent).newState)
    })

    await enter(host)
    await type(host, 'a')
    await type(host, 'ab')

    expect(toggles).toEqual(['open'])
  })

  test('the platform is asked to show the panel, not just told it is open', async () => {
    /* **`open` alone shows nothing.** The surface is a manual popover, so until
       `showPopover` is called the UA's own `[popover]:not(:popover-open)` keeps
       it `display: none` however open this element believes it is. Shipped
       without this the panel could never appear, and every other test here
       passed anyway, because they all read the property and the ARIA rather than
       whether anything was shown. */
    const host = await mount(['absent', 'stale'])
    const panel = surface(host) as HTMLElement & {
      showPopover: () => void
      hidePopover: () => void
    }
    const asked: string[] = []
    panel.showPopover = () => {
      asked.push('show')
    }
    panel.hidePopover = () => {
      asked.push('hide')
    }

    await enter(host)
    expect(asked).toContain('show')

    await press(host, 'Escape')
    expect(asked).toContain('hide')
  })

  test('the arrows move a highlight without moving focus', async () => {
    const host = await mount(['absent', 'stale', 'thin'])
    await enter(host)

    await press(host, 'ArrowDown')
    expect(activeValue(host)).toBe('absent')

    await press(host, 'ArrowDown')
    expect(activeValue(host)).toBe('stale')

    await press(host, 'ArrowUp')
    expect(activeValue(host)).toBe('absent')

    // The caret never left the text, which is the whole arrangement.
    expect((host as HTMLElement).shadowRoot?.activeElement).toBe(control(host))
  })

  test('and wrap, from either end', async () => {
    const host = await mount(['absent', 'stale'])
    await enter(host)

    await press(host, 'ArrowUp')
    expect(activeValue(host)).toBe('stale')

    await press(host, 'ArrowDown')
    expect(activeValue(host)).toBe('absent')
  })

  test('Enter presses the highlighted option rather than announcing for it', async () => {
    /* The option fires its own `helix-select`, so a consumer hears the same
       event from the keyboard as from a pointer. */
    const host = await mount(['absent', 'stale'])
    const heard: string[] = []
    ;(host as HTMLElement).addEventListener('helix-select', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })

    await enter(host)
    await press(host, 'ArrowDown')
    const event = await press(host, 'Enter')

    expect(heard).toEqual(['absent'])
    expect(event.defaultPrevented).toBe(true)
  })

  test('Enter with nothing highlighted belongs to the form', async () => {
    const host = await mount(['absent'])
    await enter(host)

    const event = await press(host, 'Enter')

    expect(event.defaultPrevented).toBe(false)
  })

  test('choosing does not close it, because the next level lives there', async () => {
    /* Picking a key wants its values next. If a choice closed the panel it would
       shut and reopen between two renders, which reads as a flicker. */
    const host = await mount(['disposition'])
    await enter(host)
    await press(host, 'ArrowDown')
    await press(host, 'Enter')

    expect((host as unknown as { open: boolean }).open).toBe(true)
  })

  test('and it closes itself when the consumer stops offering', async () => {
    const host = await mount(['absent', 'stale'])
    await enter(host)
    expect((host as unknown as { open: boolean }).open).toBe(true)

    for (const option of options(host)) {
      option.remove()
    }
    await settle(host)

    expect((host as unknown as { open: boolean }).open).toBe(false)
    expect(control(host).getAttribute('role')).toBeNull()
  })

  test('Escape closes it and does not reach past this element', async () => {
    /* A filter field is often inside a dialog, and an Escape that closes the
       panel must not also close the thing the panel is in. */
    const host = await mount(['absent'])
    await enter(host)

    const event = await press(host, 'Escape')

    expect((host as unknown as { open: boolean }).open).toBe(false)
    expect(event.defaultPrevented).toBe(true)
    expect(activeValue(host)).toBeUndefined()
  })

  test('and it stays closed until the reader says something new', async () => {
    const host = await mount(['absent'])
    await enter(host)
    await press(host, 'Escape')
    expect((host as unknown as { open: boolean }).open).toBe(false)

    await type(host, 'ab')

    expect((host as unknown as { open: boolean }).open).toBe(true)
  })

  test('a highlight does not survive the list under it being replaced', async () => {
    const host = await mount(['absent', 'stale', 'thin'])
    await enter(host)
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    expect(activeValue(host)).toBe('stale')

    for (const option of options(host).slice(1)) {
      option.remove()
    }
    await settle(host)

    // An index into the old list points at whatever now sits there.
    expect(activeValue(host)).toBeUndefined()
  })

  test('a disabled suggestion keeps its place and is skipped', async () => {
    const host = await mount([])
    document.body.innerHTML = `<helix-headless-filter-input label="Filter rows">
      <helix-headless-option slot="suggestions" value="absent">absent</helix-headless-option>
      <helix-headless-option disabled slot="suggestions" value="stale">stale</helix-headless-option>
      <helix-headless-option slot="suggestions" value="thin">thin</helix-headless-option>
    </helix-headless-filter-input>`
    const next = document.body.firstElementChild as Updatable
    await settle(next)
    await enter(next)

    await press(next, 'ArrowDown')
    expect(activeValue(next)).toBe('absent')
    await press(next, 'ArrowDown')
    expect(activeValue(next)).toBe('thin')

    expect(host).toBeDefined()
  })

  test('options inside a group are walked, not stepped over', async () => {
    /* A slot assigns the group, not the options in it, so a panel reading only
       what was assigned would offer nothing the moment a consumer grouped. */
    document.body.innerHTML = `<helix-headless-filter-input label="Filter rows">
      <helix-headless-option-group label="Disposition" slot="suggestions">
        <helix-headless-option value="absent">absent</helix-headless-option>
        <helix-headless-option value="stale">stale</helix-headless-option>
      </helix-headless-option-group>
    </helix-headless-filter-input>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    await enter(host)

    expect(control(host).getAttribute('role')).toBe('combobox')
    await press(host, 'ArrowDown')
    expect(activeValue(host)).toBe('absent')
  })

  test('the caret is reachable, which a grammar completing at it needs', async () => {
    const host = await mount(['absent'], 'value="disposition:ab"')
    const field = host as unknown as {
      selectionStart: number
      selectionEnd: number
      setSelectionRange: (start: number, end: number) => void
      value: string
    }

    field.setSelectionRange(field.value.length, field.value.length)

    expect(field.selectionStart).toBe('disposition:ab'.length)
    expect(field.selectionEnd).toBe('disposition:ab'.length)
  })
})
