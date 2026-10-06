import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  mount,
  part,
  registerDom,
  settle,
  slotted,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The tokens are `Tag`s, and Backspace asks one of them to go.
  await import('../../tag/index.js')
})

/** Types into the control the way a reader does, and lets the element hear it. */
const type = async (host: HTMLElement, text: string): Promise<void> => {
  const control = part(host, 'control') as HTMLInputElement
  control.value = text
  control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
}

/** Backspace on the control, which is where the key lands. */
const backspace = (host: HTMLElement): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Backspace' })
  ;(part(host, 'control') as HTMLInputElement).dispatchEvent(event)
  return event
}

const WITH_TAGS = `<helix-headless-filter-input label="Filter rows">
  <helix-headless-tag dismissible slot="tags">design</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">infra</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">docs</helix-headless-tag>
</helix-headless-filter-input>`

describe('filter input', () => {
  test('renders the field, the row and a real input', async () => {
    const filter = await mount('<helix-headless-filter-input label="Filter rows" />')
    expect(part(filter, 'field')).not.toBeNull()
    expect(part(filter, 'control')?.tagName).toBe('INPUT')
    /* The row is rendered whether or not anything is in it, because a slot that
       is not in the tree assigns nothing. */
    expect(part(filter, 'tags')).not.toBeNull()
  })

  test('takes the consumer’s own elements as its tokens', async () => {
    const filter = await mount(WITH_TAGS)
    expect(slotted(filter, 'tags')).toHaveLength(3)
  })

  test('announces every keystroke, carrying the text on the element', async () => {
    // What Combobox cannot do, its `value` being a selection rather than text.
    const filter = await mount('<helix-headless-filter-input label="Filter rows" />')
    const heard: string[] = []
    filter.addEventListener('input', (event) => {
      heard.push((event.target as HTMLElement & { value: string }).value)
    })

    await type(filter, 'dep')
    await type(filter, 'deploy')

    expect(heard).toEqual(['dep', 'deploy'])
  })

  test('the text can be refused, and the control is put back', async () => {
    const filter = await mount('<helix-headless-filter-input label="Filter rows" />')
    filter.addEventListener('helix-before-change', (event) => {
      event.preventDefault()
    })

    await type(filter, 'deploy')

    expect((filter as HTMLElement & { value: string }).value).toBe('')
    // On screen and in the form, the same answer.
    expect((part(filter, 'control') as HTMLInputElement).value).toBe('')
  })

  test('backspace on an empty field asks the last token to go', async () => {
    const filter = await mount(WITH_TAGS)
    const asked: string[] = []
    filter.addEventListener('helix-dismiss', (event) => {
      asked.push((event as CustomEvent<{ label: string }>).detail.label)
    })

    const event = backspace(filter)

    // Asked, not taken: the consumer owns the markup the tokens are in.
    expect(asked).toEqual(['docs'])
    expect(slotted(filter, 'tags')).toHaveLength(3)
    expect(event.defaultPrevented).toBe(true)
  })

  test('the same request the close control makes, so one handler covers both', async () => {
    const filter = await mount(WITH_TAGS)
    const asked: string[] = []
    filter.addEventListener('helix-dismiss', (event) => {
      asked.push((event as CustomEvent<{ label: string }>).detail.label)
    })

    const last = slotted(filter, 'tags').at(-1) as HTMLElement
    ;(part(last, 'dismiss') as HTMLElement).click()
    backspace(filter)

    // One from the pointer, one from the keyboard, indistinguishable here.
    expect(asked).toEqual(['docs', 'docs'])
  })

  test('backspace with text in the field is the reader deleting a character', async () => {
    const filter = await mount(WITH_TAGS)
    let asked = 0
    filter.addEventListener('helix-dismiss', () => {
      asked += 1
    })

    await type(filter, 'dep')
    const event = backspace(filter)

    expect(asked).toBe(0)
    // Left alone, so the platform deletes the character.
    expect(event.defaultPrevented).toBe(false)
  })

  test('shows every token when no cap is set', async () => {
    const filter = await mount(WITH_TAGS)
    expect(slotted(filter, 'tags').filter((tag) => tag.hasAttribute('hidden'))).toHaveLength(0)
    expect(part(filter, 'rest')).toBeNull()
  })

  test('a cap hides the rest and counts them', async () => {
    const filter = await mount(WITH_TAGS.replace('label=', 'max-tags="2" label='))
    const tags = slotted(filter, 'tags')

    // Hidden rather than removed: they are the consumer's nodes.
    expect(tags.map((tag) => tag.hasAttribute('hidden'))).toEqual([false, false, true])
    expect(part(filter, 'rest')?.textContent).toBe('+1')
  })

  test('a cap that moves re-decides what fits', async () => {
    const filter = await mount(WITH_TAGS.replace('label=', 'max-tags="2" label='))
    ;(filter as HTMLElement & { maxTags: number }).maxTags = 3
    await (filter as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete

    expect(slotted(filter, 'tags').filter((tag) => tag.hasAttribute('hidden'))).toHaveLength(0)
    expect(part(filter, 'rest')).toBeNull()
  })

  test('clearing empties the text and leaves the tokens alone', async () => {
    const filter = await mount(WITH_TAGS.replace('label=', 'clearable label='))
    await type(filter, 'deploy')
    ;(part(filter, 'clear') as HTMLElement).click()
    await (filter as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete

    expect((filter as HTMLElement & { value: string }).value).toBe('')
    expect(slotted(filter, 'tags')).toHaveLength(3)
  })
})

describe('a required filter input', () => {
  test('left empty, it keeps its form from submitting', async () => {
    /* `required` reached only the control in the shadow root, which takes no
       part in the form, so an empty filter submitted. */
    const form = await mount(
      '<form><helix-headless-filter-input label="Filter" name="f" required></helix-headless-filter-input></form>',
    )
    const filter = form.firstElementChild as HTMLElement & {
      internals: ElementInternals
      label: string
      updateComplete: Promise<boolean>
    }
    await filter.updateComplete
    /* Read off the call rather than off `validity`: happy-dom's shim keeps
       only what it is handed as own properties, and a `ValidityState` holds
       its flags as getters, so the shim reports valid whatever it was told. */
    const said: ValidityStateFlags[] = []
    const set = filter.internals.setValidity.bind(filter.internals)
    filter.internals.setValidity = (flags, ...rest) => {
      said.push(flags ?? {})
      set(flags, ...rest)
    }
    filter.label = 'Filter again'
    await filter.updateComplete
    expect(said.at(-1)?.valueMissing).toBe(true)
  })
})

describe('a filter the cap has hidden', () => {
  /* `max-tags` hides the tokens over the cap, and Backspace took the last of
     those, a filter the reader could not see. */
  test('is not what Backspace asks to go', async () => {
    const filter = await mount(`<helix-headless-filter-input label="Filter rows" max-tags="2">
  <helix-headless-tag dismissible slot="tags">design</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">infra</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">docs</helix-headless-tag>
</helix-headless-filter-input>`)
    const asked: string[] = []
    filter.addEventListener('helix-dismiss', (event) => {
      asked.push((event as CustomEvent<{ label: string }>).detail.label)
    })
    backspace(filter)
    expect(asked).toEqual(['infra'])
  })
})

describe('the clear button', () => {
  /* The native field saw no edit, so no `change` of its own followed. */
  test('announces change as well as input', async () => {
    const filter = await mount(
      '<helix-headless-filter-input label="Filter rows" clearable default-value="deploy"></helix-headless-filter-input>',
    )
    const heard: string[] = []
    filter.addEventListener('input', () => heard.push('input'))
    filter.addEventListener('change', () => heard.push('change'))
    ;(part(filter, 'clear') as HTMLButtonElement).click()
    expect(heard).toEqual(['input', 'change'])
  })

  test('draws its cross in a slot a glyph of your own replaces', async () => {
    const filter = await mount(
      '<helix-headless-filter-input label="Filter rows" clearable default-value="deploy"><svg slot="clear-icon"></svg></helix-headless-filter-input>',
    )
    const slot = part(filter, 'clear')?.querySelector<HTMLSlotElement>('slot[name="clear-icon"]')
    expect(slot?.assignedElements()).toHaveLength(1)
  })
})

describe('the suggestions list', () => {
  /* The combobox was named and the list it controls was not. */
  test('is named by the label', async () => {
    const filter = await mount('<helix-headless-filter-input label="Filter rows" />')
    const surface = part(filter, 'surface')
    const label = surface?.getAttribute('aria-labelledby') ?? ''
    expect(filter.shadowRoot?.getElementById(label)?.textContent?.trim()).toBe('Filter rows')
  })
})

describe('a subclass registered under a tag of its own', () => {
  /* Fields were found by two tag names, so a headless subclass's grammar saw
     none of its own fields and typed filters stayed plain text. */
  test('finds the fields declared inside it', async () => {
    const { HelixHeadlessFilterField, HelixHeadlessFilterInput } = await import('../index.js')
    customElements.define('acme-filter-field', class extends HelixHeadlessFilterField {})
    customElements.define('acme-filter-input', class extends HelixHeadlessFilterInput {})
    const filter = (await mount(
      '<acme-filter-input label="Issues"><acme-filter-field name="status"></acme-filter-field></acme-filter-input>',
    )) as HTMLElement & { fields: HTMLElement[] }
    expect(filter.fields.map((field) => field.localName)).toEqual(['acme-filter-field'])
  })
})

describe('what a restored page gets back', () => {
  /* The form state was the FormData the tokens make, which the shared restore
     cannot read, so the typed text came back empty. */
  test('the typed text is the saved state, with tokens beside it', async () => {
    document.body.innerHTML = `<form><helix-headless-filter-input label="Filter" name="q" value="refund">
      <helix-headless-filter-chip slot="tags" name="status">open</helix-headless-filter-chip>
    </helix-headless-filter-input></form>`
    const host = document.querySelector('helix-headless-filter-input') as unknown as Updatable & {
      formStateRestoreCallback(state: unknown): void
      internals: ElementInternals
      value: string
    }
    const states: unknown[] = []
    const record = host.internals.setFormValue.bind(host.internals)
    host.internals.setFormValue = (value, state) => {
      states.push(state)
      record(value, state)
    }
    host.value = 'refund tuesday'
    await settle(host)
    expect(states.at(-1)).toBe('refund tuesday')
    host.value = ''
    await settle(host)
    host.formStateRestoreCallback('refund tuesday')
    await settle(host)
    expect(host.value).toBe('refund tuesday')
  })
})

describe('what the form receives', () => {
  /* The tokens were never submitted, so a form posted only the typed text. */
  test('the text, then one entry for each token that says what it filters', async () => {
    document.body.innerHTML = `<form><helix-headless-filter-input label="Filter" name="q" value="refund">
      <helix-headless-filter-chip slot="tags" name="status">open, pending</helix-headless-filter-chip>
      <helix-headless-filter-chip slot="tags" name="team" operator="none" operator-label="is none of">ops</helix-headless-filter-chip>
      <helix-headless-filter-chip slot="tags" name="created" operator="after" operator-label="is after"><span slot="field">Made</span>2024</helix-headless-filter-chip>
      <span slot="tags" value="saved:mine">Mine</span>
      <span slot="tags">Says nothing</span>
    </helix-headless-filter-input></form>`
    const host = document.querySelector('helix-headless-filter-input') as Updatable
    await settle(host)
    const sent = formValue(host as HTMLElement) as unknown as FormData
    expect(sent.getAll('q')).toEqual([
      'refund',
      'status:open,pending',
      '-team:ops',
      'created[after]:2024',
      'saved:mine',
    ])
  })
})
