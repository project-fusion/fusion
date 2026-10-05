import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const OPTIONS = `<helix-headless-combobox label="Language">
  <helix-headless-option value="rust">Rust</helix-headless-option>
  <helix-headless-option value="ruby">Ruby</helix-headless-option>
  <helix-headless-option value="python">Python</helix-headless-option>
</helix-headless-combobox>`

/** Types into the control the way a reader does. */
const type = async (host: HTMLElement, text: string): Promise<void> => {
  const control = part(host, 'control') as HTMLInputElement
  control.value = text
  control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
}

/** The list inside, whose `filter` says whether the narrowing was applied. */
const listbox = (host: HTMLElement): HTMLElement & { filter: string } =>
  host.shadowRoot?.querySelector('[part="listbox"]') as HTMLElement & { filter: string }

describe('combobox typing, as a consumer sees it', () => {
  test('announces what the list is being narrowed to', async () => {
    const combobox = await mount(OPTIONS)
    const heard: string[] = []
    combobox.addEventListener('helix-filter', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })

    await type(combobox, 'ru')
    await type(combobox, 'rub')

    expect(heard).toEqual(['ru', 'rub'])
  })

  test('under this element’s name, not the listbox inside it', async () => {
    /* The whole of the fix. The narrowing always reached consumers, because the
       listbox's own `helix-filter` is composed and nothing stopped it here;
       what a consumer got was an event from an element they do not hold. */
    const combobox = await mount(OPTIONS)
    const targets: EventTarget[] = []
    combobox.addEventListener('helix-filter', (event) => {
      if (event.target) {
        targets.push(event.target)
      }
    })

    await type(combobox, 'ru')

    /* Counted, then compared by identity. `toEqual` on a list holding a DOM node
       walks a graph with cycles in it the moment it stops matching, which is the
       `hazards` rule and is not theoretical: an earlier version of this
       assertion printed 1.3MB before failing. */
    expect(targets).toHaveLength(1)
    expect(targets[0]).toBe(combobox)
  })

  test('once per keystroke, the inner one stopped at the boundary', async () => {
    // The regression the fix could introduce: two events for one narrowing.
    const combobox = await mount(OPTIONS)
    let count = 0
    combobox.addEventListener('helix-filter', () => {
      count += 1
    })

    await type(combobox, 'ru')

    expect(count).toBe(1)
  })

  test('refusing it leaves the list whole', async () => {
    const combobox = await mount(OPTIONS)
    combobox.addEventListener('helix-filter', (event) => {
      event.preventDefault()
    })

    await type(combobox, 'ru')

    expect(listbox(combobox).filter).toBe('')
  })

  test('refusing the narrowing is not refusing to open', async () => {
    // What refusing the listbox's own event already did, kept.
    const combobox = await mount(OPTIONS)
    combobox.addEventListener('helix-filter', (event) => {
      event.preventDefault()
    })

    await type(combobox, 'ru')

    expect((combobox as HTMLElement & { open: boolean }).open).toBe(true)
  })

  test('accepted, the list actually narrows', async () => {
    const combobox = await mount(OPTIONS)

    await type(combobox, 'ru')

    expect(listbox(combobox).filter).toBe('ru')
  })

  test('typing before anything is open still reports', async () => {
    const combobox = await mount(OPTIONS)
    const heard: string[] = []
    combobox.addEventListener('helix-filter', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })

    expect((combobox as HTMLElement & { open: boolean }).open).toBe(false)
    await type(combobox, 'ru')

    expect(heard).toEqual(['ru'])
  })
})

describe('combobox typing, as a screen reader hears it', () => {
  /* The list narrowed in silence: only "No matches" was said, where React Aria
     and Web Awesome say how many options are left. */
  const said = (host: HTMLElement): string => {
    const list = listbox(host)
    return list.shadowRoot?.querySelector('[part="live"]')?.textContent?.trim() ?? ''
  }

  test('says how many options are left, in the words it was given', async () => {
    const combobox = await mount(
      OPTIONS.replace('label="Language"', 'label="Language" result-label="{count} langue"'),
    )
    await type(combobox, 'ru')
    await (listbox(combobox) as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(said(combobox)).toBe('2 results')
    await type(combobox, 'rus')
    await (listbox(combobox) as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(said(combobox)).toBe('1 langue')
  })

  test('and empty content can be richer than the text', async () => {
    const combobox = await mount(
      OPTIONS.replace(
        '</helix-headless-combobox>',
        '<span slot="empty">No language. <a href="#add">Suggest one</a></span></helix-headless-combobox>',
      ),
    )
    await type(combobox, 'zz')
    const list = listbox(combobox) as unknown as HTMLElement & { updateComplete: Promise<unknown> }
    await list.updateComplete
    const empty = list.shadowRoot?.querySelector('[part="empty"] slot') as HTMLSlotElement
    const handed = empty.assignedElements()[0] as HTMLSlotElement
    expect(handed.assignedElements({ flatten: true })[0]?.textContent).toContain('Suggest one')
  })

  test('without it, the empty text still shows', async () => {
    const combobox = await mount(
      OPTIONS.replace('label="Language"', 'label="Language" empty-text="Nothing"'),
    )
    await type(combobox, 'zz')
    const list = listbox(combobox) as unknown as HTMLElement & { updateComplete: Promise<unknown> }
    await list.updateComplete
    const empty = list.shadowRoot?.querySelector('[part="empty"] slot') as HTMLSlotElement
    /* The combobox's own slot is what the list's is given, and with nothing
       slotted into it, it shows its fallback, which is the text. happy-dom
       does not flatten through a fallback, so the handed slot is read. */
    const handed = empty.assignedElements()[0] as HTMLSlotElement
    expect(handed.assignedNodes()).toHaveLength(0)
    expect(handed.textContent?.trim()).toBe('Nothing')
  })
})

describe('combobox taking text that names no option', () => {
  /* React Aria's allowsCustomValue: the list is a help, and the answer may be
     something it does not hold. */
  const key = async (host: HTMLElement, name: string): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: name,
    })
    part(host, 'control')?.dispatchEvent(event)
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    return event
  }

  test('leaving the field takes the text as the value', async () => {
    const host = (await mount(
      OPTIONS.replace('label="Language"', 'label="Language" allows-custom-value'),
    )) as HTMLElement & { value: string }
    await type(host, 'Elixir')
    await key(host, 'Tab')
    expect(host.value).toBe('Elixir')
  })

  test('and text that names an option takes that option', async () => {
    const host = (await mount(
      OPTIONS.replace('label="Language"', 'label="Language" allows-custom-value'),
    )) as HTMLElement & { value: string }
    await type(host, 'ruby')
    await key(host, 'Tab')
    expect(host.value).toBe('ruby')
  })

  test('Enter with nothing matching takes the text, and closes the list', async () => {
    const host = (await mount(
      OPTIONS.replace('label="Language"', 'label="Language" allows-custom-value'),
    )) as HTMLElement & { open: boolean; value: string }
    await type(host, 'Zig')
    const enter = await key(host, 'Enter')
    expect(enter.defaultPrevented).toBe(true)
    expect(host.value).toBe('Zig')
    expect(host.open).toBe(false)
  })

  test('without it, leaving puts the chosen words back and holds no text', async () => {
    const host = (await mount(OPTIONS)) as HTMLElement & { value: string }
    await type(host, 'Elixir')
    await key(host, 'Tab')
    expect(host.value).toBe('')
  })
})

describe('a second Escape', () => {
  test('on the closed field clears a single choice, and is stopped', async () => {
    const host = (await mount(
      OPTIONS.replace('label="Language"', 'label="Language" default-value="rust"'),
    )) as HTMLElement & { open: boolean; value: string; updateComplete: Promise<unknown> }
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Escape',
    })
    part(host, 'control')?.dispatchEvent(event)
    await host.updateComplete
    expect(host.value).toBe('')
    expect(event.defaultPrevented).toBe(true)
  })

  test('and on an empty field is left for whatever holds it', async () => {
    const host = (await mount(OPTIONS)) as HTMLElement & { updateComplete: Promise<unknown> }
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Escape',
    })
    part(host, 'control')?.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
