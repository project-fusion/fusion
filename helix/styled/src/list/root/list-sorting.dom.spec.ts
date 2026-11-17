import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import sorting from '../.examples/sorting.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../button-group/index.js')
  await import('../../icon/index.js')
  await import('../../icon-button/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const names = (): string[] =>
  [...document.querySelectorAll('helix-list-item')].map((row) => row.getAttribute('value') ?? '')

describe('the sorting example', () => {
  run('sorts the rows, adds one at the top, and removes the one pressed', async () => {
    await example(sorting)
    ;(document.getElementById('sort') as HTMLElement).click()
    await idle()
    expect(names()).toEqual(['atlas', 'cedar', 'lumen', 'orbit'])
    ;(document.getElementById('add') as HTMLElement).click()
    await idle()
    expect(names()[0]).toBe('harbor')
    ;(document.querySelector('helix-list-item helix-icon-button') as HTMLElement).click()
    await idle()
    expect(names()).toEqual(['atlas', 'cedar', 'lumen', 'orbit'])
  })
})
