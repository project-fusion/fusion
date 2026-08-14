import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

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
    const button = await mount('<helix-button>Go</helix-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    expect(button.shadowRoot?.querySelector('a')).toBeNull()
  })

  test('is a real button, not a div with a role', async () => {
    const button = await mount('<helix-button>Go</helix-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    // Always `button`, never `submit`: a submit inside a shadow root has no
    // form to submit, so submission is handled explicitly instead.
    expect(control(button)?.getAttribute('type')).toBe('button')
  })

  test('a disabled button takes the native attribute', async () => {
    const button = await mount('<helix-button disabled>X</helix-button>')
    expect((control(button) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('button form participation', () => {
  test('finds the form it is inside without a form attribute', async () => {
    document.body.innerHTML = '<form><helix-button type="submit">Send</helix-button></form>'
    const button = document.querySelector('helix-button') as Updatable & { form: HTMLFormElement }
    await button.updateComplete
    expect(button.form?.tagName).toBe('FORM')
  })

  test('submitting routes through the form, across the shadow boundary', async () => {
    document.body.innerHTML = '<form><helix-button type="submit">Send</helix-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-button') as Updatable
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
    document.body.innerHTML = '<form><helix-button>Nothing</helix-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-button') as Updatable
    await button.updateComplete

    let submitted = 0
    form.requestSubmit = () => {
      submitted += 1
    }
    ;(control(button) as HTMLElement).click()
    expect(submitted).toBe(0)
  })
})
