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
  run('pressing a step is heard first, and then the sequence asks to activate it', async () => {
    await example(events)
    press(document.querySelector('helix-step[value="payment"]'))
    await idle()
    /* The root acts on the press once every listener has had the chance to
       refuse it, so the press is heard before the request it makes. */
    expect(logged()).toEqual(['helix-select', 'helix-before-activate'])
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
