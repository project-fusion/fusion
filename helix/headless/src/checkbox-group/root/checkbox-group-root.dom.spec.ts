import { beforeAll, describe, expect, test } from 'bun:test'
import {
  mount,
  part,
  registerDom,
  role,
  settle,
  slotted,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../checkbox/index.js')
})

type Group = HTMLElement & {
  value: string
  name: string
  boxes: (HTMLElement & { checked: boolean; value: string; name: string })[]
  updateComplete: Promise<unknown>
  internals?: ElementInternals
}

const group = async (attrs = 'label="Verticals" name="verticals" value="design,mind"') =>
  (await mount(`<helix-headless-checkbox-group ${attrs}>
    <helix-headless-checkbox value="design">Design</helix-headless-checkbox>
    <helix-headless-checkbox value="mind">Mind</helix-headless-checkbox>
    <helix-headless-checkbox value="energy">Energy</helix-headless-checkbox>
  </helix-headless-checkbox-group>`)) as Group

const tick = async (g: Group, index: number) => {
  const box = g.boxes[index] as HTMLElement
  const control = box.shadowRoot?.querySelector<HTMLElement>('[part="control"]')
  control?.click()
  await g.updateComplete
  await Promise.all(g.boxes.map((b) => (b as unknown as Group).updateComplete))
}

describe('checkbox group', () => {
  test('is a named group, set on internals rather than on the host', async () => {
    const g = await group()
    expect(role(g)).toBe('group')
    expect(g.internals?.ariaLabel).toBe('Verticals')
    expect(g.getAttributeNames()).toEqual(['label', 'name', 'value'])
  })

  test('the value ticks exactly those boxes', async () => {
    const g = await group()
    expect(g.boxes.map((b) => `${b.value}:${b.checked}`)).toEqual([
      'design:true',
      'mind:true',
      'energy:false',
    ])
  })

  test('the shared name reaches the attribute, because that is what submits', async () => {
    /* The platform builds a form's entry list from the `name` *content
       attribute*. Measured against the shipped build: a checked, form-associated
       host named only by property contributed nothing at all to a `FormData`,
       while an attribute-named one beside it did.

       `name` reflects from `HelixFormElement`, so setting the property is what
       writes the attribute. Pushing it down as a property alone spares a React
       consumer a hydration warning and costs the answer: the smaller cost is the
       warning. */
    const g = await group()
    expect(g.boxes.map((b) => b.name)).toEqual(['verticals', 'verticals', 'verticals'])
    expect((g.boxes[0] as HTMLElement).getAttribute('name')).toBe('verticals')
  })

  test('a box that names itself keeps its own', async () => {
    const g = (await mount(`<helix-headless-checkbox-group name="shared">
      <helix-headless-checkbox name="its-own" value="a">A</helix-headless-checkbox>
    </helix-headless-checkbox-group>`)) as Group
    expect(g.boxes[0]?.name).toBe('its-own')
  })

  test('ticking and unticking both move the set', async () => {
    const g = await group()
    await tick(g, 2)
    expect(g.value).toBe('design,mind,energy')
    await tick(g, 0)
    expect(g.value).toBe('mind,energy')
  })

  test('a box that refused its own change is not counted into the set', async () => {
    /* `helix-before-toggle` is cancelable and the box honors it, so a consumer
       refusing on the box leaves that box exactly where it was. The group read
       the request rather than the answer and took the value anyway, which left
       a set naming a box that never ticked: no error, and a form carrying the
       group's answer beside boxes that disagree with it. */
    const g = await group()
    const box = g.boxes[2] as HTMLElement
    box.addEventListener('helix-before-toggle', (event) => event.preventDefault())
    await tick(g, 2)
    expect(g.value).toBe('design,mind')
    expect(g.boxes.map((one) => one.checked)).toEqual([true, true, false])
  })

  test('the group says the whole set, once, and the box does not say it again', async () => {
    // A consumer of a group is listening for the set. Letting the box's own
    // change through as well would deliver two events for one action, one of
    // them carrying a lone boolean.
    const g = await group()
    const seen: string[] = []
    g.addEventListener('helix-before-change', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await tick(g, 2)
    expect(seen).toEqual(['design,mind,energy'])
  })

  test('the group does not answer its own event', async () => {
    // Its listener is on the host it dispatches from, so without a guard on the
    // target it hears itself and answers until the stack gives out.
    const g = await group()
    let count = 0
    g.addEventListener('helix-before-change', () => {
      count += 1
    })
    await tick(g, 2)
    expect(count).toBe(1)
  })

  test('the boxes stay the elements the consumer wrote', async () => {
    expect(slotted(await group())).toHaveLength(3)
  })
})

describe('checkbox group as a field', () => {
  test('the group is named and described by its own nodes', async () => {
    /* Through `ElementInternals`, which is the only form that works here: the
       host is in the light DOM and its label is in the shadow root, so an IDREF
       cannot reach and the plain element reflection drops the reference. */
    const host = (await mount(
      '<helix-headless-checkbox-group label="Label" hint="Hint"><helix-headless-checkbox value="a">A</helix-headless-checkbox></helix-headless-checkbox-group>',
    )) as Updatable & { internals: ElementInternals }
    await settle(host)

    expect(host.internals.role).toBe('group')
    expect(host.internals.ariaLabelledByElements?.[0]?.textContent?.trim()).toBe('Label')
    expect(host.internals.ariaDescribedByElements?.[0]?.textContent?.trim()).toBe('Hint')
  })

  test('its message is given, never derived', async () => {
    /* Every form-related member of `ElementInternals` throws
       `NotSupportedError` on an element that is not form-associated, and this
       group is not, on purpose: the boxes submit themselves. So asking it about
       its own validity would throw rather than return nothing, which is why the
       mixin asks whether the element is form-associated before it asks the
       platform anything. */
    const host = (await mount(
      '<helix-headless-checkbox-group label="L" hint="H" feedback="Pick at least one"><helix-headless-checkbox value="a">A</helix-headless-checkbox></helix-headless-checkbox-group>',
    )) as Updatable
    await settle(host)

    expect((part(host, 'feedback') as HTMLElement).textContent?.trim()).toBe('Pick at least one')
    expect(part(host, 'hint')).toBeNull()
  })

  test('orientation lays out the boxes, not the field', async () => {
    // On the host it would lay out the label too, putting a horizontal group's
    // own name in the row beside the first box.
    const host = await mount(
      '<helix-headless-checkbox-group label="L" orientation="horizontal"><helix-headless-checkbox value="a">A</helix-headless-checkbox></helix-headless-checkbox-group>',
    )
    const items = part(host, 'items') as HTMLElement
    const label = part(host, 'label') as HTMLElement
    expect(items.contains(label)).toBe(false)
  })
})

describe('checkbox group after a reset', () => {
  test('goes back to what its boxes declared, and stays there', async () => {
    /* The form resets every control in one task, the group before its boxes.
       Without its own reset the group kept the reader's set, reported valid
       over emptied boxes, and ticked them again on its next update. */
    const form = await mount(`<form><helix-headless-checkbox-group label="L" name="c" required>
      <helix-headless-checkbox value="a">A</helix-headless-checkbox>
      <helix-headless-checkbox value="b" default-checked>B</helix-headless-checkbox>
    </helix-headless-checkbox-group></form>`)
    type Reset = Updatable & { formResetCallback(): void }
    const group = form.firstElementChild as Reset & {
      boxes: (Reset & { checked: boolean })[]
      hint: string
      value: string
    }
    await settle(group)
    group.value = 'a'
    await settle(group)
    for (const one of [group, ...group.boxes]) {
      one.formResetCallback()
    }
    await settle(group)
    expect(group.value).toBe('b')
    group.hint = 'Anything that updates the group'
    await settle(group)
    expect(group.boxes.map((box) => box.checked)).toEqual([false, true])
  })
})

describe('checkbox group reset with its value in the markup', () => {
  /* The value went back to the attribute, which it already held, so no update
     ran and the boxes, which reset themselves to unchecked, stayed unchecked:
     the form submitted nothing for a group still claiming its set. */
  test('ticks the declared boxes again', async () => {
    const form =
      await mount(`<form><helix-headless-checkbox-group label="L" name="g" value="one,two">
      <helix-headless-checkbox value="one">One</helix-headless-checkbox>
      <helix-headless-checkbox value="two">Two</helix-headless-checkbox>
      <helix-headless-checkbox value="three">Three</helix-headless-checkbox>
    </helix-headless-checkbox-group></form>`)
    type Reset = Updatable & { formResetCallback(): void }
    const g = form.firstElementChild as Reset & { boxes: (Reset & { checked: boolean })[] }
    await settle(g)
    for (const one of [g, ...g.boxes]) {
      one.formResetCallback()
    }
    await settle(g)
    expect(g.boxes.map((box) => box.checked)).toEqual([true, true, false])
  })
})

describe('a checkbox inside a wrapper of the consumer’s', () => {
  /* Only direct children counted, so a box in a row with a description got no
     name, no place in the set, and its events stopped at the group. */
  test('is a member, named and counted', async () => {
    const g = (await mount(`<helix-headless-checkbox-group label="L" name="t">
      <div><helix-headless-checkbox value="a">A</helix-headless-checkbox></div>
    </helix-headless-checkbox-group>`)) as Group
    await settle(g)
    const box = g.querySelector('helix-headless-checkbox') as unknown as Group['boxes'][number]
    expect(g.boxes).toHaveLength(1)
    expect(box.name).toBe('t')
    await tick(g, 0)
    expect(g.value).toBe('a')
  })
})

describe('a field of another kind inside the group', () => {
  /* Every `input` and `change` from inside was stopped, so a form listening
     for an "Other" text field's edits heard nothing. */
  test('is heard past the group', async () => {
    const g = (await mount(`<helix-headless-checkbox-group label="L">
      <helix-headless-checkbox value="a">A</helix-headless-checkbox>
      <div><input id="other" /></div>
    </helix-headless-checkbox-group>`)) as Group
    let heard = 0
    document.body.addEventListener('input', () => {
      heard += 1
    })
    g.querySelector('#other')?.dispatchEvent(new Event('input', { bubbles: true }))
    expect(heard).toBe(1)
  })
})

describe('a box a script ticks directly', () => {
  /* The value went stale, and the next unrelated update of the group pushed
     the stale value back and unticked the box with no event. */
  test('is in the value, and stays ticked', async () => {
    const g = (await group('label="L" name="u" value="design"')) as Group & { hint: string }
    await settle(g)
    const box = g.boxes[1] as Group['boxes'][number]
    box.checked = true
    expect(g.value).toBe('design,mind')
    g.hint = 'Anything that updates the group'
    await settle(g)
    expect(box.checked).toBe(true)
  })

  /* A box changed by a script sends no event, so the group judged `required`
     only at its next unrelated update, and a form with the set emptied this
     way submitted. */
  test('unticked, it leaves a required set refused', async () => {
    const g = (await group('label="L" name="r" required value="mind"')) as Group & {
      validity: ValidityState
    }
    await settle(g)
    expect(g.validity.valueMissing === true).toBe(false)
    const box = g.boxes[1] as Group['boxes'][number] & Updatable
    box.checked = false
    await settle(box)
    await settle(g)
    expect(g.value).toBe('')
    expect(g.validity.valueMissing).toBe(true)
    box.checked = true
    await settle(box)
    await settle(g)
    expect(g.validity.valueMissing === true).toBe(false)
  })
})

describe('a refused change to the set', () => {
  /* The @event line promises a refusal leaves every box as it was. */
  test('leaves the box where it was', async () => {
    const g = await group()
    g.addEventListener('helix-before-change', (event) => event.preventDefault())
    await tick(g, 2)
    expect(g.boxes.map((one) => one.checked)).toEqual([true, true, false])
    expect(g.value).toBe('design,mind')
  })
})

describe('the set as a list', () => {
  /* A value holding a comma could not round-trip through the comma string. */
  test('values reads and writes values that hold a comma', async () => {
    const g = (await mount(`<helix-headless-checkbox-group label="Cities">
      <helix-headless-checkbox value="Paris, TX">Paris</helix-headless-checkbox>
      <helix-headless-checkbox value="Austin">Austin</helix-headless-checkbox>
    </helix-headless-checkbox-group>`)) as Group & { values: string[] }
    await settle(g)
    g.values = ['Paris, TX']
    await settle(g)
    expect(g.boxes.map((box) => box.checked)).toEqual([true, false])
    expect(g.values).toEqual(['Paris, TX'])
    await tick(g, 1)
    expect(g.values).toEqual(['Paris, TX', 'Austin'])
  })
})

describe('select all', () => {
  type Selecting = Group & { values: string[] }
  const box = (g: Group) =>
    part(g, 'select-all') as HTMLElement & {
      checked: boolean
      indeterminate: boolean
      updateComplete: Promise<unknown>
    }
  const press = async (g: Group) => {
    await box(g).updateComplete
    box(g).shadowRoot?.querySelector<HTMLElement>('[part="control"]')?.click()
    await settle(g)
  }

  test('is drawn only where asked for, and is no member of the set', async () => {
    expect(part(await group(), 'select-all')).toBeNull()
    const g = await group('label="Verticals" select-all value="design"')
    await settle(g)
    expect(box(g)?.localName).toBe('helix-headless-checkbox')
    expect(g.boxes).toHaveLength(3)
    expect([box(g).checked, box(g).indeterminate]).toEqual([false, true])
  })

  test('checks every enabled box, then unchecks them all, in one change each', async () => {
    const g = (await group('label="Verticals" select-all value="design"')) as Selecting
    ;(g.boxes[2] as unknown as { disabled: boolean }).disabled = true
    await settle(g)
    const heard: string[] = []
    g.addEventListener('change', () => heard.push(g.value))
    await press(g)
    expect(g.values).toEqual(['design', 'mind'])
    expect([box(g).checked, box(g).indeterminate]).toEqual([true, false])
    await press(g)
    expect(g.values).toEqual([])
    expect([box(g).checked, box(g).indeterminate]).toEqual([false, false])
    await press(g)
    ;(g.boxes[2] as unknown as { disabled: boolean }).disabled = false
    await press(g)
    expect(g.values).toEqual(['design', 'mind', 'energy'])
    expect([box(g).checked, box(g).indeterminate]).toEqual([true, false])
    await press(g)
    expect(g.values).toEqual([])
    expect(heard).toEqual(['design,mind', '', 'design,mind', 'design,mind,energy', ''])
  })

  test('a refused change leaves every box as it was', async () => {
    const g = (await group('label="Verticals" select-all value="design"')) as Selecting
    await settle(g)
    g.addEventListener('helix-before-change', (event) => event.preventDefault())
    await press(g)
    expect(g.values).toEqual(['design'])
    expect(box(g).checked).toBe(false)
  })
})
