import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Size = HTMLElement & { updateComplete: Promise<unknown>; value: number }

const control = (host: HTMLElement): HTMLElement & { value: string } =>
  part(host, 'control') as HTMLElement & { value: string }

const options = (host: HTMLElement): string[] =>
  [...(host.shadowRoot?.querySelectorAll('helix-headless-option') ?? [])].map(
    (one) => one.getAttribute('value') ?? '',
  )

/* What `Select` dispatches when a reader chooses. Bubbling and composed, which
   is the half of this worth asserting on: left alone it would cross this
   element's shadow boundary and be retargeted to look like its own. */
const choose = (_host: HTMLElement, value: string): CustomEvent =>
  new CustomEvent('helix-before-change', {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail: { name: '', value },
  })

describe('pagination size', () => {
  test('is the library’s select, not a native one', async () => {
    /* It was native first, on the argument that the platform's menu is a wheel
       on a phone. What that leaves out is a library with two dropdowns that are
       identical closed and different open, met in the same footer. */
    const it = await mount('<helix-headless-pagination-size></helix-headless-pagination-size>')
    expect(control(it).tagName).toBe('HELIX-HEADLESS-SELECT')
  })

  test('offers the sizes it was given, in order', async () => {
    const it = await mount(
      '<helix-headless-pagination-size sizes="10,25,50"></helix-headless-pagination-size>',
    )
    expect(options(it)).toEqual(['10', '25', '50'])
  })

  test('anything that is not a size is dropped rather than offered', async () => {
    // An option that cannot mean anything is worse than a shorter list.
    const it = await mount(
      '<helix-headless-pagination-size sizes="10, ,x,-5,25"></helix-headless-pagination-size>',
    )
    expect(options(it)).toEqual(['10', '25'])
  })

  test('falls back to the first offered where nothing named one', async () => {
    const it = await mount(
      '<helix-headless-pagination-size sizes="20,40"></helix-headless-pagination-size>',
    )
    expect(control(it).value).toBe('20')
  })

  test('the label is the select’s own, against the trigger’s own id', async () => {
    /* Nothing here reconstructs the association. `Select` renders the label and
       gives the trigger the id it points at, and that pairing has its own
       specs one component over. */
    const it = await mount('<helix-headless-pagination-size></helix-headless-pagination-size>')
    const select = control(it)
    const label = select.shadowRoot?.querySelector('[part="label"]') as HTMLLabelElement
    const trigger = select.shadowRoot?.querySelector('[part="trigger"]') as HTMLElement
    expect(label.textContent?.trim()).toBe('Per page')
    expect(label.getAttribute('for')).toBe(trigger.id)
  })

  test('moves itself when nothing declared the value', async () => {
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    expect(it.value).toBe(25)
  })

  test('the select’s own event does not escape as this one’s', async () => {
    /* `Select`'s `helix-change` bubbles and is composed, so a consumer would
       have heard two per change, one of them carrying `Select`'s idea of what a
       name and a value are. */
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    const heard: string[] = []
    it.addEventListener('helix-change', (event) => {
      heard.push(
        `${(event as CustomEvent<{ property: string }>).detail.property}=${
          (event as CustomEvent<{ value: string }>).detail.value
        }`,
      )
    })
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    expect(heard).toEqual(['value=25'])
  })

  test('announces before it moves, so a listener can refuse', async () => {
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    let announced = ''
    it.addEventListener('helix-change', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
      event.preventDefault()
    })
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    expect(announced).toBe('25')
    expect(it.value).toBe(10)
  })

  test('a refused change puts the select back', async () => {
    /* A select changes itself and then tells you, which is the one case
       `requestControlledChange` cannot get ahead of. Lit skips a property
       binding whose value has not changed, so nothing else would undo it. */
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    it.addEventListener('helix-change', (event) => event.preventDefault())
    control(it).value = '25'
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    await it.updateComplete
    expect(control(it).value).toBe('10')
  })

  test('declaring `value` seeds it, and the element still moves', async () => {
    /* Asserted the opposite until 26 Aug 2026, when declaring the property was a
       claim of ownership and the element announced without moving. Control is
       an action now: it applies, and a consumer refuses to take the decision.
       See 294. */
    const it = (await mount(
      '<helix-headless-pagination-size sizes="10,25" value="10"></helix-headless-pagination-size>',
    )) as Size
    let announced = ''
    it.addEventListener('helix-change', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    expect(announced).toBe('25')
    expect(it.value).toBe(25)
  })
})

describe('pagination size with nothing to offer', () => {
  test('an empty `sizes` renders no control and reports itself empty', async () => {
    /* A chooser with nothing to choose from is a control a reader can operate
       and cannot use, which is worse than an absence. Falling back to the
       built-in list was the other answer and it is a component overruling a
       consumer who said "none". */
    const it = await mount(
      '<helix-headless-pagination-size sizes=""></helix-headless-pagination-size>',
    )
    expect(part(it, 'control')).toBeNull()
    expect(
      (it as unknown as { internals: { states: Set<string> } }).internals.states.has('empty'),
    ).toBe(true)
  })
})
