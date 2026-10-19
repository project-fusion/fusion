import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import agent from '../.examples/agent.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/** The middle of a device's screen, where a finger lands. */
const middle = (device: Element): { clientX: number; clientY: number; screen: Element } => {
  const screen = device.shadowRoot?.querySelector('[part="screen"]') as Element
  const box = screen.getBoundingClientRect()
  return { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, screen }
}

const press = (screen: Element, type: string, at: { clientX: number; clientY: number }): void => {
  screen.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      ...at,
    }),
  )
}

describe('the events example', () => {
  run('a tap on the screen is written in the log and marked where it landed', async () => {
    await example(events)
    const phone = document.getElementById('phone') as HTMLElement
    const { screen, ...at } = middle(phone)
    press(screen, 'pointerdown', at)
    press(screen, 'pointerup', at)
    await idle()
    expect(logged()).toEqual(['helix-device-tap'])
    expect(phone.shadowRoot?.querySelector('[part~="touch"]')).not.toBeNull()
  })

  run('a press on Back is written in the log', async () => {
    await example(events)
    const phone = document.getElementById('phone') as HTMLElement
    ;(phone.shadowRoot?.querySelector('[part="back"]') as HTMLElement | null)?.click()
    await idle()
    expect(logged()).toEqual(['helix-device-button'])
  })
})

describe('the agent example', () => {
  run('the buttons mark the agent’s touches on a screen that takes none', async () => {
    await example(agent)
    const phone = document.getElementById('phone') as HTMLElement
    const { screen, ...at } = middle(phone)
    let touched = 0
    phone.addEventListener('helix-device-touch', () => {
      touched += 1
    })
    press(screen, 'pointerdown', at)
    expect(touched).toBe(0)
    ;(document.getElementById('tap') as HTMLElement).click()
    await idle()
    expect(phone.shadowRoot?.querySelector('[part~="touch"]')).not.toBeNull()
  })
})
