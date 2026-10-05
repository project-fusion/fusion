import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Hearing a `<label>` change in the tree a control is in, which the platform
 * reports to nobody.
 *
 * Imported after `registerDom()`, so the module reads happy-dom's
 * `MutationObserver` and `Element`.
 */
let watchLabels: typeof import('./watch-labels.js').watchLabels

/** The watches a test started, stopped after it so no observer outlives it. */
const stops: Array<() => void> = []

beforeAll(async () => {
  registerDom()
  ;({ watchLabels } = await import('./watch-labels.js'))
})

afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop()
  }
})

/** A host in the page, and how many times its watch has heard a label change. */
const watched = (): { count: () => number; host: HTMLElement } => {
  document.body.innerHTML = '<p>Words</p><span id="field"></span>'
  const host = document.getElementById('field') as HTMLElement
  let heard = 0
  stops.push(
    watchLabels(host, () => {
      heard += 1
    }),
  )
  return { count: () => heard, host }
}

/** Lets the observer deliver what it saw. */
const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

describe('a watch on the labels in a tree', () => {
  test('hears a label added after the control', async () => {
    const { count } = watched()
    document.body.insertAdjacentHTML('beforeend', '<label for="field">Email</label>')
    await settle()
    expect(count()).toBe(1)
  })

  test('hears a label inside something added, its `for` changed, and its words changed', async () => {
    const { count } = watched()
    document.body.insertAdjacentHTML('beforeend', '<div><label>Name</label></div>')
    await settle()
    const label = document.querySelector('label') as HTMLLabelElement
    label.setAttribute('for', 'field')
    await settle()
    ;(label.firstChild as Text).data = 'Full name'
    await settle()
    expect(count()).toBe(3)
  })

  test('hears a label taken out', async () => {
    document.body.innerHTML = '<label for="field">Email</label><span id="field"></span>'
    let heard = 0
    stops.push(
      watchLabels(document.getElementById('field') as HTMLElement, () => {
        heard += 1
      }),
    )
    document.querySelector('label')?.remove()
    await settle()
    expect(heard).toBe(1)
  })

  test('and hears nothing for a change that touches no label', async () => {
    const { count } = watched()
    document.body.insertAdjacentHTML('beforeend', '<p>More</p>')
    ;(document.querySelector('p') as HTMLElement).textContent = 'Other words'
    document.querySelector('p')?.setAttribute('for', 'field')
    await settle()
    expect(count()).toBe(0)
  })

  test('stops when it is stopped', async () => {
    const { count } = watched()
    stops.pop()?.()
    document.body.insertAdjacentHTML('beforeend', '<label for="field">Email</label>')
    await settle()
    expect(count()).toBe(0)
  })

  test('serves every control in a tree from one observer', async () => {
    document.body.innerHTML = '<span id="a"></span><span id="b"></span>'
    const heard: string[] = []
    for (const id of ['a', 'b']) {
      stops.push(watchLabels(document.getElementById(id) as HTMLElement, () => heard.push(id)))
    }
    document.body.insertAdjacentHTML('beforeend', '<label for="a">A</label>')
    await settle()
    expect(heard).toEqual(['a', 'b'])
  })
})
