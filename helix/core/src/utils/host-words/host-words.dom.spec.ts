import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let hostWords: typeof import('./host-words.js').hostWords

beforeAll(async () => {
  registerDom()
  ;({ hostWords } = await import('./host-words.js'))
})

/** A host on a page, with `labels` as a form control has them. */
const host = (markup: string, labels: Element[] = []): HTMLElement => {
  document.body.innerHTML = markup
  const found = document.querySelector('#host') as HTMLElement
  Object.defineProperty(found, 'labels', { configurable: true, value: labels })
  return found
}

describe('the words that name a host', () => {
  test('are its `aria-labelledby` words first, joined and with white space folded', () => {
    const element = host(
      '<p id="a">Sort  by</p><p id="b"><span hidden>x</span>date</p><div id="host" aria-labelledby="a b missing" aria-label="Own"></div>',
    )
    expect(hostWords(element, 'Label')).toBe('Sort by date')
  })

  test('then its `aria-label`, then its own name, then a `<label>` for it', () => {
    expect(hostWords(host('<div id="host" aria-label=" Order "></div>'), 'Label')).toBe('Order')
    const labeled = host('<label id="l">Fruit</label><div id="host"></div>', [])
    Object.defineProperty(labeled, 'labels', { value: [document.querySelector('#l')] })
    expect(hostWords(labeled, 'Label')).toBe('Label')
    expect(hostWords(labeled)).toBe('Fruit')
  })

  test('are empty where nothing names it', () => {
    expect(hostWords(host('<div id="host" aria-labelledby="nowhere"></div>'))).toBe('')
  })
})
