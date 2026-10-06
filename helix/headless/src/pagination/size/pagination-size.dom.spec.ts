import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasState,
  mount,
  part,
  registerDom,
  settle,
} from '@fusion.dev/helix-testing/dom'

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
    /* Native is the tempting answer, the platform's menu being a wheel on a
       phone. What it leaves out is a library with two dropdowns that are
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

  /* `<label for>` reached the host and stopped there: the select inside was
     still named "Per page", whatever the page called it. */
  test('the page’s name for it names the select, in place of its own label', async () => {
    const host = (await mount(
      '<helix-headless-pagination-size aria-label="Rows per page"></helix-headless-pagination-size>',
    )) as Size
    await host.updateComplete
    expect(control(host).getAttribute('aria-label')).toBe('Rows per page')
    expect(control(host).getAttribute('label')).toBe('')

    const plain = (await mount(
      '<helix-headless-pagination-size></helix-headless-pagination-size>',
    )) as Size
    await plain.updateComplete
    expect(control(plain).hasAttribute('aria-label')).toBe(false)
    expect(control(plain).getAttribute('label')).toBe('Per page')
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
    /* `Select`'s own event bubbles and is composed, so unstopped a consumer
       hears two per change. The count is what catches it: both arrive under
       one name carrying one value. */
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    const heard: string[] = []
    it.addEventListener('helix-before-change', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    expect(heard).toEqual(['25'])
  })

  test('announces before it moves, so a listener can refuse', async () => {
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    let announced = ''
    it.addEventListener('helix-before-change', (event) => {
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
    it.addEventListener('helix-before-change', (event) => event.preventDefault())
    control(it).value = '25'
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    await it.updateComplete
    expect(control(it).value).toBe('10')
  })

  test('declaring `value` seeds it, and the element still moves', async () => {
    /* Control is an action, not a mode: declaring `value` seeds rather than
       claiming ownership, so the element applies and a consumer refuses the
       before event to take the decision. */
    const it = (await mount(
      '<helix-headless-pagination-size sizes="10,25" value="10"></helix-headless-pagination-size>',
    )) as Size
    let announced = ''
    it.addEventListener('helix-before-change', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    control(it).dispatchEvent(choose(it, '25'))
    await it.updateComplete
    expect(announced).toBe('25')
    expect(it.value).toBe(25)
  })

  /* A value control's notification, `input` and `change` together as a native
     `<select>` sends them, from this element and once the size is on it. The
     select inside sends its own, which are stopped: `input` is composed and
     reached the page looking like this element's. */
  test('says input and change once the size has moved, from itself alone', async () => {
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    await settle(it)
    const heard: string[] = []
    for (const type of ['change', 'input']) {
      it.addEventListener(type, (event) => {
        heard.push(`${type}@${(event.composedPath()[0] as Element).localName}:${it.value}`)
      })
    }
    ;(control(it) as unknown as { requestValue(next: string): boolean }).requestValue('25')
    await settle(it)
    expect(heard.toSorted()).toEqual([
      'change@helix-headless-pagination-size:25',
      'input@helix-headless-pagination-size:25',
    ])
  })

  test('and says nothing when the size was refused', async () => {
    const it = (await mount(
      '<helix-headless-pagination-size default-value="10" sizes="10,25"></helix-headless-pagination-size>',
    )) as Size
    await settle(it)
    it.addEventListener('helix-before-change', (event) => event.preventDefault())
    const heard: string[] = []
    for (const type of ['change', 'input']) {
      it.addEventListener(type, () => heard.push(type))
    }
    ;(control(it) as unknown as { requestValue(next: string): boolean }).requestValue('25')
    await settle(it)
    expect(heard).toEqual([])
    expect(it.value).toBe(10)
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
    expect(hasState(it, 'empty')).toBe(true)
  })
})

describe('pagination size in a form', () => {
  /* A GET form could carry the page and not the size, because the size was no
     form control: the footer had to be rebuilt in script to keep it. */
  test('submits the size in force, follows a choice, and returns to the default on a reset', async () => {
    const it = (await mount(
      '<helix-headless-pagination-size name="per" sizes="10,25,50" default-value="25"></helix-headless-pagination-size>',
    )) as Size & { formResetCallback: () => void }
    expect(formValue(it)).toBe('25')
    control(it).dispatchEvent(choose(it, '50'))
    await settle(it)
    expect(formValue(it)).toBe('50')
    it.formResetCallback()
    await settle(it)
    expect(it.value).toBe(25)
    expect(formValue(it)).toBe('25')
  })

  test('a size no one named submits the first one offered, and a disabled one turns the select off', async () => {
    const it = (await mount(
      '<helix-headless-pagination-size name="per" sizes="10,25" disabled></helix-headless-pagination-size>',
    )) as Size
    expect(formValue(it)).toBe('10')
    expect(control(it).hasAttribute('disabled')).toBe(true)
  })
})

/* Select draws a `live` part for a choice made on its closed trigger, and a
   `::part(control-live)` reached nothing. */
describe('pagination size parts', () => {
  test('forwards the select live region as control-live', async () => {
    const host = (await mount(
      '<helix-headless-pagination-size></helix-headless-pagination-size>',
    )) as Size
    await host.updateComplete
    const forwarded = (control(host).getAttribute('exportparts') ?? '')
      .split(',')
      .map((pair) => pair.trim())
    expect(forwarded).toContain('live: control-live')
  })
})
