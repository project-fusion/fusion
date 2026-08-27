import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  mount,
  part,
  registerDom,
  type Updatable,
} from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const settle = async (host: Updatable): Promise<void> => {
  while ((await host.updateComplete) === false) {
    // Validity moves outside the property system, so this takes two passes.
  }
}

const list = async (extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-listbox label="L" name="c" ${extra}>
    <helix-headless-option value="one">Alpha</helix-headless-option>
    <helix-headless-option value="two">Beta</helix-headless-option>
    <helix-headless-option value="three">Gamma</helix-headless-option>
  </helix-headless-listbox>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

const options = (host: Updatable): (HTMLElement & { active: boolean; selected: boolean })[] =>
  [...host.children] as (HTMLElement & { active: boolean; selected: boolean })[]

const press = async (host: Updatable, key: string): Promise<void> => {
  host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
  await settle(host)
}

describe('listbox', () => {
  test('is a listbox, named on internals rather than on the host', async () => {
    const host = (await list()) as Updatable & { internals: ElementInternals }
    expect(host.internals.role).toBe('listbox')
    expect(host.getAttribute('role')).toBeNull()
  })

  test('moving is choosing when only one can be chosen', async () => {
    // Which is the radio group pattern, and is what arrow keys do in a
    // single-select list.
    const host = (await list('default-value="one"')) as Updatable & { value: string }
    await press(host, 'ArrowDown')
    expect(host.value).toBe('two')
  })

  test('moving is not choosing when several can be', async () => {
    /* A reader passing over four options on the way to the fifth did not mean
       to pick all five, so with `multiple` the arrows move and Space chooses. */
    const host = (await list('multiple default-value="one"')) as Updatable & { value: string }
    await press(host, 'ArrowDown')
    expect(host.value).toBe('one')
    expect(options(host)[1]?.active).toBe(true)

    await press(host, ' ')
    expect(host.value).toBe('one,two')
  })

  test('choosing the same option again takes it back', async () => {
    // The same press has to be able to undo itself, or a mis-tap is permanent.
    const host = (await list('multiple default-value="one,two"')) as Updatable & { value: string }
    await press(host, 'ArrowDown')
    await press(host, ' ')
    expect(host.value).toBe('one')
  })

  test('the value is comma separated, and is what the form submits', async () => {
    const host = await list('multiple default-value="one,three"')
    expect(formValue(host)).toBe('one,three')
    expect(options(host).map((option) => option.selected)).toEqual([true, false, true])
  })

  test('a refused change leaves the answer alone', async () => {
    const host = (await list('default-value="one"')) as Updatable & { value: string }
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    await press(host, 'ArrowDown')
    expect(host.value).toBe('one')
  })
})

/** The search field, which only exists on a list that says it is filterable. */
const field = (host: Updatable): HTMLInputElement => {
  const input = host.shadowRoot?.querySelector<HTMLInputElement>('[part="search-field"]')
  if (!input) {
    throw new Error('the list rendered no search field, so there is nothing to type into')
  }
  return input
}

/** Types into the search field the way a reader does, one whole value. */
const type = (host: Updatable, value: string): void => {
  const input = field(host)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('listbox filtering ownership', () => {
  test('typing is announced, and refusing it leaves the list as it was', async () => {
    const host = (await list('filterable')) as Updatable & { filter: string }
    host.addEventListener('helix-filter', (event) => event.preventDefault())
    type(host, 'gam')
    await host.updateComplete
    expect(host.filter).toBe('')
    // And the field is put back, because a refused keystroke that stays on
    // screen is a control showing something the component does not have.
    expect(field(host).value).toBe('')
  })

  test("a filter nobody declared is the list's, and typing narrows it", async () => {
    const host = (await list('filterable')) as Updatable & { filter: string }
    type(host, 'gam')
    await host.updateComplete
    expect(host.filter).toBe('gam')
    expect(options(host).filter((option) => !option.hasAttribute('hidden'))).toHaveLength(1)
  })

  test('a declared filter is a seed, and typing still moves it', async () => {
    const host = (await list('filterable filter="be"')) as Updatable & { filter: string }
    let announced: string | undefined
    host.addEventListener('helix-filter', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    type(host, 'gam')
    await host.updateComplete
    expect(announced).toBe('gam')
    expect(host.filter).toBe('gam')
    expect(field(host).value).toBe('gam')

    // And a refusal is what would have held it. See 294.
    host.filter = 'be'
    await host.updateComplete
    expect(host.filter).toBe('be')
  })

  test("a seeded filter is the list's own, and typing over it works", async () => {
    const host = (await list('filterable default-filter="be"')) as Updatable & { filter: string }
    expect(host.filter).toBe('be')
    type(host, 'gam')
    await host.updateComplete
    expect(host.filter).toBe('gam')
  })

  test('Escape goes down the same path, so a consumer can refuse the clearing', async () => {
    const host = (await list('filterable default-filter="be"')) as Updatable & { filter: string }
    host.addEventListener('helix-filter', (event) => event.preventDefault())
    field(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }),
    )
    await host.updateComplete
    expect(host.filter).toBe('be')
  })
})

describe('listbox filtering', () => {
  test('hides rather than removes, so clearing puts the list back', async () => {
    /* An option the filter excluded is still the consumer's element in the
       consumer's order, so nothing is re-rendered when the filter goes. */
    const host = (await list('filter="be"')) as Updatable & { filter: string }
    expect(options(host).map((option) => option.hidden)).toEqual([true, false, true])

    host.filter = ''
    await settle(host)
    expect(options(host).every((option) => !option.hidden)).toBe(true)
  })

  test('the keyboard cannot sit on something the filter hid', async () => {
    // A list whose active option has just been filtered away is a list the next
    // arrow press would start from the top of anyway.
    const host = (await list('default-value="one"')) as Updatable & { filter: string }
    host.filter = 'gam'
    await settle(host)
    expect(options(host)[2]?.active).toBe(true)
    expect(options(host)[0]?.active).toBe(false)
  })

  test('a group the filter has emptied goes with its options', async () => {
    /* CSS cannot do this: the rule would be `:host(:has(...))`, which is
       dropped at parse time. The listbox can, because it did the hiding. Left
       showing, the picture was a heading over nothing. */
    document.body.innerHTML = `<helix-headless-listbox label="L">
      <helix-headless-option-group label="One"><helix-headless-option value="a">Alpha</helix-headless-option></helix-headless-option-group>
      <helix-headless-option-group label="Two"><helix-headless-option value="b">Beta</helix-headless-option></helix-headless-option-group>
    </helix-headless-listbox>`
    const host = document.body.firstElementChild as Updatable & { filter: string }
    await settle(host)
    host.filter = 'alph'
    await settle(host)

    const groups = [...host.children] as HTMLElement[]
    expect(groups[0]?.hidden).toBe(false)
    expect(groups[1]?.hidden).toBe(true)
  })

  test('a filter matching nothing says so', async () => {
    const host = (await list('filter="zzz"')) as Updatable
    expect((part(host, 'empty') as HTMLElement).textContent?.trim()).toBe('No matches')
  })
})

describe('the keyboard in a filterable list', () => {
  /* Presses into the search field, which is where a reader of a filterable list
     is: not on the host, which is what every other keyboard test here uses. The
     difference is the whole subject of this block. */
  const into = async (host: Updatable, key: string): Promise<void> => {
    field(host).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key }))
    await settle(host)
  }

  test('an arrow moves one option, and moves it once', async () => {
    /* Measured before this was true: one Down advanced two rows, because the
       field moved focus to `[part="items"]` and re-dispatched the key there,
       and the original press then went on bubbling to the same host handler.
       Two handlings, one press. */
    const host = (await list('filterable')) as Updatable
    await into(host, 'ArrowDown')
    expect(options(host).map((option) => option.active)).toEqual([true, false, false])
    await into(host, 'ArrowDown')
    expect(options(host).map((option) => option.active)).toEqual([false, true, false])
    await into(host, 'ArrowUp')
    expect(options(host).map((option) => option.active)).toEqual([true, false, false])
  })

  test('moving is not choosing, because the reader is in a field', async () => {
    /* The rule `navigate` states: a listbox and a combobox differ by which
       element the focus is in. A reader typing into a filter is in the second
       case, so the arrows move a highlight and Enter takes it. Measured before
       this: the first Down committed a value, which in `Command` meant a
       palette that navigated away on the first arrow press. */
    const host = (await list('filterable')) as Updatable & { value: string }
    const chosen: string[] = []
    host.addEventListener('helix-before-change', (event) => {
      chosen.push((event as CustomEvent<{ value: string }>).detail.value)
      event.preventDefault()
    })

    await into(host, 'ArrowDown')
    await into(host, 'ArrowDown')
    expect(chosen).toEqual([])

    await into(host, 'Enter')
    expect(chosen).toEqual(['two'])
  })

  test('focus stays in the field, so the next character still lands there', async () => {
    const host = (await list('filterable')) as Updatable
    field(host).focus()
    await into(host, 'ArrowDown')
    expect(host.shadowRoot?.activeElement).toBe(field(host))
  })
})

/* Only in a real engine. `ariaActiveDescendantElement` is an element reference,
   which happy-dom does not implement, and the component feature-tests it: under
   a shim the guard declines and there is nothing to assert. `hasLayout` stands
   in for "a real browser", which is what is actually being asked for. */
if (hasLayout()) {
  describe('listbox active descendant', () => {
    const listbox = async (): Promise<HTMLElement> => {
      const host = (await mount(
        `<helix-headless-listbox label="Owner" default-value="a">
          <helix-headless-option value="a">Ross</helix-headless-option>
          <helix-headless-option value="b">Sam</helix-headless-option>
          <helix-headless-option value="c">Kit</helix-headless-option>
        </helix-headless-listbox>`,
      )) as HTMLElement
      await settle(host as Updatable)
      return host
    }

    const active = (host: HTMLElement): string => {
      const list = part(host, 'items') as Element & {
        ariaActiveDescendantElement?: (Element & { value?: string }) | null
      }
      return list.ariaActiveDescendantElement?.value ?? ''
    }

    const press = async (host: HTMLElement, key: string): Promise<void> => {
      host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
      await settle(host as Updatable)
    }

    test('the focused list points at the option the keyboard is on', async () => {
      /* An element reference and not an IDREF, which is the whole reason this
         needs a browser to assert. The options are the consumer's light DOM and
         the element that takes focus is in the shadow root, so an id would
         resolve against the shadow tree, find nothing, and be dropped without a
         word. The reference resolves outward instead. */
      const host = await listbox()
      expect(active(host)).toBe('a')
      await press(host, 'ArrowDown')
      expect(active(host)).toBe('b')
      await press(host, 'ArrowDown')
      expect(active(host)).toBe('c')
      await press(host, 'Home')
      expect(active(host)).toBe('a')
    })

    test('the reference reaches the light DOM, which an IDREF could not', async () => {
      const host = await listbox()
      const list = part(host, 'items') as Element & {
        ariaActiveDescendantElement?: Element | null
      }
      expect(list.ariaActiveDescendantElement?.getRootNode()).toBe(document)
    })
  })
}

/* Same engine requirement as the block above, for the same property. */
if (hasLayout()) {
  describe('a filterable list announces from its field', () => {
    test('the field points at the option the keyboard is on', async () => {
      /* `aria-activedescendant` is read from the *focused* element. Focus stays
         in the filter now, so pointing `[part="items"]` at the active option
         would be announcing to an element nobody is in: the list would move a
         highlight and a screen reader would hear none of it. */
      const host = (await list('filterable')) as Updatable
      const says = (): string =>
        (
          field(host) as HTMLInputElement & {
            ariaActiveDescendantElement?: (Element & { value?: string }) | null
          }
        ).ariaActiveDescendantElement?.value ?? ''

      field(host).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowDown' }),
      )
      await settle(host)
      expect(says()).toBe('one')
    })
  })
}

if (hasLayout()) {
  describe('choosing an option with a pointer', () => {
    test('a click on an option chooses it', async () => {
      /* Nothing anywhere listened for a click on an option: not the option,
         which only had a `select()` method, and not the listbox, which listened
         for `helix-select` and for keys. So a list could be operated with a
         keyboard and not with a mouse, for as long as it has existed. Every
         spec for it chose by key or by method, which is exactly why. */
      const host = (await mount(
        `<helix-headless-listbox label="Owner">
          <helix-headless-option value="one">One</helix-headless-option>
          <helix-headless-option value="two">Two</helix-headless-option>
        </helix-headless-listbox>`,
      )) as Updatable & { value: string }
      await host.updateComplete

      const option = (host as HTMLElement).querySelector(
        'helix-headless-option[value="two"]',
      ) as HTMLElement
      await (option as unknown as { updateComplete: Promise<boolean> }).updateComplete
      const row = option.shadowRoot?.querySelector('[part="item"]') as HTMLElement | null
      if (!row) {
        throw new Error('the option renders no row, so there is nothing to press')
      }
      row.click()
      await host.updateComplete

      expect(host.value).toBe('two')
    })
  })

  describe('listbox marks what it matched', () => {
    /* Only in a browser, and this time for the API rather than for layout:
       `CSS.highlights` and `Highlight` are the platform's, happy-dom has
       neither, and the component checks for both before it paints. */
    const marks = (): string[] =>
      [...(CSS.highlights.get('helix-filter-match') ?? [])].map((range) => range.toString())

    const filtered = async (needle: string): Promise<HTMLElement> => {
      document.body.innerHTML = `<helix-headless-listbox aria-label="L">
        <helix-headless-option value="rs">Rust</helix-headless-option>
        <helix-headless-option value="rb">Ruby</helix-headless-option>
        <helix-headless-option value="go">Go</helix-headless-option>
      </helix-headless-listbox>`
      const host = document.body.firstElementChild as HTMLElement & {
        requestFilter: (next: string) => boolean
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      host.requestFilter(needle)
      await host.updateComplete
      return host
    }

    test('every showing option is marked, at the part that matched', async () => {
      await filtered('ru')
      expect(marks()).toEqual(['Ru', 'Ru'])
    })

    test('matched without regard to case, and marked in the option"s own', async () => {
      await filtered('RU')
      expect(marks()).toEqual(['Ru', 'Ru'])
    })

    test('nothing matching leaves nothing marked', async () => {
      await filtered('zzz')
      expect(marks()).toEqual([])
    })

    test('and clearing the filter clears them', async () => {
      const host = (await filtered('ru')) as HTMLElement & {
        requestFilter: (next: string) => boolean
        updateComplete: Promise<boolean>
      }
      host.requestFilter('')
      await host.updateComplete
      expect(marks()).toEqual([])
    })

    test('a list taken off the page takes its marks with it', async () => {
      /* The registry is the document's and outlives the element, so a list
         removed while filtered would leave ranges over text that is no longer
         there. */
      const host = await filtered('ru')
      host.remove()
      await new Promise((resolve) => requestAnimationFrame(resolve))
      expect(marks()).toEqual([])
    })
  })
}
