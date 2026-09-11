import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const press = (step: Element | null): void => {
  const label = part(step as HTMLElement, 'label') as HTMLElement | null
  ;((label?.shadowRoot?.querySelector('button') ?? label) as HTMLElement | null)?.click()
}

describe('the events example', () => {
  run('pressing a step asks to activate it, then selects it', async () => {
    await example(events)
    press(document.querySelector('helix-step[value="payment"]'))
    await idle()
    expect(logged()).toEqual(['helix-before-activate', 'helix-select'])
  })
})

describe('the controlled example', () => {
  run('a press asks, and the page moves the step it holds', async () => {
    await example(controlled)
    press(document.querySelector('helix-step[value="review"]'))
    await idle()
    expect((document.getElementById('flow') as HTMLElement & { active: string }).active).toBe(
      'review',
    )
  })
})
