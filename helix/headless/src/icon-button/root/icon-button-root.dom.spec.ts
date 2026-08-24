import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('icon button', () => {
  test('names itself for a screen reader from `label`', async () => {
    const button = await mount(
      '<helix-headless-icon-button label="Settings">i</helix-headless-icon-button>',
    )
    expect(part(button, 'button')?.getAttribute('aria-label')).toBe('Settings')
  })

  test('disabled reaches the control, not just the host', async () => {
    // A host attribute alone would style a disabled button that still clicks.
    const button = await mount(
      '<helix-headless-icon-button disabled label="x">i</helix-headless-icon-button>',
    )
    expect((part(button, 'button') as HTMLButtonElement).disabled).toBe(true)
  })

  test('a click on the control reaches a listener on the host', async () => {
    const button = await mount(
      '<helix-headless-icon-button label="x">i</helix-headless-icon-button>',
    )
    let clicks = 0
    button.addEventListener('click', () => {
      clicks += 1
    })
    ;(part(button, 'button') as HTMLElement).click()
    expect(clicks).toBe(1)
  })
})
