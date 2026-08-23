import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, hasLayout, part, registerDom, type Updatable } from '@helix-io/testing/dom'

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
  document.body.innerHTML = `<helix-base-combobox label="L" name="c" ${extra}>
    <helix-base-option value="rs">Rust</helix-base-option>
    <helix-base-option value="rb">Ruby</helix-base-option>
    <helix-base-option value="go">Go</helix-base-option>
  </helix-base-combobox>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

const control = (host: Updatable): HTMLInputElement =>
  part(host as HTMLElement, 'control') as HTMLInputElement

const options = (host: Updatable): (HTMLElement & { active: boolean })[] =>
  [...(host as HTMLElement).querySelectorAll('helix-base-option')] as (HTMLElement & {
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

describe('combobox holding several', () => {
  const many = async (extra = ''): Promise<Updatable> => {
    document.body.innerHTML = `<helix-base-combobox label="L" multiple name="c" ${extra}>
      <helix-base-option value="rs">Rust</helix-base-option>
      <helix-base-option value="rb">Ruby</helix-base-option>
      <helix-base-option value="go">Go</helix-base-option>
    </helix-base-combobox>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    return host
  }

  const tags = (host: Updatable): HTMLElement[] => [
    // biome-ignore lint/style/noNonNullAssertion: spreading an optional chain throws when it yields undefined, which is what this rule's own automatic fix produced here. A mounted host has a shadow root and the spec has just mounted it.
    ...(host as HTMLElement).shadowRoot!.querySelectorAll<HTMLElement>('[part="tag"]'),
  ]

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

  test('the form is given the set, comma joined, and nothing when it is empty', async () => {
    const host = await many()
    expect(formValue(host as HTMLElement)).toBe(null)
    await type(host, 'ru')
    await press(host, 'Enter')
    await type(host, 'go')
    await press(host, 'Enter')
    expect(formValue(host as HTMLElement)).toBe('rs,go')
  })

  test('a refused choice leaves the control exactly where it was', async () => {
    /* Everything used to happen anyway: the filter cleared and the panel shut
       as though the option had been taken. Select was fixed for the same. */
    const host = await many()
    host.addEventListener('helix-change', (event) => event.preventDefault())
    await type(host, 'ru')
    await press(host, 'Enter')
    expect((host as unknown as { value: string }).value).toBe('')
    expect(tags(host).length).toBe(0)
    expect(control(host).value).toBe('ru')
    expect((host as unknown as { open: boolean }).open).toBe(true)
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
    document.body.innerHTML = `<helix-base-combobox creatable label="L" name="c" ${extra}>
      <helix-base-option value="rs">Rust</helix-base-option>
      <helix-base-option value="rb">Ruby</helix-base-option>
    </helix-base-combobox>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    return host
  }

  const row = (host: Updatable): HTMLElement | null =>
    (host as HTMLElement).shadowRoot?.querySelector<HTMLElement>('[part="create"]')

  test('the row is offered beside near misses, not only when nothing matches', async () => {
    // A reader typing "Ruby on Rails" with "Ruby" in the list wants the one
    // they are typing, not the one they are halfway through.
    const host = await open()
    await type(host, 'Rub')
    expect(row(host)?.textContent?.trim()).toBe('Add "Rub"')
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
    document.body.innerHTML = `<helix-base-combobox label="L" name="c" suggest ${extra}>
      <helix-base-option value="rs">Rust</helix-base-option>
      <helix-base-option value="rb">Ruby</helix-base-option>
      <helix-base-option value="go">Go</helix-base-option>
    </helix-base-combobox>`
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
    /* Only the listbox's copy of the filter was cleared on close, so `typed`
       survived a dismissal: the field looked empty because a closed field shows
       the chosen words instead, and reopening put the old search back with the
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
      document.body.innerHTML = `<helix-base-combobox label="L" multiple name="c" ${extra}>
        <helix-base-option value="rs">Rust</helix-base-option>
        <helix-base-option value="rb">Ruby</helix-base-option>
        <helix-base-option value="go">Go</helix-base-option>
      </helix-base-combobox>`
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
      expect(surface.style.getPropertyValue('--floating-anchor-width')).toMatch(/^\d+px$/)
    })
  })
}
