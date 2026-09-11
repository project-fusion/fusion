import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../card/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const key = (target: HTMLElement, name: string): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )
}

describe('the events example', () => {
  run('a step of the divider asks to resize, and one to the edge asks to collapse', async () => {
    await example(events)
    const separator = part(
      document.getElementById('panes') as HTMLElement,
      'separator',
    ) as HTMLElement
    key(separator, 'ArrowLeft')
    await idle()
    expect(logged()).toEqual(['helix-before-resize'])
    key(separator, 'Home')
    await idle()
    expect(logged()).toContain('helix-before-collapse')
  })
})

describe('the controlled example', () => {
  run('a step asks, and the page moves and unfolds the divider it holds', async () => {
    await example(controlled)
    const panes = document.getElementById('panes') as HTMLElement & {
      collapsed: 'end' | 'start' | undefined
    }
    expect(panes.collapsed).not.toBeUndefined()
    key(part(panes, 'separator') as HTMLElement, 'ArrowRight')
    await idle()
    expect(panes.collapsed).toBeUndefined()
  })
})
