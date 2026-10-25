import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, internalsOf, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('option', () => {
  test('with a label and nothing in it, it shows and reads the label, as `<option label>` does', async () => {
    const host = (await mount(
      '<helix-headless-option value="sar" label="Search and rescue"></helix-headless-option>',
    )) as HTMLElement & { text: string }
    const slot = host.shadowRoot?.querySelector('[part="label"] slot') as HTMLSlotElement
    expect(slot.assignedNodes()).toHaveLength(0)
    expect(slot.textContent).toBe('Search and rescue')
    expect(host.text).toBe('Search and rescue')
    /* Content, where there is some, is still what it says. */
    host.textContent = 'Search'
    expect(host.text).toBe('Search')
  })

  test('its row says selected and active in part names, and only while they hold', async () => {
    /* For the option a component draws in its own shadow root, where no
       selector naming the host can reach `:state(selected)` or `data-active`. */
    const host = (await mount(
      '<helix-headless-option value="a">Alpha</helix-headless-option>',
    )) as HTMLElement & { active: boolean; selected: boolean; updateComplete: Promise<unknown> }
    const names = (): string => part(host, 'item')?.getAttribute('part') ?? ''
    expect(names()).toBe('item')
    host.selected = true
    host.active = true
    await host.updateComplete
    expect(names()).toBe('item item-selected item-active')
    expect(hasState(host, 'active')).toBe(true)
    host.selected = false
    host.active = false
    await host.updateComplete
    expect(names()).toBe('item')
  })

  test('is an option, which is what an owning listbox needs it to be', async () => {
    const host = (await mount(
      '<helix-headless-option value="a">Alpha</helix-headless-option>',
    )) as HTMLElement & {
      internals: ElementInternals
    }
    expect(internalsOf(host).role).toBe('option')
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
    host.addEventListener('helix-before-select', (event) => {
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
    host.addEventListener('helix-before-select', () => {
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

describe('the options among some elements', () => {
  test('are known by their shape, so a second copy of the class still finds them', async () => {
    /* A tag is defined by whichever copy registered it first, and a copy
       testing `instanceof` against its own class found no option on the page. */
    const { optionsAmong } = await import('./option-root.js')
    const option = (value: string): Element =>
      Object.assign(document.createElement('div'), { selected: false, text: value, value })
    const loose = option('one')
    const grouped = option('two')
    const group = document.createElement('div')
    group.append(grouped, document.createElement('div'))

    const found: Element[] = optionsAmong([loose, group, document.createElement('div')])
    expect(found.length).toBe(2)
    expect(found[0]).toBe(loose)
    expect(found[1]).toBe(grouped)
  })
})

describe('an option whose words are not what a reader types', () => {
  /* React Aria's textValue: a row drawn as a picture, or written in another
     script, still needs words for typeahead and a filter to match. */
  test('text-value is what it is matched by and what a trigger shows', async () => {
    const host = (await mount(
      '<helix-headless-option value="jp" text-value="Japan">日本</helix-headless-option>',
    )) as HTMLElement & { text: string }
    expect(host.text).toBe('Japan')
  })
})

describe('an option that is a link', () => {
  /* What an anchor would hear, caught on the way down and kept from navigating.
     Each catcher comes off the document after its test: left on, it would
     cancel every link click in the files after this one. */
  const catchers: ((event: Event) => void)[] = []
  afterEach(() => {
    for (const catcher of catchers.splice(0)) {
      document.removeEventListener('click', catcher, { capture: true })
    }
  })
  const followed = (): string[] => {
    const heard: string[] = []
    const catcher = (event: Event): void => {
      if (event.target instanceof HTMLAnchorElement) {
        heard.push(
          `${event.target.getAttribute('href')} ${event.target.target}${(event as MouseEvent).metaKey ? ' meta' : ''}`,
        )
        event.preventDefault()
      }
    }
    catchers.push(catcher)
    document.addEventListener('click', catcher, { capture: true })
    return heard
  }

  test('says helix-before-select with its href, then follows it with the keys held', async () => {
    const heard = followed()
    const host = (await mount(
      '<helix-headless-option value="docs" href="/docs" target="_blank">Docs</helix-headless-option>',
    )) as HTMLElement & { select(modifiers?: { metaKey?: boolean }): void }
    const said: unknown[] = []
    host.addEventListener('helix-before-select', (event) =>
      said.push((event as CustomEvent).detail),
    )
    part(host, 'item')?.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }))
    expect(said).toEqual([{ href: '/docs', value: 'docs' }])
    expect(heard).toEqual(['/docs _blank meta'])
  })

  test('follows nothing where helix-before-select is canceled, so a router can take it', async () => {
    const heard = followed()
    const host = (await mount(
      '<helix-headless-option value="docs" href="/docs">Docs</helix-headless-option>',
    )) as HTMLElement & { select(): void }
    host.addEventListener('helix-before-select', (event) => event.preventDefault())
    host.select()
    expect(heard).toEqual([])
  })

  test('says nothing about being chosen, a link being followed rather than chosen', async () => {
    const host = (await mount(
      '<helix-headless-option value="docs" href="/docs">Docs</helix-headless-option>',
    )) as HTMLElement & { internals: ElementInternals }
    expect(internalsOf(host).role).toBe('option')
    expect(internalsOf(host).ariaSelected).toBeNull()
    expect(host.shadowRoot?.querySelector('a')).toBeNull()
  })
})

describe('an option’s own content', () => {
  type Option = HTMLElement & {
    active: boolean
    disabled: boolean
    internals: ElementInternals
    selected: boolean
    selectionFollowsActive: boolean
    text: string
    updateComplete: Promise<unknown>
  }

  /* A caption could only be a string, and the tick on a chosen row could not
     be replaced. */
  test('takes a slotted caption and a slotted indicator, and neither is part of its text', async () => {
    const host = (await mount(
      '<helix-headless-option value="h">Helix<em slot="description">the design system</em><svg slot="indicator"></svg></helix-headless-option>',
    )) as Option
    const description = host.shadowRoot?.querySelector(
      'slot[name="description"]',
    ) as HTMLSlotElement
    expect(description.assignedElements().map((one) => one.localName)).toEqual(['em'])
    const indicator = host.shadowRoot?.querySelector('slot[name="indicator"]') as HTMLSlotElement
    expect(indicator.assignedElements().map((one) => one.localName)).toEqual(['svg'])
    indicator.dispatchEvent(new Event('slotchange'))
    expect(hasState(host, 'has-indicator')).toBe(true)
    expect(host.text).toBe('Helix')
  })

  test('draws the `description` text inside its part, as the caption slot’s fallback', async () => {
    const host = (await mount(
      '<helix-headless-option value="h" description="the design system">Helix</helix-headless-option>',
    )) as Option
    expect(part(host, 'description')?.querySelector('slot')?.getAttribute('name')).toBe(
      'description',
    )
    expect(part(host, 'description')?.textContent?.trim()).toBe('the design system')
  })

  test('says disabled as a state a stylesheet can select', async () => {
    const host = (await mount(
      '<helix-headless-option value="a" disabled>Alpha</helix-headless-option>',
    )) as Option
    expect(hasState(host, 'disabled')).toBe(true)
  })

  test('says it is selected while active, where the list it is in holds suggestions', async () => {
    const host = (await mount(
      '<helix-headless-option value="a">Alpha</helix-headless-option>',
    )) as Option
    host.active = true
    await host.updateComplete
    expect(internalsOf(host).ariaSelected).toBe('false')
    host.selectionFollowsActive = true
    await host.updateComplete
    expect(internalsOf(host).ariaSelected).toBe('true')
    host.active = false
    await host.updateComplete
    expect(internalsOf(host).ariaSelected).toBe('false')
  })
})

describe('what an option is called', () => {
  type Option = HTMLElement & {
    alternate: string
    alternateLabel: string
    internals: ElementInternals & {
      ariaDescribedByElements: Element[] | null
      ariaLabelledByElements: Element[] | null
    }
    updateComplete: Promise<unknown>
  }

  /* The name was the host's whole content, so initials in `start` and a
     shortcut in `end` were read into it: `P Priya Shah ⌘P`, and the caption
     ran on after the name rather than being its description. */
  test('is its label alone, and its caption is its description', async () => {
    const host = (await mount(
      '<helix-headless-option value="p" description="Lead designer"><span slot="start">P</span>Priya Shah<kbd slot="end">⌘P</kbd></helix-headless-option>',
    )) as Option
    await host.updateComplete
    expect(internalsOf(host).ariaLabelledByElements).toEqual([part(host, 'label') as Element])
    expect(internalsOf(host).ariaDescribedByElements).toEqual([
      part(host, 'description') as Element,
    ])
  })

  test('a slotted caption is its description too', async () => {
    const host = (await mount(
      '<helix-headless-option value="h">Helix<em slot="description">the design system</em></helix-headless-option>',
    )) as Option
    await host.updateComplete
    expect(internalsOf(host).ariaDescribedByElements?.map((one) => one.localName)).toEqual(['em'])
  })

  test('a name written on the host wins', async () => {
    const host = (await mount(
      '<helix-headless-option value="p" aria-label="Priya">Priya Shah</helix-headless-option>',
    )) as Option
    await host.updateComplete
    expect(internalsOf(host).ariaLabelledByElements ?? null).toBeNull()
  })

  /* A description by reference outranks `aria-description`, so the second
     destination of a captioned row would have gone unsaid. */
  test('says its second destination beside a caption', async () => {
    const host = (await mount(
      '<helix-headless-option value="h" description="the design system" alternate="/sandbox" alternate-label="Opens the sandbox with Shift">Helix</helix-headless-option>',
    )) as Option
    await host.updateComplete
    const said = internalsOf(host).ariaDescribedByElements?.map((one) => one.textContent?.trim())
    expect(said).toEqual(['the design system', 'Opens the sandbox with Shift'])
    expect(internalsOf(host).ariaDescription ?? null).toBeNull()
    ;(host as unknown as { description: string }).description = ''
    await host.updateComplete
    expect(internalsOf(host).ariaDescription).toBe('Opens the sandbox with Shift')
  })
})

describe('an option under a pointer', () => {
  const pointer = (target: Element, type: string, pointerType = 'mouse'): void => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType }))
  }

  /* React Aria's options say `data-hovered` and `data-pressed`; this said
     neither, so a press could be drawn only with `:active`. */
  test('says hovered for a mouse and pressed from the press to the release', async () => {
    const host = await mount('<helix-headless-option value="a">Alpha</helix-headless-option>')
    const row = part(host, 'item') as Element
    pointer(row, 'pointerenter')
    expect(hasState(host, 'hovered')).toBe(true)
    pointer(row, 'pointerdown')
    expect(hasState(host, 'pressed')).toBe(true)
    pointer(row, 'pointerup')
    expect(hasState(host, 'pressed')).toBe(false)
    pointer(row, 'pointerleave')
    expect(hasState(host, 'hovered')).toBe(false)
  })

  test('a touch sets no hover, and a disabled option no press', async () => {
    const host = await mount(
      '<helix-headless-option value="a" disabled>Alpha</helix-headless-option>',
    )
    const row = part(host, 'item') as Element
    pointer(row, 'pointerenter', 'touch')
    expect(hasState(host, 'hovered')).toBe(false)
    pointer(row, 'pointerdown', 'touch')
    expect(hasState(host, 'pressed')).toBe(false)
  })
})
