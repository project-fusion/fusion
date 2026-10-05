import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Input = HTMLElement & {
  updateComplete: Promise<boolean>
  value: string
}

const control = (host: HTMLElement): HTMLInputElement => part(host, 'control') as HTMLInputElement

const enter = (host: HTMLElement): KeyboardEvent => {
  const event = new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' })
  control(host).dispatchEvent(event)
  return event
}

describe('Enter in the field', () => {
  /* The `<input>` is in a shadow root and has no form owner, so the platform
     never ran implicit submission for it, and Enter did nothing at all. */
  test('presses the form’s default button', async () => {
    document.body.innerHTML =
      '<form><helix-headless-input name="q" label="Search"></helix-headless-input><button>Go</button></form>'
    const host = document.querySelector('helix-headless-input') as Input
    await host.updateComplete
    let pressed = 0
    document.querySelector('button')?.addEventListener('click', (event) => {
      event.preventDefault()
      pressed += 1
    })
    enter(host)
    expect(pressed).toBe(1)
  })

  test('and submits a form with no button and no other field', async () => {
    document.body.innerHTML =
      '<form><helix-headless-input name="q" label="Search"></helix-headless-input></form>'
    const host = document.querySelector('helix-headless-input') as Input
    await host.updateComplete
    let submitted = 0
    document.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault()
      submitted += 1
    })
    enter(host)
    expect(submitted).toBe(1)
  })

  test('does nothing outside a form', async () => {
    const host = (await mount(
      '<helix-headless-input label="Search"></helix-headless-input>',
    )) as Input
    expect(() => enter(host)).not.toThrow()
  })
})
