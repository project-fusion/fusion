import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The labels of a control, read without a live list where no label could
 * name it.
 *
 * Imported after `registerDom()`, so the module reads happy-dom's elements.
 */
let labelsOf: typeof import('./labels-of.js').labelsOf

beforeAll(async () => {
  registerDom()
  ;({ labelsOf } = await import('./labels-of.js'))
})

/** Counts the reads of an element's `labels`, which answer `found`. */
const counted = (element: Element, found: Element[]): (() => number) => {
  let asked = 0
  Object.defineProperty(element, 'labels', {
    get: () => {
      asked += 1
      return found
    },
  })
  return () => asked
}

describe('labelsOf', () => {
  test('reads the labels of a control a label names by its id', () => {
    document.body.innerHTML = '<label for="email">Email</label><input id="email">'
    const input = document.getElementById('email') as HTMLInputElement
    expect(labelsOf(input).map((label) => label.textContent)).toEqual(['Email'])
  })

  test('reads the labels of a control inside a label', () => {
    document.body.innerHTML = '<label>Name <input></label>'
    const input = document.querySelector('input') as HTMLInputElement
    expect(labelsOf(input).map((label) => label.textContent)).toEqual(['Name '])
  })

  test('asks nothing of a control with no id and no label around it', () => {
    document.body.innerHTML = '<label>Other <input></label><button>Go</button>'
    const button = document.querySelector('button') as HTMLButtonElement
    const asked = counted(button, [])
    expect(labelsOf(button)).toEqual([])
    expect(asked()).toBe(0)
  })

  test('asks a host with an id, which a label elsewhere may name', () => {
    document.body.innerHTML = '<label for="due">Due</label><span id="due"></span>'
    const host = document.getElementById('due') as HTMLElement
    const label = document.querySelector('label') as HTMLLabelElement
    const asked = counted(host, [label])
    expect(labelsOf(host)).toEqual([label])
    expect(asked()).toBe(1)
  })
})
