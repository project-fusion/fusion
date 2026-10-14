import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

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

  /* **One test for the whole inherited surface, rather than Button's own tests
     copied.** This class adds only a tooltip around Button's render, so every
     one of those properties is already asserted where it is declared and
     repeating them here would assert the same render twice. What is worth
     holding is that the render is still Button's: a subclass that grew a
     `render` of its own would take the tab stop, the disclosure state and the
     five submission overrides with it silently, which is exactly what has
     happened to `CopyButton` one level down. */
  test('everything Button renders is what this renders, subclassing nothing away', async () => {
    document.body.innerHTML =
      '<form action="/base"><helix-headless-icon-button type="submit" label="Save" formaction="/elsewhere">i</helix-headless-icon-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-icon-button') as Updatable & {
      focusable: boolean
      expanded?: boolean
    }
    await button.updateComplete

    button.focusable = false
    button.expanded = true
    await button.updateComplete
    expect(part(button, 'button')?.getAttribute('tabindex')).toBe('-1')
    expect(part(button, 'button')?.getAttribute('aria-expanded')).toBe('true')

    let action: string | null = null
    form.requestSubmit = (submitter?: HTMLElement | null) => {
      action = submitter?.getAttribute('formaction') ?? null
    }
    ;(part(button, 'button') as HTMLElement).click()
    expect<string | null>(action).toBe('/elsewhere')
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

  test('shows its label in a tooltip', async () => {
    const button = await mount(
      '<helix-headless-icon-button label="Settings">i</helix-headless-icon-button>',
    )
    const tooltip = button.shadowRoot?.querySelector('helix-headless-tooltip')
    expect(tooltip?.getAttribute('content')).toBe('Settings')
    expect(tooltip?.contains(part(button, 'button') ?? null)).toBe(true)
  })

  test('draws no tooltip under tooltip="none"', async () => {
    const button = await mount(
      '<helix-headless-icon-button label="Settings" tooltip="none">i</helix-headless-icon-button>',
    )
    expect(button.shadowRoot?.querySelector('helix-headless-tooltip')).toBeNull()
  })

  /* A tooltip the page wraps the button in has more to say, such as a
     shortcut, and two bubbles over one button would read as a fault. */
  test('says nothing of its own inside a tooltip it is the trigger of', async () => {
    document.body.innerHTML =
      '<helix-headless-tooltip content="Settings, ⌘,"><helix-headless-icon-button label="Settings">i</helix-headless-icon-button></helix-headless-tooltip>'
    const button = document.querySelector('helix-headless-icon-button') as Updatable
    await button.updateComplete
    await button.updateComplete
    const inner = button.shadowRoot?.querySelector('helix-headless-tooltip')
    expect(inner?.getAttribute('content')).toBe('')
  })
})
