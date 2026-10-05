import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  at,
  formValue,
  hasLayout,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const combobox = async (extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-combobox label="L" name="c" ${extra}>
    <helix-headless-option value="rs">Rust</helix-headless-option>
    <helix-headless-option value="rb">Ruby</helix-headless-option>
    <helix-headless-option value="go">Go</helix-headless-option>
  </helix-headless-combobox>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

const control = (host: Updatable): HTMLInputElement =>
  part(host as HTMLElement, 'control') as HTMLInputElement

const options = (host: Updatable): (HTMLElement & { active: boolean })[] =>
  [...(host as HTMLElement).querySelectorAll('helix-headless-option')] as (HTMLElement & {
    active: boolean
  })[]

const shown = (host: Updatable): string[] =>
  options(host)
    .filter((option) => !option.hidden)
    .map((option) => option.textContent?.trim() ?? '')

const type = async (host: Updatable, text: string, inputType = 'insertText'): Promise<void> => {
  const field = control(host)
  field.value = text
  field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType }))
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
    /* Two ways this goes wrong, both the listbox's: moving that chooses as it
       goes commits an option on the first Down and shuts the panel, and a
       highlight parked on the first option by the close makes the Down meant to
       arrive at it start from it and reach the second. */
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
    /* The listbox announces `helix-before-change` too, and a consumer listening
       here would otherwise hear two for one choice, one of them naming a control
       they never put on the page. */
    const host = await combobox()
    /* Counted and identified separately, and the identity compared with `toBe`.
       A deep equality against an array holding a DOM node walks the node, and a
       rendered element is a graph with cycles in it: `toEqual([host])` does not
       fail when it starts failing, it exhausts the machine's memory and takes
       the runner with it. */
    const heard: EventTarget[] = []
    host.addEventListener('helix-before-change', (event) => heard.push(event.target as EventTarget))
    await type(host, 'go')
    await press(host, 'Enter')
    expect(heard.length).toBe(1)
    expect(heard[0]).toBe(host as EventTarget)
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

  test('the list is named by the label, not labeled with it', async () => {
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

describe('the keys a combobox field keeps for its text', () => {
  /* Dispatched as a reader's key would be, and asked whether the field kept
     it: a press the list took is one whose default was prevented, which for a
     printable key means nothing was typed. */
  const kept = async (host: Updatable, key: string): Promise<boolean> => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
    })
    control(host).dispatchEvent(event)
    await settle(host)
    return !event.defaultPrevented
  }

  test('a space is typed, and chooses nothing', async () => {
    /* Measured before this: "New" highlighted "New York", and the space chose
       it and shut the panel, so a query of two words could not be typed. */
    const host = await combobox()
    await type(host, 'ru')
    expect(await kept(host, ' ')).toBe(true)
    expect((host as unknown as { value: string }).value).toBe('')
    expect((host as unknown as { open: boolean }).open).toBe(true)
  })

  test('Home and End move the caret, not the highlight', async () => {
    const host = await combobox()
    await type(host, 'ru')
    expect(await kept(host, 'Home')).toBe(true)
    expect(await kept(host, 'End')).toBe(true)
    expect(
      options(host)
        .find((option) => option.active)
        ?.textContent?.trim(),
    ).toBe('Rust')
  })

  test('Enter in a closed field chooses nothing, and is left to the form', async () => {
    /* The highlight a reader rejected with Escape stayed on the list, and an
       Enter in the closed field chose it and kept the form from submitting. */
    const host = await combobox('default-value="go"')
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    await press(host, 'Escape')
    expect((host as unknown as { open: boolean }).open).toBe(false)
    expect(await kept(host, 'Enter')).toBe(true)
    expect((host as unknown as { value: string }).value).toBe('go')
  })

  test('Down opens on the chosen option, with its words still in the field', async () => {
    const host = await combobox('default-value="rb"')
    await press(host, 'ArrowDown')
    expect(
      options(host)
        .find((option) => option.active)
        ?.textContent?.trim(),
    ).toBe('Ruby')
    expect(control(host).value).toBe('Ruby')
  })

  test('emptying the field and leaving it clears the choice', async () => {
    const host = await combobox('default-value="rb"')
    await type(host, '', 'deleteContentBackward')
    await press(host, 'Tab')
    expect((host as unknown as { value: string }).value).toBe('')
    expect(formValue(host as HTMLElement)).toBeNull()
  })

  test('while Escape puts the choice back', async () => {
    const host = await combobox('default-value="rb"')
    await type(host, '', 'deleteContentBackward')
    await press(host, 'Escape')
    await press(host, 'Tab')
    expect((host as unknown as { value: string }).value).toBe('rb')
    expect(control(host).value).toBe('Ruby')
  })

  test('selectedIndex moves the value, the field and the form together', async () => {
    const host = (await combobox('default-value="rb"')) as Updatable & {
      selectedIndex: number
      value: string
    }
    host.selectedIndex = 2
    await settle(host)
    expect(host.value).toBe('go')
    expect(control(host).value).toBe('Go')
    expect(formValue(host as HTMLElement)).toBe('go')
  })
})

describe('combobox holding several', () => {
  const many = async (extra = ''): Promise<Updatable> => {
    document.body.innerHTML = `<helix-headless-combobox label="L" multiple name="c" ${extra}>
      <helix-headless-option value="rs">Rust</helix-headless-option>
      <helix-headless-option value="rb">Ruby</helix-headless-option>
      <helix-headless-option value="go">Go</helix-headless-option>
    </helix-headless-combobox>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    return host
  }

  const tags = (host: Updatable): HTMLElement[] => [
    // biome-ignore lint/style/noNonNullAssertion: spreading an optional chain throws when it yields undefined, which is what this rule's own automatic fix produced here. A mounted host has a shadow root and the spec has just mounted it.
    ...(host as HTMLElement).shadowRoot!.querySelectorAll<HTMLElement>('[part="tag"]'),
  ]

  test('a token forwards every part of its tag, so each can be styled from outside', async () => {
    const host = await many()
    await type(host, 'ru')
    await press(host, 'Enter')
    const forwarded = (at(tags(host), 0).getAttribute('exportparts') ?? '').split(/,\s*/)
    expect(forwarded).toContain('cell: tag-cell')
    expect(forwarded).toContain('link: tag-link')
  })

  test('each chosen token is removable, and the control says which one it removes', async () => {
    /* A token's dismiss control is a cross, so `removeLabel` is its whole
       accessible name. It reaches the token through the `Tag` this renders,
       which is a different element, so the word has to cross a boundary to get
       there and nothing else reads it.

       A word the component does not default to, `removeLabel` holding
       "Remove {name}". The name is the option's, so a row of tags is heard as
       which one each removes rather than as "Remove" said once per tag. */
    const host = await many('remove-label="Take {name} off"')
    await type(host, 'ru')
    await press(host, 'Enter')
    expect(tags(host)).toHaveLength(1)
    expect(at(tags(host), 0).getAttribute('dismiss-label')).toBe('Take Rust off')
  })

  test('the panel stays open between picks, and the filter does not', async () => {
    /* A control that shut after each pick is one the reader has to reopen to
       keep using, and one that kept the search is one whose second pick starts
       from the first pick's leftovers. */
    const host = await many()
    await type(host, 'ru')
    await press(host, 'Enter')
    expect((host as unknown as { open: boolean }).open).toBe(true)
    expect(control(host).value).toBe('')

    await type(host, 'go')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('rs,go')
  })

  test('a second press on the same option takes it back off', async () => {
    const host = await many()
    await type(host, 'go')
    await press(host, 'Enter')
    await type(host, 'go')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('')
  })

  test('Backspace on an empty field takes the last one off', async () => {
    // The keyboard's version of pressing a tag's remove control. Without it a
    // reader who chose four things with the keyboard needs a pointer to undo
    // one.
    const host = await many('default-value="rs,rb"')
    await press(host, 'Backspace')
    expect((host as unknown as { value: string }).value).toBe('rs')
  })

  test('and leaves the text alone when there is text to delete instead', async () => {
    const host = await many('default-value="rs,rb"')
    await type(host, 'go')
    await press(host, 'Backspace')
    expect((host as unknown as { value: string }).value).toBe('rs,rb')
  })

  test('the field shows the filter, never the words the tags already say', async () => {
    const host = await many('default-value="rs"')
    expect(control(host).value).toBe('')
  })

  test('the form is given the set one entry each, and nothing when it is empty', async () => {
    const host = await many()
    expect(formValue(host as HTMLElement)).toBe(null)
    await type(host, 'ru')
    await press(host, 'Enter')
    await type(host, 'go')
    await press(host, 'Enter')
    expect((formValue(host as HTMLElement) as FormData).getAll('c')).toEqual(['rs', 'go'])
  })

  test('a refused choice leaves the control exactly where it was', async () => {
    /* A refusal has to leave the filter and the panel alone: clearing either is
       the control acting as though the option had been taken. Select carries the
       same rule. */
    const host = await many()
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    await type(host, 'ru')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('')
    expect(tags(host).length).toBe(0)
    expect(control(host).value).toBe('ru')
    expect((host as unknown as { open: boolean }).open).toBe(true)
  })

  test('a press on a tag is the tag`s, so the panel does not open under it', async () => {
    /* A tag is its own control: its dismiss takes a choice away, and opening
       the list on the way past leaves the reader looking at a panel they did
       not ask for.

       The tag is found by identity. Asked by tag name it was one tier's
       element, so on this tier every press fell through to the open and the
       fault was invisible on the other one. */
    const host = await many('default-value="rs"')
    expect((host as unknown as { open: boolean }).open).toBe(false)
    const tag = tags(host)[0]
    expect(tag).toBeDefined()
    tag?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await settle(host)
    expect((host as unknown as { open: boolean }).open).toBe(false)
  })

  test('the list is told it takes more than one, since a reader must be told', async () => {
    /* Asserted on the property rather than on `aria-multiselectable`, which is
       not an attribute: the listbox sets it through `ElementInternals`, so it
       reaches the accessibility tree and never the markup. What this element is
       responsible for is telling the list, and that is what is checked here. */
    const host = await many()
    const listbox = part(host as HTMLElement, 'listbox') as HTMLElement & { multiple: boolean }
    expect(listbox.multiple).toBe(true)
  })
})

describe('combobox that takes an answer it was not given', () => {
  const open = async (extra = ''): Promise<Updatable> => {
    document.body.innerHTML = `<helix-headless-combobox creatable label="L" name="c" ${extra}>
      <helix-headless-option value="rs">Rust</helix-headless-option>
      <helix-headless-option value="rb">Ruby</helix-headless-option>
    </helix-headless-combobox>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    return host
  }

  const row = (host: Updatable): HTMLElement | null =>
    (host as HTMLElement).shadowRoot?.querySelector<HTMLElement>('[part~="create"]') ?? null

  test('the row is offered beside near misses, not only when nothing matches', async () => {
    /* A reader typing "Ruby on Rails" with "Ruby" in the list wants the one
       they are typing, not the one they are halfway through.

       `create-label` is set to a word the component does not default to. Read
       against `Add`, the assertion passes just as well against a template
       writing that literal and says nothing about `createLabel` at all: the
       property interpolates the typed text into the middle of itself, which is
       why it is a string rather than a slot, and that is the part worth
       holding. */
    const host = await open('create-label="Invent"')
    await type(host, 'Rub')
    expect(row(host)?.textContent?.trim()).toBe('Invent "Rub"')
    expect(shown(host)).toEqual(['Ruby'])
  })

  test('and not where it would offer a second copy of what is already there', async () => {
    const host = await open()
    await type(host, 'rust')
    expect(row(host)).toBeNull()
  })

  test('nor with nothing typed, since there would be nothing to add', async () => {
    const host = await open()
    expect(row(host)).toBeNull()
  })

  test('it announces before it takes, and a refusal adds nothing', async () => {
    /* The options are the consumer's own light DOM and nothing here writes into
       it. A consumer who validates first refuses and adds nothing, and the
       control is left exactly where it was. */
    const host = await open()
    host.addEventListener('helix-create', (event) => event.preventDefault())
    await type(host, 'Zig')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('')
    expect(control(host).value).toBe('Zig')
    expect(row(host)).not.toBeNull()
  })

  test('what it announces is the text as typed, not a slug of it', async () => {
    // Trimming or lowering it here would be this element deciding what a name
    // means. A consumer who wants an identifier can make one.
    const host = await open()
    const heard: string[] = []
    host.addEventListener('helix-create', (event) =>
      heard.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    await type(host, 'Objective C')
    await press(host, 'Enter')
    expect(heard).toEqual(['Objective C'])
  })

  test('taken, it becomes the value and the field says it', async () => {
    const host = await open()
    await type(host, 'Zig')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('Zig')
    expect((host as unknown as { open: boolean }).open).toBe(false)
    expect(formValue(host as HTMLElement)).toBe('Zig')
  })

  test('Enter over a highlighted option takes the option, not the row', async () => {
    const host = await open()
    await type(host, 'Rub')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('rb')
  })

  test('the arrows reach the row after the last option, and Enter there adds', async () => {
    /* The row is a button outside the list, so the list's own keys never
       reached it: with "Ruby" still matching "Ru", the keyboard could only pick
       Ruby or Rust. */
    const host = await open()
    const heard: string[] = []
    host.addEventListener('helix-create', (event) =>
      heard.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    await type(host, 'Ru')
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    expect(options(host).some((option) => option.active)).toBe(false)
    expect(row(host)?.getAttribute('part')).toBe('create create-active')
    await press(host, 'Enter')
    expect(heard).toEqual(['Ru'])
    expect((host as unknown as { value: string }).value).toBe('Ru')
  })

  test('and an arrow from the row goes back into the list', async () => {
    const host = await open()
    await type(host, 'Ru')
    await press(host, 'ArrowUp')
    expect(row(host)?.getAttribute('part')).toBe('create create-active')
    await press(host, 'ArrowDown')
    expect(
      options(host)
        .find((option) => option.active)
        ?.textContent?.trim(),
    ).toBe('Rust')
  })

  test('with several, a created answer joins the set rather than replacing it', async () => {
    const host = await open('multiple')
    await type(host, 'rub')
    await press(host, 'Enter')
    await type(host, 'Zig')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('rb,Zig')
    expect((host as unknown as { open: boolean }).open).toBe(true)
  })
})

describe('combobox that finishes the word', () => {
  const suggesting = async (extra = ''): Promise<Updatable> => {
    document.body.innerHTML = `<helix-headless-combobox label="L" name="c" suggest ${extra}>
      <helix-headless-option value="rs">Rust</helix-headless-option>
      <helix-headless-option value="rb">Ruby</helix-headless-option>
      <helix-headless-option value="go">Go</helix-headless-option>
    </helix-headless-combobox>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    return host
  }

  test('the field completes to the first match, in the option"s own case', async () => {
    // The completion is a name from the list, and correcting the reader's
    // capitals to match it is the whole point of showing it.
    const host = await suggesting()
    await type(host, 'ru')
    expect(control(host).value).toBe('Rust')
  })

  test('the part they did not type is selected, so the next key replaces it', async () => {
    const host = await suggesting()
    await type(host, 'ru')
    expect(control(host).selectionStart).toBe(2)
    expect(control(host).selectionEnd).toBe(4)
  })

  test('the list is filtered by what was typed, not by what was completed', async () => {
    /* Filtering on the completion would narrow the list to the one option it
       came from, so a reader typing "ru" would be shown "Rust" alone and never
       learn Ruby was there. */
    const host = await suggesting()
    await type(host, 'ru')
    expect(shown(host)).toEqual(['Rust', 'Ruby'])
  })

  test('deleting is never completed, or nothing could be shortened', async () => {
    const host = await suggesting()
    await type(host, 'rus')
    expect(control(host).value).toBe('Rust')
    await type(host, 'ru', 'deleteContentBackward')
    expect(control(host).value).toBe('ru')
  })

  test('nothing is offered where nothing begins with it', async () => {
    const host = await suggesting()
    await type(host, 'zz')
    expect(control(host).value).toBe('zz')
  })

  test('nor where the typing is already the whole word', async () => {
    const host = await suggesting()
    await type(host, 'Rust')
    expect(control(host).value).toBe('Rust')
    expect(control(host).selectionStart).toBe(control(host).selectionEnd)
  })

  test('a field that does not suggest says so, and a field that does says that', async () => {
    const plain = await combobox()
    expect(control(plain).getAttribute('aria-autocomplete')).toBe('list')
    const host = await suggesting()
    expect(control(host).getAttribute('aria-autocomplete')).toBe('both')
  })

  test('the completion goes when the panel does', async () => {
    /* Both copies of the filter clear on close. With only the listbox's cleared,
       `typed` survives a dismissal invisibly, since a closed field shows the
       chosen words instead, and reopening puts the old search back with the
       whole list behind it. */
    const host = await suggesting()
    await type(host, 'ru')
    await press(host, 'Escape')
    ;(host as unknown as { open: boolean }).open = true
    await settle(host)
    expect(control(host).value).toBe('')
  })
})

if (hasLayout()) {
  describe('combobox in a browser', () => {
    /* Only in a browser, and not for layout: what this needs is slot flattening
       across two roots. The options are the combobox's light DOM, assigned to a
       slot that is itself inside a listbox in the combobox's shadow root, and
       `assignedElements({ flatten: true })` does not resolve that chain in
       happy-dom. Select's spec says the same, for the same reason.

       The tags need it twice over: they are read off those same options, so in
       happy-dom a combobox with a value came up holding none. */
    const manySet = async (extra = ''): Promise<Updatable> => {
      document.body.innerHTML = `<helix-headless-combobox label="L" multiple name="c" ${extra}>
        <helix-headless-option value="rs">Rust</helix-headless-option>
        <helix-headless-option value="rb">Ruby</helix-headless-option>
        <helix-headless-option value="go">Go</helix-headless-option>
      </helix-headless-combobox>`
      const host = document.body.firstElementChild as Updatable
      await settle(host)
      return host
    }

    const tagsOf = (host: Updatable): HTMLElement[] => [
      // biome-ignore lint/style/noNonNullAssertion: spreading an optional chain throws when it yields undefined, which is what this rule's own automatic fix produced here. A mounted host has a shadow root and the spec has just mounted it.
      ...(host as HTMLElement).shadowRoot!.querySelectorAll<HTMLElement>('[part="tag"]'),
    ]

    test('the field shows the chosen option"s words, not its value', async () => {
      /* And it shows them on the first paint. The words are read off options
         that are not assigned yet when the element first renders, and slot
         assignment schedules no update of its own: a combobox with a value came
         up empty until the slot said so. */
      const host = await combobox('default-value="rs"')
      expect(control(host).value).toBe('Rust')
    })

    test('the chosen are tags, in the order they were chosen', async () => {
      /* Which it has to be: with `creatable` an answer need not be in the list
         at all, so there is no position in the list to give it. */
      const host = await manySet('default-value="go,rs"')
      expect(tagsOf(host).map((tag) => tag.textContent?.trim())).toEqual(['Go', 'Rust'])
    })

    test('a tag asking to go takes exactly itself out', async () => {
      const host = await manySet('default-value="rs,rb,go"')
      const ruby = tagsOf(host).find((tag) => tag.textContent?.trim() === 'Ruby')
      ruby?.dispatchEvent(new CustomEvent('helix-dismiss', { bubbles: true, composed: true }))
      await settle(host)
      expect((host as unknown as { value: string }).value).toBe('rs,go')
    })

    test('a disabled set can be read and not dismantled', async () => {
      const host = await manySet('default-value="rs,go" disabled')
      expect(tagsOf(host).length).toBe(2)
      expect(
        tagsOf(host).some((tag) => (tag as HTMLElement & { dismissible: boolean }).dismissible),
      ).toBe(false)
    })

    test('the panel is told how wide its field is, because CSS cannot ask', async () => {
      // `100%` on a `position: fixed` panel is the viewport, so the list would
      // come out the full width of the window.
      const host = await combobox('open')
      const surface = part(host as HTMLElement, 'surface') as HTMLElement
      for (let attempt = 0; attempt < 50 && !surface.hasAttribute('data-placed'); attempt += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      expect(surface.style.getPropertyValue('--floating-anchor-inline-size')).toMatch(/^\d+px$/)
    })
  })
}

/* Only in a real engine, as the listbox's own: `ariaActiveDescendantElement`
   is an element reference, which happy-dom does not implement, and the
   component feature-tests it. */
if (hasLayout()) {
  describe('combobox active descendant', () => {
    test('the input points at the option the arrows are on', async () => {
      /* Focus stays in the input, which is what a screen reader asks, and
         the list pointed only itself at the option: arrowing moved the
         highlight in silence. */
      const host = await combobox()
      await press(host, 'ArrowDown')
      const input = control(host) as HTMLInputElement & {
        ariaActiveDescendantElement?: Element | null
      }
      const first = input.ariaActiveDescendantElement
      expect(first).toBe(options(host).find((option) => option.active) ?? null)
      expect(first).not.toBeNull()
      await press(host, 'ArrowDown')
      expect(input.ariaActiveDescendantElement).not.toBe(first)
      expect(input.ariaActiveDescendantElement).toBe(
        options(host).find((option) => option.active) ?? null,
      )
    })
  })
}

describe('Enter in a closed combobox', () => {
  /* The field is in a shadow root with no form owner, and the list took Enter
     even with the panel shut, so the form never submitted. */
  test('presses the form’s default button', async () => {
    document.body.innerHTML = `<form><helix-headless-combobox label="L" name="c" default-value="go">
      <helix-headless-option value="go">Go</helix-headless-option>
    </helix-headless-combobox><button>Send</button></form>`
    const host = document.querySelector('helix-headless-combobox') as Updatable
    await settle(host)
    let pressed = 0
    document.querySelector('button')?.addEventListener('click', (event) => {
      event.preventDefault()
      pressed += 1
    })
    await press(host, 'Enter')
    control(host).dispatchEvent(
      new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' }),
    )
    expect(pressed).toBe(1)
  })
})

describe('a read-only combobox', () => {
  test('keeps its choice, and its list stays shut', async () => {
    const host = (await combobox('readonly default-value="go"')) as Updatable & {
      open: boolean
      requestValue(next: string): boolean
      value: string
    }
    expect(control(host).readOnly).toBe(true)
    await press(host, 'ArrowDown')
    expect(host.open).toBe(false)
    expect(host.requestValue('rs')).toBe(false)
    expect(host.value).toBe('go')
  })
})

describe('a combobox with an option that is a link', () => {
  const followed: string[] = []
  /* Caught on the way down and kept from navigating, for one test at a time:
     left on the document, it would cancel every link click in the files after
     this one. */
  const follow = (event: Event): void => {
    if (event.target instanceof HTMLAnchorElement) {
      followed.push(event.target.getAttribute('href') ?? '')
      event.preventDefault()
    }
  }
  const catchLinks = (): void => {
    followed.length = 0
    document.addEventListener('click', follow, { capture: true })
  }
  afterEach(() => document.removeEventListener('click', follow, { capture: true }))
  const linked = async (): Promise<Updatable & { open: boolean; value: string }> => {
    document.body.innerHTML = `<helix-headless-combobox label="L">
      <helix-headless-option value="home">Home</helix-headless-option>
      <helix-headless-option value="docs" href="/docs">Docs</helix-headless-option>
    </helix-headless-combobox>`
    const host = document.body.firstElementChild as Updatable & { open: boolean; value: string }
    host.open = true
    await settle(host)
    return host
  }

  test('follows it, selects nothing, and closes as a choice does', async () => {
    catchLinks()
    const host = await linked()
    ;(host.children[1] as HTMLElement & { select(): void }).select()
    await settle(host)
    expect(followed).toEqual(['/docs'])
    expect(host.value).toBe('')
    expect(host.open).toBe(false)
  })

  test('stays open and follows nothing where the page cancels it', async () => {
    catchLinks()
    const host = await linked()
    host.addEventListener('helix-select', (event) => event.preventDefault())
    ;(host.children[1] as HTMLElement & { select(): void }).select()
    await settle(host)
    expect(followed).toEqual([])
    expect(host.open).toBe(true)
  })
})

describe('a combobox that waits for typing to rest', () => {
  test('narrows once, after `filter-delay`, and an arrow narrows at once', async () => {
    const host = await combobox('filter-delay="40"')
    const sent: string[] = []
    ;(host as HTMLElement).addEventListener('helix-filter', (event) =>
      sent.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    await type(host, 'r')
    await type(host, 'ru')
    expect(sent).toEqual([])
    expect(shown(host)).toEqual(['Rust', 'Ruby', 'Go'])
    await new Promise((done) => setTimeout(done, 80))
    await settle(host)
    expect(sent).toEqual(['ru'])
    expect(shown(host)).toEqual(['Rust', 'Ruby'])
    await type(host, 'g')
    await press(host, 'ArrowDown')
    expect(sent).toEqual(['ru', 'g'])
    expect(shown(host)).toEqual(['Go'])
  })
})

describe('the statuses a combobox hands its list', () => {
  const list = (host: Updatable): HTMLElement => part(host as HTMLElement, 'listbox') as HTMLElement

  test('`no-results-text` and `load-error` reach the list', async () => {
    const host = await combobox('no-results-text="Nothing like it" load-error="Offline"')
    const inner = list(host) as HTMLElement & { loadError: string; noResultsText?: string }
    expect(inner.noResultsText).toBe('Nothing like it')
    expect(inner.loadError).toBe('Offline')
    expect(part(inner, 'error')?.textContent?.trim()).toBe('Offline')
    const plain = await combobox('no-results-text="Nothing like it"')
    await type(plain, 'zzz')
    const list2 = list(plain)
    await settle(list2 as unknown as Updatable)
    expect(part(list2, 'empty')?.textContent?.trim()).toBe('Nothing like it')
  })

  test('a slotted no-results is handed on only while there is one', async () => {
    const bare = await combobox()
    const forward = (host: Updatable) =>
      (host as HTMLElement).shadowRoot?.querySelector('slot[name="no-results"]')
    expect(forward(bare)?.hasAttribute('slot')).toBe(false)
    document.body.innerHTML = `<helix-headless-combobox label="L">
      <helix-headless-option value="rs">Rust</helix-headless-option>
      <b slot="no-results">No language by that name</b>
    </helix-headless-combobox>`
    const given = document.body.firstElementChild as Updatable
    await settle(given)
    expect(forward(given)?.getAttribute('slot')).toBe('no-results')
  })
})
