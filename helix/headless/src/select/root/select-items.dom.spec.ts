import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  hasState,
  part,
  registerDom,
  settle,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

type Select = HTMLElement & {
  items: unknown[] | undefined
  open: boolean
  updateComplete: Promise<unknown>
  value: string
}

/* React Aria virtualizes a Select's list with its `Virtualizer`; here a Select
   read only the option elements among its children, so a long list had to be
   drawn whole. */
const long = async (extra = ''): Promise<Select> => {
  document.body.innerHTML = `<style>::part(listbox-items) { max-block-size: 200px; overflow: auto }</style>
    <helix-headless-select label="Country" name="c" ${extra}></helix-headless-select>`
  const host = document.body.querySelector('helix-headless-select') as Select
  host.items = [
    ...Array.from({ length: 998 }, (_, at) => `Place ${String(at).padStart(3, '0')}`),
    { label: 'Zambia', value: 'zm' },
    { disabled: true, label: 'Zimbabwe', value: 'zw' },
  ]
  await settle(host)
  await settle(host)
  return host
}

const shown = (host: Select): string => part(host, 'value')?.textContent?.trim() ?? ''

const key = async (host: Select, name: string): Promise<void> => {
  part(host, 'trigger')?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )
  await settle(host)
}

describe('a select given its options as data', () => {
  test('passes them to its list, which draws a window of them', async () => {
    const host = await long()
    const listbox = part(host, 'listbox') as HTMLElement & { items: unknown[] }
    expect(listbox.items.length).toBe(1000)
    const drawn = listbox.shadowRoot?.querySelectorAll('helix-headless-option') ?? []
    expect(drawn.length).toBeLessThan(1000)
  })

  test('shows the label of the chosen record on the trigger, and submits its value', async () => {
    const host = await long('value="zm"')
    expect(shown(host)).toBe('Zambia')
    expect(formValue(host)).toBe('zm')
  })

  test('chooses by letters and steps with Left and Right on the closed trigger, over the whole set', async () => {
    const host = await long()
    await key(host, 'z')
    expect(host.value).toBe('zm')
    await key(host, 'ArrowLeft')
    expect(host.value).toBe('Place 997')
    await key(host, 'ArrowRight')
    await key(host, 'ArrowRight')
    expect(host.value).toBe('zm')
  })

  test('drops a chosen value whose record leaves', async () => {
    const host = await long('value="zm"')
    host.items = ['Place 000']
    await settle(host)
    await settle(host)
    expect(host.value).toBe('')
    expect(shown(host)).toBe('Choose')
  })
})

/* Popover says the side its panel landed on as a state, and Select only
   wrote it on the panel, where `::part()` cannot follow it with an attribute. */
if (hasLayout()) {
  describe('the side the list opens on', () => {
    test('is a state on the host', async () => {
      document.body.innerHTML = `<helix-headless-select label="L"><helix-headless-option value="a">A</helix-headless-option></helix-headless-select>`
      const host = document.body.firstElementChild as Select
      await settle(host)
      host.open = true
      await settle(host)
      for (let attempt = 0; attempt < 50 && !hasState(host, 'placed-bottom'); attempt += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      expect(hasState(host, 'placed-bottom')).toBe(true)
      expect(hasState(host, 'placed-top')).toBe(false)
    })
  })
}
