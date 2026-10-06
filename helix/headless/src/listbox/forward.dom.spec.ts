import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported once a document exists: Lit reads `document` as it loads. */
let render: typeof import('lit').render
let renderListStatus: typeof import('./forward.js').renderListStatus

beforeAll(async () => {
  registerDom()
  ;({ render } = await import('lit'))
  ;({ renderListStatus } = await import('./forward.js'))
})

/** The four slots drawn for a holder with `light` as its light DOM. */
const drawn = (light = ''): { host: HTMLElement; slots: HTMLSlotElement[] } => {
  const host = document.createElement('div')
  host.innerHTML = light
  const out = document.createElement('div')
  render(
    renderListStatus({
      emptyText: 'No fruit',
      host,
      loadError: 'Could not load',
      loadingText: 'Loading fruit',
      refill: () => {},
    }),
    out,
  )
  return { host, slots: [...out.querySelectorAll('slot')] }
}

describe('the status slots a listbox holder hands on', () => {
  test('pass each of its slots to the list’s own, with its words as the fallback', () => {
    const { slots } = drawn()
    expect(slots.map((one) => [one.name, one.getAttribute('slot'), one.textContent])).toEqual([
      ['empty', 'empty', 'No fruit'],
      ['loading', 'loading', 'Loading fruit'],
      ['error', 'error', 'Could not load'],
      ['no-results', null, ''],
    ])
  })

  test('pass `no-results` only while the holder’s light DOM fills it', () => {
    const { slots } = drawn('<p slot="no-results">No fruit matches</p>')
    expect(slots[3]?.getAttribute('slot')).toBe('no-results')
  })
})
