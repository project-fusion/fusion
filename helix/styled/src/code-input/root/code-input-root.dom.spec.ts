import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import validate from '../.examples/validate.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* An example runs its script only in a browser, so this runs there. */
const run = hasLayout() ? test : (): void => {}

describe('code input', () => {
  test('draws the field’s frame around the two layers', async () => {
    const element = await mount('<helix-code-input label="Payload"></helix-code-input>')
    expect(part(element, 'field')).not.toBeNull()
    expect(part(element, 'layers')?.contains(part(element, 'control') ?? null)).toBe(true)
  })
})

describe('the validate example', () => {
  run('says what is wrong with JSON that does not parse', async () => {
    await example(validate)
    const field = document.getElementById('settings-json') as HTMLElement & {
      reportValidity(): boolean
      updateComplete: Promise<unknown>
    }
    field.reportValidity()
    await field.updateComplete
    expect(part(field, 'feedback')?.textContent?.trim()).toBe(
      'Settings must be valid JSON. Check for a comma after the last entry.',
    )
  })
})
