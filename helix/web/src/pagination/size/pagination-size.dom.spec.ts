import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Size = HTMLElement & { updateComplete: Promise<unknown>; value: number }

const control = (host: HTMLElement): HTMLSelectElement => part(host, 'control') as HTMLSelectElement

describe('pagination size', () => {
  test('offers the sizes it was given, in order', async () => {
    const it = await mount('<helix-pagination-size sizes="10,25,50"></helix-pagination-size>')
    expect([...control(it).options].map((one) => one.value)).toEqual(['10', '25', '50'])
  })

  test('anything that is not a size is dropped rather than offered', async () => {
    // An option that cannot mean anything is worse than a shorter list.
    const it = await mount('<helix-pagination-size sizes="10, ,x,-5,25"></helix-pagination-size>')
    expect([...control(it).options].map((one) => one.value)).toEqual(['10', '25'])
  })

  test('falls back to the first offered where nothing named one', async () => {
    const it = await mount('<helix-pagination-size sizes="20,40"></helix-pagination-size>')
    expect(control(it).value).toBe('20')
  })

  test('the label is a real label for a real select, in one shadow root', async () => {
    // Ids are scoped to their root, so this collides with nothing in the
    // document and needs none of the element-reference machinery a label
    // outside a shadow boundary would.
    const it = await mount('<helix-pagination-size></helix-pagination-size>')
    const label = part(it, 'label') as HTMLLabelElement
    expect(label.textContent?.trim()).toBe('Per page')
    expect(label.htmlFor).toBe(control(it).id)
  })

  test('moves itself when nothing declared the value', async () => {
    const it = (await mount(
      '<helix-pagination-size default-value="10" sizes="10,25"></helix-pagination-size>',
    )) as Size
    control(it).value = '25'
    control(it).dispatchEvent(new Event('change', { bubbles: true }))
    await it.updateComplete
    expect(it.value).toBe(25)
  })

  test('announces before it moves, so a listener can refuse', async () => {
    const it = (await mount(
      '<helix-pagination-size default-value="10" sizes="10,25"></helix-pagination-size>',
    )) as Size
    let announced = ''
    it.addEventListener('helix-change', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
      event.preventDefault()
    })
    control(it).value = '25'
    control(it).dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
    await it.updateComplete
    expect(announced).toBe('25')
    expect(it.value).toBe(10)
  })

  test('a refused change puts the native control back', async () => {
    /* The one case `requestControlledChange` cannot announce ahead of: a
       `<select>` changes itself and then tells you, so refusing it has to undo
       what the platform already did. */
    const it = (await mount(
      '<helix-pagination-size default-value="10" sizes="10,25"></helix-pagination-size>',
    )) as Size
    it.addEventListener('helix-change', (event) => event.preventDefault())
    control(it).value = '25'
    control(it).dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
    await it.updateComplete
    await it.updateComplete
    expect(control(it).value).toBe('10')
  })

  test('declaring `value` hands it over: it announces and applies nothing', async () => {
    const it = (await mount(
      '<helix-pagination-size sizes="10,25" value="10"></helix-pagination-size>',
    )) as Size
    let announced = ''
    it.addEventListener('helix-change', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    control(it).value = '25'
    control(it).dispatchEvent(new Event('change', { bubbles: true }))
    await it.updateComplete
    expect(announced).toBe('25')
    expect(it.value).toBe(10)
  })
})
