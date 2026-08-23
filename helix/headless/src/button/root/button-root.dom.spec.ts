import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const control = (host: HTMLElement): Element | null => part(host, 'button')

/* **The `variant` shorthand had two tests here and they are gone with it.**
   `014ebe8d` folded the four presets back into the `emphasis` and `tone` pair
   they were short for, and the CSS mapping went with them, but the tests stayed.
   What they asserted by then was that `getAttribute('variant')` returns what the
   markup wrote, on a tier that declares neither `variant` nor `emphasis`: the
   DOM storing an attribute, with nothing about Button involved. Two tests that
   passed whatever the component did, under a name describing an API that no
   longer existed. */

describe('button control', () => {
  test('is always a button, never an anchor', async () => {
    // A router renders its own anchor and cannot render it inside this shadow
    // root, so a button that could also be a link forced every such navigation
    // to be a full page load. A link that looks like a button is the
    // `data-button` recipe in the base layer instead.
    const button = await mount('<helix-base-button>Go</helix-base-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    expect(button.shadowRoot?.querySelector('a')).toBeNull()
  })

  test('is a real button, not a div with a role', async () => {
    const button = await mount('<helix-base-button>Go</helix-base-button>')
    expect(control(button)?.tagName).toBe('BUTTON')
    // Always `button`, never `submit`: a submit inside a shadow root has no
    // form to submit, so submission is handled explicitly instead.
    expect(control(button)?.getAttribute('type')).toBe('button')
  })

  test('a disabled button takes the native attribute', async () => {
    const button = await mount('<helix-base-button disabled>X</helix-base-button>')
    expect((control(button) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('button form participation', () => {
  test('finds the form it is inside without a form attribute', async () => {
    document.body.innerHTML =
      '<form><helix-base-button type="submit">Send</helix-base-button></form>'
    const button = document.querySelector('helix-base-button') as Updatable & {
      form: HTMLFormElement
    }
    await button.updateComplete
    expect(button.form?.tagName).toBe('FORM')
  })

  test('submitting routes through the form, across the shadow boundary', async () => {
    document.body.innerHTML =
      '<form><helix-base-button type="submit">Send</helix-base-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-base-button') as Updatable
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
    document.body.innerHTML = '<form><helix-base-button>Nothing</helix-base-button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const button = document.querySelector('helix-base-button') as Updatable
    await button.updateComplete

    let submitted = 0
    form.requestSubmit = () => {
      submitted += 1
    }
    ;(control(button) as HTMLElement).click()
    expect(submitted).toBe(0)
  })
})
