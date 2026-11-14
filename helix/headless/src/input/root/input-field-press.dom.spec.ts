import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* A press on a field's own box, beside the text, puts focus in the text, as a
   press on a native field's padding does. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../number-input/index.js')
  await import('../../date-input/index.js')
})

const press = (target: Element): MouseEvent => {
  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true })
  target.dispatchEvent(event)
  return event
}

describe('a press on the field beside its text', () => {
  for (const tag of [
    'helix-headless-input',
    'helix-headless-number-input',
    'helix-headless-date-input',
  ]) {
    test(`puts focus in the text of ${tag}`, async () => {
      const host = await mount(`<${tag} label="A"></${tag}>`)
      const field = host.shadowRoot?.querySelector('[part="field"]') as HTMLElement
      const event = press(field)
      expect(event.defaultPrevented).toBe(true)
      expect(host.shadowRoot?.activeElement).toBe(
        host.shadowRoot?.querySelector('[part="control"]'),
      )
    })
  }

  test('leaves a press on the text to the text', async () => {
    const host = await mount('<helix-headless-input label="A"></helix-headless-input>')
    const event = press(host.shadowRoot?.querySelector('[part="control"]') as HTMLElement)
    expect(event.defaultPrevented).toBe(false)
  })

  test('does nothing on a disabled field', async () => {
    const host = await mount('<helix-headless-input label="A" disabled></helix-headless-input>')
    const event = press(host.shadowRoot?.querySelector('[part="field"]') as HTMLElement)
    expect(event.defaultPrevented).toBe(false)
  })
})
