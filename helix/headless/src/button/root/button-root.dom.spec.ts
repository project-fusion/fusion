import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const control = (host: HTMLElement): Element | null => part(host, 'button')

describe('the variant shorthand', () => {
  test('reflects, because the mapping is a stylesheet reading the attribute', async () => {
    /* The whole of `variant` lives in the CSS as extra selectors on the blocks
       `appearance` and `tone` already have, so the attribute has to be on the
       host for anything to match. Nothing here computes the pair: there is no
       second copy of the mapping to fall out of step with the first.

       What it renders is not assertable in this environment, and was measured in
       a browser instead. Against the long form, `background-color`,
       `border-color` and `color` came out identical for all four:
       `primary` = `solid`+`primary`, `secondary` = the resting button,
       `tertiary` = `ghost`, `danger` = `solid`+`danger`. The `data-button`
       recipe matched its own long form on the same four. */
    const button = (await mount(
      '<helix-base-button variant="primary">Go</helix-base-button>',
    )) as Updatable
    await button.updateComplete
    expect((button as unknown as HTMLElement).getAttribute('variant')).toBe('primary')
  })

  test('and an axis written out loud is left alone', async () => {
    /* `variant="primary" appearance="ghost"` is a ghost in the brand colour,
       which is the only reading of that markup that is not a guess. The
       selectors say so with `:not([appearance])` rather than relying on their
       order, so moving a block cannot change the answer. Measured in a browser:
       transparent fill, transparent border, `oklch(0.7 0.19 258)` ink, which is
       neither plain `ghost` (white ink) nor `solid primary` (blue fill). */
    const button = (await mount(
      '<helix-base-button appearance="ghost" variant="primary">Go</helix-base-button>',
    )) as Updatable
    await button.updateComplete
    const host = button as unknown as HTMLElement
    expect(host.getAttribute('appearance')).toBe('ghost')
    expect(host.getAttribute('variant')).toBe('primary')
  })
})

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
