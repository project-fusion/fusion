import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  hasState,
  mount,
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

const options = (
  host: Updatable,
): (HTMLElement & { active: boolean; select(): void; selected: boolean })[] =>
  [...host.children] as (HTMLElement & { active: boolean; select(): void; selected: boolean })[]

const press = async (host: Updatable, key: string): Promise<void> => {
  host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
  await settle(host)
}

describe('listbox', () => {
  test('the list that takes focus is the listbox, named by the label in its own tree', async () => {
    /* The host was the listbox, and it holds the label, the filter, the hint
       and the feedback, none of which a listbox may contain, while the element
       that took focus and held the active descendant had no role at all. */
    const host = (await list('multiple')) as Updatable & { internals: ElementInternals }
    const items = part(host as HTMLElement, 'items') as HTMLElement
    expect(items.getAttribute('role')).toBe('listbox')
    expect(items.getAttribute('aria-multiselectable')).toBe('true')
    const named = items.getAttribute('aria-labelledby') ?? ''
    const scope = items.getRootNode() as ShadowRoot
    expect(scope.getElementById(named)?.textContent?.trim()).not.toBe('')
    expect(host.internals.role).toBeFalsy()
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

  test('the value is comma separated, and the form is sent one entry per answer', async () => {
    /* One entry each, as a native `<select multiple>` sends them: a server
       reading `c=one,three` has to know to split it on a comma this library
       chose, and Date Picker already sent its dates the other way. */
    const host = (await list('multiple default-value="one,three"')) as Updatable & { value: string }
    expect(host.value).toBe('one,three')
    expect((formValue(host) as FormData).getAll('c')).toEqual(['one', 'three'])
    expect(options(host).map((option) => option.selected)).toEqual([true, false, true])
  })

  test('a refused change leaves the answer alone', async () => {
    const host = (await list('default-value="one"')) as Updatable & { value: string }
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    await press(host, 'ArrowDown')
    expect(host.value).toBe('one')
  })

  test('and refusing the option`s own event leaves it alone too', async () => {
    /* `helix-select` is cancelable and `Option` documents it as refusable. The
       list is the one thing that acts on it, so a refusal it ignored was a veto
       that did nothing anywhere: valid code, no error, and the option being
       chosen regardless. Bound on the option, which is the position that can
       refuse a bubbling event before the list sees it. */
    const host = (await list('default-value="one"')) as Updatable & { value: string }
    const third = options(host)[2] as HTMLElement & { select(): void }
    third.addEventListener('helix-select', (event) => event.preventDefault())
    third.select()
    await settle(host)
    expect(host.value).toBe('one')
    expect(options(host).map((option) => option.selected)).toEqual([true, false, false])
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

describe('a list with nothing in it', () => {
  /* The words and the moment they appear belong to `MixinCollection`, which has
     its own spec beside it in `helix/core`. What belongs here is that the list
     narrows its own set to nothing and says so in the consumer's words rather
     than the library's: `emptyText` is overridden on this class to "No
     matches", so a filter that emptied the list while showing the mixin's own
     default would be this override silently not applying. */
  test('says so in the consumer’s words, once it has looked', async () => {
    document.body.innerHTML =
      '<helix-headless-listbox label="L" empty-text="Nobody by that name"></helix-headless-listbox>'
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nobody by that name')
  })

  test('and a filter that matches nothing empties it the same way', async () => {
    const host = (await list('filterable empty-text="Nobody by that name"')) as Updatable & {
      requestFilter: (next: string) => boolean
    }
    host.requestFilter('zzz')
    await settle(host)
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nobody by that name')
  })
})

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

    // And a refusal is what would have held it.
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

  test('a space is typed into the field, and chooses nothing', async () => {
    /* Measured before this: the space reached the host handler, which took it
       for choosing, so "New Y" chose New York and the field read "NewY". The
       same handler served Select's filter and the command palette. */
    const host = (await list('filterable')) as Updatable & { value: string }
    type(host, 'a')
    await settle(host)
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: ' ',
    })
    field(host).dispatchEvent(event)
    await settle(host)
    expect(event.defaultPrevented).toBe(false)
    expect(host.value).toBe('')
  })

  test('the field is the one tab stop, and the list is not a second', async () => {
    /* A second stop on the list was one where the arrows chose as they moved,
       so in a command palette a Tab and an arrow ran a command. */
    const host = (await list('filterable')) as Updatable
    expect((part(host, 'items') as HTMLElement).hasAttribute('tabindex')).toBe(false)
  })
})

describe('the keyboard in a list', () => {
  const active = (host: Updatable): string | undefined =>
    options(host)
      .find((option) => option.active)
      ?.textContent?.trim()

  test('with `manual`, the arrows move without choosing, and Enter chooses', async () => {
    const host = (await list('manual default-value="one"')) as Updatable & { value: string }
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    expect(host.value).toBe('one')
    expect(active(host)).toBe('Gamma')
    await press(host, 'Enter')
    expect(host.value).toBe('three')
  })

  test('a letter moves to the option whose words start with it', async () => {
    const host = (await list('manual')) as Updatable & { value: string }
    await press(host, 'g')
    expect(active(host)).toBe('Gamma')
    expect(host.value).toBe('')
  })

  test('and chooses it, where moving is choosing', async () => {
    const host = (await list()) as Updatable & { value: string }
    await press(host, 'b')
    expect(host.value).toBe('two')
  })

  test('PageDown and PageUp move a page, stopping at the ends', async () => {
    const host = (await list('manual')) as Updatable
    await press(host, 'ArrowDown')
    await press(host, 'PageDown')
    expect(active(host)).toBe('Gamma')
    await press(host, 'PageUp')
    expect(active(host)).toBe('Alpha')
  })

  test('a value set from outside takes the highlight with it', async () => {
    /* Measured before this: the highlight stayed on the option picked before,
       so the first arrow after a script set the value moved from the old pick
       and chose its neighbor. */
    const host = (await list()) as Updatable & { value: string }
    await press(host, 'End')
    expect(host.value).toBe('three')
    host.value = 'one'
    await settle(host)
    await press(host, 'ArrowDown')
    expect(host.value).toBe('two')
  })
})

describe('an option the markup declares chosen', () => {
  test('is the list`s value, and what a reset returns to', async () => {
    document.body.innerHTML = `<helix-headless-listbox label="L" name="c">
      <helix-headless-option value="one">Alpha</helix-headless-option>
      <helix-headless-option value="two" selected>Beta</helix-headless-option>
    </helix-headless-listbox>`
    const host = document.querySelector('helix-headless-listbox') as Updatable & {
      formResetCallback(): void
      value: string
    }
    await settle(host)
    expect(host.value).toBe('two')
    expect(formValue(host)).toBe('two')
    host.value = 'one'
    await settle(host)
    // happy-dom runs no reset algorithm, so the callback is called as a form would.
    host.formResetCallback()
    await settle(host)
    expect(host.value).toBe('two')
  })
})

describe('an option that leaves', () => {
  test('takes its value with it, so the form no longer submits it', async () => {
    const host = (await list('default-value="two"')) as Updatable & { value: string }
    options(host)[1]?.remove()
    await settle(host)
    expect(host.value).toBe('')
    expect(formValue(host)).toBeNull()
  })

  test('while a value set ahead of its options is kept until they arrive', async () => {
    const host = (await list('default-value="four"')) as Updatable & { value: string }
    expect(host.value).toBe('four')
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
      /* With nothing listening for a click on an option, a list is operable by
         keyboard and not by mouse, and every other spec here chooses by key or
         by method, so nothing else would catch it. */
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
      const row = option.shadowRoot?.querySelector('[part~="item"]') as HTMLElement | null
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

describe('choosing several from the keyboard', () => {
  const key = async (
    host: Updatable,
    name: string,
    init: KeyboardEventInit = {},
  ): Promise<void> => {
    host.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: name, ...init }),
    )
    await settle(host)
  }

  test('Shift with an arrow adds the option it moves to', async () => {
    const host = (await list('multiple default-value="one"')) as Updatable & { value: string }
    await key(host, 'ArrowDown', { shiftKey: true })
    expect(host.value).toBe('one,two')
  })

  test('and from a filter field moves the highlight and leaves the value', async () => {
    /* The field keeps Shift with an arrow for its text, as the keyboard table
       says: the highlight moves and nothing is added. */
    const host = (await list('multiple filterable default-value="two"')) as Updatable & {
      value: string
    }
    const down = async (shiftKey: boolean): Promise<void> => {
      field(host).dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: 'ArrowDown',
          shiftKey,
        }),
      )
      await settle(host)
    }
    await down(false)
    await down(true)
    expect(options(host).map((option) => option.active)).toEqual([true, false, false])
    expect(host.value).toBe('two')
  })

  test('Control+A chooses every option, and again takes them all back', async () => {
    const host = (await list('multiple')) as Updatable & { value: string }
    await key(host, 'a', { ctrlKey: true })
    expect(host.value).toBe('one,two,three')
    await key(host, 'a', { ctrlKey: true })
    expect(host.value).toBe('')
  })
})

describe('the filter field', () => {
  test('says it narrows a list, as a combobox input does', async () => {
    const host = (await list('filterable')) as Updatable
    expect(field(host).getAttribute('aria-autocomplete')).toBe('list')
  })
})

describe('a filter says how many it left', () => {
  /* React Aria and Web Awesome say the count as a filter narrows; only "No
     matches" was said here, so a query that left forty and one that left one
     sounded the same. */
  const live = (host: Updatable): string => part(host, 'live')?.textContent?.trim() ?? ''

  test('the region says the count, in the singular for one', async () => {
    const host = (await list('filterable')) as Updatable & {
      requestFilter: (next: string) => boolean
    }
    expect(live(host)).toBe('')
    host.requestFilter('a')
    await settle(host)
    expect(live(host)).toBe('3 results')
    host.requestFilter('gam')
    await settle(host)
    expect(live(host)).toBe('1 result')
  })

  test('none left says the empty text, and a cleared filter says nothing', async () => {
    const host = (await list('filterable')) as Updatable & {
      requestFilter: (next: string) => boolean
    }
    host.requestFilter('zzz')
    await settle(host)
    expect(live(host)).toBe('No matches')
    host.requestFilter('')
    await settle(host)
    expect(live(host)).toBe('')
  })

  test('the words are the page’s', async () => {
    const host = (await list(
      'filterable result-label="{count} Treffer" results-label="{count} Treffer gesamt"',
    )) as Updatable & { requestFilter: (next: string) => boolean }
    host.requestFilter('beta')
    await settle(host)
    expect(live(host)).toBe('1 Treffer')
  })
})

describe('the empty and loading lines', () => {
  test('take slotted content in place of their text', async () => {
    document.body.innerHTML = `<helix-headless-listbox label="L">
      <p slot="empty">Nothing yet. <a href="#new">Add one</a></p>
      <span slot="loading">Fetching</span>
    </helix-headless-listbox>`
    const host = document.body.firstElementChild as Updatable & { loading: boolean }
    await settle(host)
    const empty = part(host, 'empty')?.querySelector('slot[name="empty"]') as HTMLSlotElement
    expect(empty.assignedElements()[0]?.textContent).toContain('Add one')
    host.loading = true
    await settle(host)
    const loading = part(host, 'loading')?.querySelector('slot[name="loading"]') as HTMLSlotElement
    expect(loading.assignedElements()[0]?.textContent).toBe('Fetching')
  })

  test('and the host says which it is showing', async () => {
    const host = (await list('filterable')) as Updatable & {
      loading: boolean
      requestFilter: (next: string) => boolean
    }
    expect(hasState(host, 'empty')).toBe(false)
    host.requestFilter('zzz')
    await settle(host)
    expect(hasState(host, 'empty')).toBe(true)
    host.loading = true
    await settle(host)
    expect(hasState(host, 'loading')).toBe(true)
    expect(hasState(host, 'empty')).toBe(false)
  })
})

describe('the no-results and error lines', () => {
  const live = (host: Updatable): string => part(host, 'live')?.textContent?.trim() ?? ''
  test('a filter that hides every option says `no-results-text`, and a list with none says `empty-text`', async () => {
    const host = (await list('filterable no-results-text="Nothing matches"')) as Updatable & {
      requestFilter: (next: string) => boolean
    }
    host.requestFilter('zzz')
    await settle(host)
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nothing matches')
    expect(part(host, 'empty')?.querySelector('slot')?.getAttribute('name')).toBe('no-results')
    expect(live(host)).toBe('Nothing matches')
    expect(hasState(host, 'no-results')).toBe(true)
    expect(hasState(host, 'empty')).toBe(true)
    document.body.innerHTML =
      '<helix-headless-listbox label="L" no-results-text="Nothing matches"></helix-headless-listbox>'
    const bare = document.body.firstElementChild as Updatable
    await settle(bare)
    expect(part(bare, 'empty')?.textContent?.trim()).toBe('No matches')
  })

  test('without `no-results-text` a hidden list draws its empty line as it always has', async () => {
    document.body.innerHTML = `<helix-headless-listbox label="L" filterable>
      <helix-headless-option value="a">Alpha</helix-headless-option>
      <b slot="empty">Nobody</b>
    </helix-headless-listbox>`
    const host = document.body.firstElementChild as Updatable & {
      requestFilter: (next: string) => boolean
    }
    await settle(host)
    host.requestFilter('zzz')
    await settle(host)
    const line = part(host, 'empty') as HTMLElement
    const shown = line.querySelector('slot[name="empty"]') as HTMLSlotElement
    expect(shown.assignedElements()[0]?.textContent).toBe('Nobody')
    expect(live(host)).toBe('No matches')
    expect(hasState(host, 'no-results')).toBe(true)
  })

  test('`load-error` shows under the options and is heard', async () => {
    const host = (await list('load-error="Could not load people"')) as Updatable & {
      loadError: string
    }
    expect(part(host, 'error')?.textContent?.trim()).toBe('Could not load people')
    expect(live(host)).toBe('Could not load people')
    expect(hasState(host, 'error')).toBe(true)
    expect(host.querySelectorAll('helix-headless-option').length).toBeGreaterThan(0)
    host.loadError = ''
    await settle(host)
    expect(part(host, 'error')).toBeNull()
    expect(hasState(host, 'error')).toBe(false)
  })

  /* Removing the attribute gives the property null, which the list read as
     an error with no words: the state stayed on and the error part stayed
     drawn, empty. */
  test('removing `load-error`, or setting it to null, clears the error', async () => {
    const host = (await list('load-error="Could not load people"')) as Updatable & {
      loadError: string | null
    }
    host.removeAttribute('load-error')
    await settle(host)
    expect(part(host, 'error')).toBeNull()
    expect(hasState(host, 'error')).toBe(false)
    host.loadError = 'Offline'
    await settle(host)
    expect(hasState(host, 'error')).toBe(true)
    host.loadError = null
    await settle(host)
    expect(part(host, 'error')).toBeNull()
    expect(hasState(host, 'error')).toBe(false)
  })
})

describe('ranges from the keyboard', () => {
  /* APG's multiple-selection listbox: Shift with Home or End takes in every
     option from the highlight to that end. */
  test('Shift and End add every option from the highlight to the last', async () => {
    const host = (await list('multiple')) as Updatable & { value: string }
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End', shiftKey: true }))
    await settle(host)
    expect(host.value.split(',').sort()).toEqual(['three', 'two'].sort())
  })

  test('and Control, Shift and Home every option back to the first', async () => {
    const host = (await list('multiple')) as Updatable & { value: string }
    await press(host, 'End')
    host.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 'Home', shiftKey: true }),
    )
    await settle(host)
    expect(host.value.split(',').sort()).toEqual(['one', 'three', 'two'])
  })

  /* The field keeps Home and End, and Shift with them, for its text. Measured
     before this: Control with Shift and End did nothing from the field. */
  test('from a filter field, Control and Shift with End or Home', async () => {
    const host = (await list('multiple filterable')) as Updatable & { value: string }
    const send = async (init: KeyboardEventInit): Promise<boolean> => {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        ...init,
      })
      field(host).dispatchEvent(event)
      await settle(host)
      return event.defaultPrevented
    }
    await send({ key: 'ArrowDown' })
    expect(await send({ key: 'End', shiftKey: true })).toBe(false)
    expect(host.value).toBe('')
    expect(await send({ ctrlKey: true, key: 'End', shiftKey: true })).toBe(true)
    expect(host.value.split(',').sort()).toEqual(['one', 'three', 'two'])
  })
})

describe('an option that is a link', () => {
  const linked = async (extra = ''): Promise<Updatable & { value: string }> => {
    document.body.innerHTML = `<helix-headless-listbox label="L" ${extra}>
      <helix-headless-option value="one">Alpha</helix-headless-option>
      <helix-headless-option value="docs" href="/docs">Docs</helix-headless-option>
    </helix-headless-listbox>`
    const host = document.body.firstElementChild as Updatable & { value: string }
    await settle(host)
    return host
  }
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

  test('is passed over by the arrows without being chosen or followed', async () => {
    catchLinks()
    const host = await linked('default-value="one"')
    await press(host, 'ArrowDown')
    expect(host.value).toBe('one')
    expect(followed).toEqual([])
  })

  test('is followed by Enter, and the selection stays as it was', async () => {
    catchLinks()
    const host = await linked('manual default-value="one"')
    await press(host, 'ArrowDown')
    await press(host, 'Enter')
    expect(followed).toEqual(['/docs'])
    expect(host.value).toBe('one')
  })

  test('is followed by a press, and its helix-select reaches the page', async () => {
    catchLinks()
    const host = await linked()
    const said: unknown[] = []
    document.body.addEventListener('helix-select', (event) =>
      said.push((event as CustomEvent).detail),
    )
    ;(host.children[1] as HTMLElement & { select(): void }).select()
    await settle(host)
    expect(followed).toEqual(['/docs'])
    expect(said).toEqual([{ href: '/docs', value: 'docs' }])
    expect(host.value).toBe('')
  })
})

describe('a filter that waits for typing to rest', () => {
  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

  test('filters once, on the word, after `filter-delay`', async () => {
    const host = (await list('filterable filter-delay="30"')) as Updatable & { filter: string }
    const heard: string[] = []
    host.addEventListener('helix-filter', (event) =>
      heard.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    type(host, 'g')
    type(host, 'ga')
    type(host, 'gam')
    expect(host.filter).toBe('')
    expect(field(host).value).toBe('gam')
    await wait(60)
    await settle(host)
    expect(heard).toEqual(['gam'])
    expect(host.filter).toBe('gam')
  })

  test('filters at once where an arrow key comes before the rest', async () => {
    const host = (await list('filterable filter-delay="1000"')) as Updatable & { filter: string }
    type(host, 'be')
    field(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowDown' }),
    )
    await settle(host)
    expect(host.filter).toBe('be')
  })

  test('Escape takes text still waiting, so nothing filters later', async () => {
    const host = (await list('filterable filter-delay="20"')) as Updatable & { filter: string }
    type(host, 'al')
    field(host).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Escape',
      }),
    )
    await wait(40)
    await settle(host)
    expect(host.filter).toBe('')
    expect(field(host).value).toBe('')
  })
})

describe('a list that asks for more', () => {
  const scrolled = (host: Updatable, top: number): void => {
    const items = part(host, 'items') as HTMLElement
    Object.defineProperty(items, 'clientHeight', { configurable: true, value: 100 })
    Object.defineProperty(items, 'scrollHeight', { configurable: true, value: 400 })
    Object.defineProperty(items, 'scrollTop', { configurable: true, value: top })
    items.dispatchEvent(new Event('scroll'))
  }

  test('asks once within a screen of the end, and again only after more arrive', async () => {
    const host = (await list()) as Updatable & { loading: boolean }
    let asked = 0
    host.addEventListener('helix-load-more', () => {
      asked += 1
    })
    scrolled(host, 50)
    expect(asked).toBe(0)
    scrolled(host, 220)
    scrolled(host, 300)
    expect(asked).toBe(1)
    host.append(Object.assign(document.createElement('helix-headless-option'), { value: 'more' }))
    await settle(host)
    host.loading = true
    await settle(host)
    scrolled(host, 300)
    expect(asked).toBe(1)
    host.loading = false
    await settle(host)
    scrolled(host, 300)
    expect(asked).toBe(2)
  })
})

/**
 * Runs a mount against a stated platform rather than the one running the suite,
 * as Kbd's spec does: this file also runs in a browser, on the host's own agent.
 */
const onPlatform = async <T>(agent: string, run: () => Promise<T>): Promise<T> => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: agent })
  try {
    return await run()
  } finally {
    if (original === undefined) {
      delete (navigator as { userAgent?: string }).userAgent
    } else {
      Object.defineProperty(navigator, 'userAgent', original)
    }
  }
}

describe('a filterable list heard through VoiceOver', () => {
  const into = async (host: Updatable, key: string): Promise<void> => {
    field(host).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key }))
    await settle(host)
  }
  const said = (host: Updatable): string | undefined => part(host, 'live')?.textContent?.trim()

  /* React Aria's combobox on Apple devices: VoiceOver does not read the
     option `aria-activedescendant` points to from a text field. */
  test('says the option the arrows reach from the field, and whether it is chosen', async () => {
    await onPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', async () => {
      const host = await list('filterable value="two"')
      field(host).focus()
      expect(said(host)).toBe('')
      await into(host, 'ArrowUp')
      expect(said(host)).toBe('Alpha')
      await into(host, 'ArrowDown')
      expect(said(host)).toBe('Beta, selected')
      type(host, 'al')
      await settle(host)
      expect(said(host)).toBe('1 result')
    })
  })

  test('and says nothing new elsewhere, where screen readers follow the field', async () => {
    await onPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', async () => {
      const host = await list('filterable')
      field(host).focus()
      await into(host, 'ArrowDown')
      expect(said(host)).toBe('')
    })
  })
})

describe('a listbox a browser can autofill', () => {
  /* React Aria's HiddenSelect: a browser fills native fields only. Measured
     before this, `autocomplete` went on the filter field, and a list with no
     filter gave the browser nothing to fill. */
  const hidden = (host: Updatable): HTMLSelectElement | null =>
    (host as HTMLElement).shadowRoot?.querySelector('select') ?? null

  test('keeps a hidden native select with the same options, and takes what is filled', async () => {
    const host = (await list('autocomplete="country"')) as Updatable & { value: string }
    const field = hidden(host) as HTMLSelectElement
    expect(field.getAttribute('autocomplete')).toBe('country')
    expect(field.getAttribute('aria-hidden')).toBe('true')
    expect(field.tabIndex).toBe(-1)
    expect(field.hasAttribute('name')).toBe(false)
    expect([...field.options].map((option) => [option.value, option.text])).toEqual([
      ['', ''],
      ['one', 'Alpha'],
      ['two', 'Beta'],
      ['three', 'Gamma'],
    ])
    field.value = 'two'
    field.dispatchEvent(new Event('change', { bubbles: true }))
    await settle(host)
    expect(host.value).toBe('two')
    expect(formValue(host as unknown as HTMLElement)).toBe('two')
  })

  test('takes every option filled in, with multiple', async () => {
    const host = (await list('autocomplete="country" multiple')) as Updatable & { value: string }
    const field = hidden(host) as HTMLSelectElement
    for (const option of field.options) {
      option.selected = option.value === 'one' || option.value === 'three'
    }
    field.dispatchEvent(new Event('change', { bubbles: true }))
    await settle(host)
    expect(host.value).toBe('one,three')
  })

  test('never offers the filter field to the browser', async () => {
    const host = await list('autocomplete="country" filterable')
    const filter = part(host as HTMLElement, 'search-field') as HTMLInputElement
    expect(filter.getAttribute('autocomplete')).toBe('off')
  })

  test('draws nothing at `off`, the default', async () => {
    expect(hidden(await list())).toBeNull()
    expect(hidden(await list('autocomplete="off"'))).toBeNull()
  })

  test('sends the page one input, with the filled value', async () => {
    /* A fill as Chromium sends it: the select's composed `input`, then its
       `change`. Measured before this, the page heard `input` twice, the
       first with the old value. */
    const host = (await list('autocomplete="country"')) as Updatable & { value: string }
    const heard: string[] = []
    ;(host as unknown as HTMLElement).addEventListener('input', () => heard.push(host.value))
    const field = hidden(host) as HTMLSelectElement
    field.value = 'two'
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    await settle(host)
    expect(heard).toEqual(['two'])
  })
})
