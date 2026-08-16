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
    // Validity moves outside the property system, so this takes two passes.
  }
}

const list = async (extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-listbox label="L" name="c" ${extra}>
    <helix-option value="one">Alpha</helix-option>
    <helix-option value="two">Beta</helix-option>
    <helix-option value="three">Gamma</helix-option>
  </helix-listbox>`
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
    host.addEventListener('helix-change', (event) => event.preventDefault())
    await press(host, 'ArrowDown')
    expect(host.value).toBe('one')
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
    document.body.innerHTML = `<helix-listbox label="L">
      <helix-option-group label="One"><helix-option value="a">Alpha</helix-option></helix-option-group>
      <helix-option-group label="Two"><helix-option value="b">Beta</helix-option></helix-option-group>
    </helix-listbox>`
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

/* Only in a real engine. `ariaActiveDescendantElement` is an element reference,
   which happy-dom does not implement, and the component feature-tests it: under
   a shim the guard declines and there is nothing to assert. `hasLayout` stands
   in for "a real browser", which is what is actually being asked for. */
if (hasLayout()) {
  describe('listbox active descendant', () => {
    const listbox = async (): Promise<HTMLElement> => {
      const host = (await mount(
        `<helix-listbox label="Owner" default-value="a">
          <helix-option value="a">Ross</helix-option>
          <helix-option value="b">Sam</helix-option>
          <helix-option value="c">Kit</helix-option>
        </helix-listbox>`,
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

if (hasLayout()) {
  describe('choosing an option with a pointer', () => {
    test('a click on an option chooses it', async () => {
      /* Nothing anywhere listened for a click on an option: not the option,
         which only had a `select()` method, and not the listbox, which listened
         for `helix-select` and for keys. So a list could be operated with a
         keyboard and not with a mouse, for as long as it has existed. Every
         spec for it chose by key or by method, which is exactly why. */
      const host = (await mount(
        `<helix-listbox label="Owner">
          <helix-option value="one">One</helix-option>
          <helix-option value="two">Two</helix-option>
        </helix-listbox>`,
      )) as Updatable & { value: string }
      await host.updateComplete

      const option = (host as HTMLElement).querySelector('helix-option[value="two"]') as HTMLElement
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
}
