import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const control = (host: HTMLElement): Element | null => part(host, 'button')

describe('button control', () => {
  test('is always a button, never an anchor', async () => {
    // A router renders its own anchor and cannot render it inside this shadow
    // root, so a button that could also be a link forced every such navigation
    // to be a full page load. A link that looks like a button is the
    // `data-button` recipe in the base layer instead.
    const button = await mount('<helix-headless-button>Go</helix-headless-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    expect(button.shadowRoot?.querySelector('a')).toBeNull()
  })

  test('is a real button, not a div with a role', async () => {
    const button = await mount('<helix-headless-button>Go</helix-headless-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    // Always `button`, never `submit`: a submit inside a shadow root has no
    // form to submit, so submission is handled explicitly instead.
    expect(control(button)?.getAttribute('type')).toBe('button')
  })

  test('a disabled button takes the native attribute', async () => {
    const button = await mount('<helix-headless-button disabled>X</helix-headless-button>')
    expect((control(button) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('button form participation', () => {
  test('finds the form it is inside without a form attribute', async () => {
    document.body.innerHTML =
      '<form><helix-headless-button type="submit">Send</helix-headless-button></form>'
    const button = document.querySelector('helix-headless-button') as Updatable & {
      form: HTMLFormElement
    }
    await button.updateComplete
    expect(button.form?.tagName).toBe('FORM')
  })

  test('submitting routes through the form, across the shadow boundary', async () => {
    document.body.innerHTML =
      '<form><helix-headless-button type="submit">Send</helix-headless-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Updatable
    await button.updateComplete

    let submitted = 0
    // `requestSubmit` runs validation; `submit` skips it. Which one is called
    // is the whole point of handling submission by hand.
    form.requestSubmit = () => {
      submitted += 1
    }
    ;(control(button) as HTMLElement).click()
    expect(submitted).toBe(1)
  })

  test('a plain button leaves its form alone', async () => {
    document.body.innerHTML = '<form><helix-headless-button>Nothing</helix-headless-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-headless-button') as Updatable
    await button.updateComplete

    let submitted = 0
    form.requestSubmit = () => {
      submitted += 1
    }
    ;(control(button) as HTMLElement).click()
    expect(submitted).toBe(0)
  })
})

describe('button invokers', () => {
  /* **A target that arrives after the button rendered still gets the command.**
   *
   * Linking the command from `updated` alone resolves the target once and never
   * again, and a button whose properties do not change does not update again: one
   * rendered before its target existed stays wired to nothing permanently.
   * Measured that way, `commandForElement` read null with the target absent, null
   * again after it was inserted, and resolved only when an unrelated property
   * forced an update.
   *
   * **The environment decides which half of the component this exercises**, and
   * both halves are worth having. Under happy-dom there are no invokers, so this
   * is `sendCommand` and its live lookup, which was always correct. In the
   * browser suite it is the native path, which was the broken one. The assertion
   * is the same either way because the fallback event is named `command` to
   * match the platform's. */
  test('a command reaches a target inserted after the button rendered', async () => {
    const button = await mount(
      '<helix-headless-button command="--go" commandfor="late">Go</helix-headless-button>',
    )

    const target = document.createElement('div')
    target.id = 'late'
    document.body.append(target)

    let received: string | null = null
    target.addEventListener('command', (event) => {
      received = (event as Event & { command?: string }).command ?? null
    })

    ;(control(button) as HTMLElement).click()
    expect<string | null>(received).toBe('--go')
  })
})
