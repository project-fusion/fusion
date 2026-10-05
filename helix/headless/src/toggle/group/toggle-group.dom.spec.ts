import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  mount,
  part,
  registerDom,
  role,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-headless-toggle-group label="Color mode" default-value="light">
  <helix-headless-toggle value="system">System</helix-headless-toggle>
  <helix-headless-toggle value="light">Light</helix-headless-toggle>
  <helix-headless-toggle value="dark">Dark</helix-headless-toggle>
</helix-headless-toggle-group>`

const items = (group: HTMLElement) =>
  [...group.querySelectorAll('helix-headless-toggle')] as (HTMLElement & {
    selected: boolean
    value: string
  })[]

describe('toggle group', () => {
  test('is a radio group, named on internals rather than on the host', async () => {
    const group = await mount(markup)
    expect(role(group)).toBe('radiogroup')
    expect(group.hasAttribute('role')).toBe(false)
  })

  test('the value selects the matching item and no other', async () => {
    const group = await mount(markup)
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['light'])
  })

  test('choosing an item moves the selection and reports the new value', async () => {
    const group = await mount(markup)
    let seen = ''
    group.addEventListener('helix-select', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
    })

    const dark = items(group)[2] as unknown as HTMLElement & { select: () => void }
    dark.select()
    /* A task rather than a microtask: the group reads the choice a microtask
       after the dispatch, so a refusal on the group itself is read, and the
       update follows that. */
    await new Promise((resolve) => setTimeout(resolve))

    expect(seen).toBe('dark')
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['dark'])
  })

  test('and refusing the item`s own event leaves the group where it was', async () => {
    /* `helix-select` is cancelable and the item documents it as refusable. The
       group is the one thing that acts on it, so a refusal it ignored was a
       veto that did nothing anywhere: valid code, no error, and the selection
       happening regardless. Bound on the item, which is the position that can
       refuse a bubbling event before the group sees it. */
    const group = (await mount(markup)) as Updatable & { value: string }
    const dark = items(group)[2] as unknown as HTMLElement & { select: () => void }
    dark.addEventListener('helix-select', (event) => event.preventDefault())
    dark.select()
    await Promise.resolve()

    expect(group.value).toBe('light')
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['light'])
  })

  /* The markup's own answer, which is the half a server can state.
   *
   * The fault these hold: `sync` matched items against a `value` of `''`,
   * matched none, and wrote `selected = false` onto every one of them, so a
   * group served with its answer on the item lost it one frame after paint and
   * submitted nothing. `Tabs` had the same fault and `Steps` guards it. Both
   * halves are asserted, because marking the item without taking the value
   * would leave a `required` group reporting empty while showing an answer. */
  test('an item the markup declared chosen stays chosen', async () => {
    const group = await mount(`<helix-headless-toggle-group label="View" name="view">
        <helix-headless-toggle value="list" selected>List</helix-headless-toggle>
        <helix-headless-toggle value="grid">Grid</helix-headless-toggle>
      </helix-headless-toggle-group>`)
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['list'])
    expect(formValue(group as unknown as Updatable)).toBe('list')
  })

  test('a declaration written as a property is one too, which is what JSX writes', async () => {
    /* React assigns a JSX prop as a property where the custom element has one
       and writes no attribute, so a group keying on the attribute drew the
       shipped `disabled` example one way in HTML and another in TSX. Measured
       by the parity check at 192 pixels before the group read the property. */
    document.body.innerHTML = `<helix-headless-toggle-group label="View">
        <helix-headless-toggle value="list">List</helix-headless-toggle>
        <helix-headless-toggle value="grid">Grid</helix-headless-toggle>
      </helix-headless-toggle-group>`
    const group = document.body.firstElementChild as HTMLElement & Updatable
    const [first] = items(group)
    if (first) {
      first.selected = true
    }
    await group.updateComplete
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['list'])
    expect(first?.hasAttribute('selected')).toBe(false)
  })

  test('a written value still wins over the markup on the item', async () => {
    const group = await mount(`<helix-headless-toggle-group label="View" value="grid">
        <helix-headless-toggle value="list" selected>List</helix-headless-toggle>
        <helix-headless-toggle value="grid">Grid</helix-headless-toggle>
      </helix-headless-toggle-group>`)
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['grid'])
  })

  test('nothing declared marks nothing, rather than falling back to the first', async () => {
    const group = await mount(`<helix-headless-toggle-group label="View">
        <helix-headless-toggle value="list">List</helix-headless-toggle>
        <helix-headless-toggle value="grid">Grid</helix-headless-toggle>
      </helix-headless-toggle-group>`)
    expect(items(group).filter((item) => item.selected)).toEqual([])
  })

  test('the declaration is the attribute, which the parser sets after the constructor', async () => {
    // A field initializer reading `hasAttribute` runs before the parser has set
    // one, so it answered `false` for every element written in markup.
    const group = await mount(`<helix-headless-toggle-group label="View">
        <helix-headless-toggle value="list" selected>List</helix-headless-toggle>
      </helix-headless-toggle-group>`)
    const item = items(group)[0] as unknown as { defaultSelected: boolean }
    expect(item.defaultSelected).toBe(true)
  })

  test('the indicator is hidden from assistive technology', async () => {
    // It repeats the selection a radio group already announces.
    const group = await mount(markup)
    expect(part(group, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('toggle group in a form', () => {
  /* The group is a radio group, so it is a control, and a control that does not
     reach a form is decoration. None of this could work through the items: they
     draw `role="radio"` on buttons inside a shadow root, and a button submits
     nothing whatever its role, so the host is the only thing a form can see.

     These read what the group reported rather than what the form would submit.
     Turning a reported value into a `FormData` entry is the platform's job, and
     the test double does not do it; what belongs to the component is reporting
     the right value at the right moment. The whole path from a press to a
     submitted field was checked in a browser. */
  /* Parsed through `document.body`, not built detached and appended. happy-dom
     resolves `closest('form')` to nothing when the subtree was written with
     `innerHTML` on an element that was not in the document at the time, even
     though `parentElement` is the form: measured, `closest` returned null while
     the parent read `FORM`. Every spec here that finds its form does it this
     way. */
  const inForm = async (extra = ''): Promise<{ form: HTMLFormElement; group: Updatable }> => {
    document.body.innerHTML = `<form>
        <helix-headless-toggle-group name="mode" label="Mode" ${extra}>
          <helix-headless-toggle value="system">System</helix-headless-toggle>
          <helix-headless-toggle value="light">Light</helix-headless-toggle>
          <helix-headless-toggle value="dark">Dark</helix-headless-toggle>
        </helix-headless-toggle-group>
      </form>`
    const form = document.body.firstElementChild as HTMLFormElement
    const group = form.querySelector('helix-headless-toggle-group') as Updatable
    await group.updateComplete
    return { form, group }
  }

  test('reports the chosen value', async () => {
    const { group } = await inForm('default-value="light"')
    expect(formValue(group)).toBe('light')

    ;(group as Updatable & { value: string }).value = 'dark'
    await group.updateComplete
    expect(formValue(group)).toBe('dark')
  })

  test('a reset returns it to the choice the markup declared', async () => {
    // `default-value` and `value` are separate for the reason `defaultChecked`
    // and `checked` are: where it started is gone the moment anything is picked.
    const { group } = await inForm('default-value="light"')
    ;(group as Updatable & { value: string }).value = 'dark'
    await group.updateComplete

    ;(group as Updatable & { formResetCallback: () => void }).formResetCallback()
    await group.updateComplete
    expect(formValue(group)).toBe('light')
  })

  test('the browser can put back a choice it restored', async () => {
    const { group } = await inForm('default-value="light"')
    ;(
      group as Updatable & { formStateRestoreCallback: (s: string | null) => void }
    ).formStateRestoreCallback('dark')
    await group.updateComplete
    expect(formValue(group)).toBe('dark')
  })

  test('nothing chosen reports nothing, rather than a blank', async () => {
    // `null` and `''` are different answers: one submits no field at all, the
    // other submits the field with an empty value.
    const { group } = await inForm()
    expect(formValue(group)).toBeNull()
  })

  test('the form owns it', async () => {
    const { form, group } = await inForm()
    expect((group as Updatable & { form: HTMLFormElement | null }).form).toBe(form)
  })
})

/* Geometry, which only a browser can answer.
 *
 * Guarded rather than written for happy-dom, where every rectangle is zero and
 * an assertion about where the thumb sits would pass against nothing at all.
 * These run in the sandbox's Specs panel, against the same file `bun test`
 * runs, which is the only place the answers mean anything.
 *
 * The fault they hold: offsets measured from the group's border box, with
 * `getBoundingClientRect`, and applied from its padding box, which is where an
 * absolutely positioned element is placed. A border's width late on both axes,
 * which in a forty pixel track holding a thirty pixel thumb is six above it and
 * four below.
 */

describe('toggle group edges', () => {
  /* `click()` on a radio chose it, and on a toggle did nothing, because only
     the inner button answered. */
  test('`click()` on an item chooses it', async () => {
    const group = (await mount(markup)) as Updatable & { value: string }
    items(group)[2]?.click()
    await new Promise((resolve) => setTimeout(resolve))
    expect(group.value).toBe('dark')
  })

  test('a disabled answer leaves the stop on the first item that can be chosen', async () => {
    const group = await mount(`<helix-headless-toggle-group label="Mode" default-value="x">
      <helix-headless-toggle value="x" disabled>X</helix-headless-toggle>
      <helix-headless-toggle value="y">Y</helix-headless-toggle>
    </helix-headless-toggle-group>`)
    await (group as Updatable).updateComplete
    const stops = items(group).map((item) => {
      const button = item.shadowRoot?.querySelector('button') as HTMLButtonElement
      return button.disabled ? 'disabled' : button.getAttribute('tabindex')
    })
    expect(stops).toEqual(['disabled', '0'])
  })

  /* A toolbar holds one tab stop for everything in it, and the chosen item
     kept one of its own beside it. */
  test('a group told it is not focusable gives up its stop, and focus() still lands', async () => {
    const group = (await mount(markup)) as Updatable & { focusable: boolean }
    const tabindexes = () =>
      items(group).map((item) => item.shadowRoot?.querySelector('button')?.getAttribute('tabindex'))
    await group.updateComplete
    expect(tabindexes()).toEqual(['-1', '0', '-1'])
    group.focusable = false
    await group.updateComplete
    await Promise.all(items(group).map((item) => (item as unknown as Updatable).updateComplete))
    expect(tabindexes()).toEqual(['-1', '-1', '-1'])
    group.focus()
    expect(items(group)[1]?.shadowRoot?.activeElement).toBe(
      part(items(group)[1] as HTMLElement, 'item'),
    )
  })

  test('a refusal on the group itself keeps the current choice', async () => {
    const group = (await mount(markup)) as Updatable & { value: string }
    group.addEventListener('helix-select', (event) => event.preventDefault())
    ;(items(group)[2] as unknown as { select: () => void }).select()
    await new Promise((resolve) => setTimeout(resolve))
    expect(group.value).toBe('light')
  })

  test('a removed answer is no longer submitted', async () => {
    const group = (await mount(
      markup.replace('default-value="light"', 'default-value="light" name="mode"'),
    )) as Updatable
    items(group)[1]?.remove()
    await new Promise((resolve) => setTimeout(resolve))
    await group.updateComplete
    expect(formValue(group)).toBeNull()
  })
})

describe('a group where several can be pressed', () => {
  type Toolbar = Updatable & { updateComplete: Promise<unknown>; value: string; values: string[] }
  const toolbar = async (): Promise<Toolbar> => {
    const group =
      (await mount(`<helix-headless-toggle-group label="Format" name="format" selection-mode="multiple" value="italic">
      <helix-headless-toggle value="bold">Bold</helix-headless-toggle>
      <helix-headless-toggle value="italic">Italic</helix-headless-toggle>
      <helix-headless-toggle value="underline">Underline</helix-headless-toggle>
    </helix-headless-toggle-group>`)) as Toolbar
    await group.updateComplete
    return group
  }
  const button = (item: HTMLElement): HTMLElement =>
    item.shadowRoot?.querySelector('[part="item"]') as HTMLElement
  const settle = async (group: Toolbar): Promise<void> => {
    await new Promise((done) => queueMicrotask(() => done(undefined)))
    await group.updateComplete
    await Promise.all(items(group).map((item) => (item as unknown as Toolbar).updateComplete))
  }

  /* React Aria's ToggleButtonGroup with selectionMode multiple, Radix's
     ToggleGroup type multiple: a toolbar of aria-pressed buttons. */
  test('is a toolbar of buttons that say whether they are pressed', async () => {
    const group = await toolbar()
    await settle(group)
    expect(role(group)).toBe('toolbar')
    expect(items(group).map((item) => button(item).getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ])
    expect(button(items(group)[0] as HTMLElement).hasAttribute('role')).toBe(false)
  })

  test('a press presses or releases one item, in the order they are written', async () => {
    const group = await toolbar()
    button(items(group)[2] as HTMLElement).click()
    await settle(group)
    button(items(group)[0] as HTMLElement).click()
    await settle(group)
    expect(group.values).toEqual(['bold', 'italic', 'underline'])
    button(items(group)[1] as HTMLElement).click()
    await settle(group)
    expect(group.value).toBe('bold,underline')
    const sent = formValue(group) as unknown as FormData
    expect(sent.getAll('format')).toEqual(['bold', 'underline'])
  })

  test('the arrow keys move without pressing', async () => {
    const group = await toolbar()
    group.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }))
    await settle(group)
    expect(group.values).toEqual(['italic'])
  })
})

describe('a vertical group', () => {
  test('says its orientation to the accessibility tree', async () => {
    const group = (await mount(
      markup.replace('default-value="light"', 'default-value="light" orientation="vertical"'),
    )) as Updatable & { internals: ElementInternals }
    expect(group.internals.ariaOrientation).toBe('vertical')
  })
})
