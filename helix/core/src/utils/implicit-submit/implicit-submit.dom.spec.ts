import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { TemplateResult } from 'lit'

/**
 * Enter in a Helix text control submits its form as Enter in a native one
 * does, which the platform cannot do for an input in a shadow root.
 */
type Probe = HTMLElement & { form: HTMLFormElement | null; updateComplete: Promise<boolean> }

let defaultButton: typeof import('./implicit-submit.js').defaultButton
let submitImplicitly: typeof import('./implicit-submit.js').submitImplicitly
let submits: typeof import('./implicit-submit.js').submits
let submitsOnEnter: typeof import('./implicit-submit.js').submitsOnEnter

beforeAll(async () => {
  registerDom()
  const { html } = await import('lit')
  const { HelixFormElement } = await import('../../helix-form-element/helix-form-element.js')
  ;({ defaultButton, submitImplicitly, submits, submitsOnEnter } = await import(
    './implicit-submit.js'
  ))
  customElements.define(
    'probe-submit-control',
    class extends HelixFormElement {
      protected override get blocksImplicitSubmission(): boolean {
        return true
      }

      protected override render(): TemplateResult {
        return html`<input part="control" />`
      }
    },
  )
  customElements.define(
    'probe-submit-button',
    class extends HelixFormElement {
      protected override get submitsForm(): boolean {
        return true
      }

      protected override render(): TemplateResult {
        return html`<button part="control"></button>`
      }
    },
  )
})

const mount = async (markup: string): Promise<Probe> => {
  document.body.innerHTML = markup
  const host = document.querySelector('probe-submit-control') as Probe
  await host.updateComplete
  return host
}

describe('Enter in a text control', () => {
  const submits = (form: HTMLFormElement): (() => number) => {
    let count = 0
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      count += 1
    })
    return () => count
  }

  test('presses the form’s default button', async () => {
    const host = await mount(
      '<form><probe-submit-control></probe-submit-control><button type="submit">Go</button></form>',
    )
    const button = document.querySelector('button') as HTMLButtonElement
    let pressed = 0
    button.addEventListener('click', () => {
      pressed += 1
    })
    submitImplicitly(host.form)
    expect(pressed).toBe(1)
  })

  test('submits a form with no button and no other text field', async () => {
    const host = await mount('<form><probe-submit-control></probe-submit-control></form>')
    const count = submits(host.closest('form') as HTMLFormElement)
    submitImplicitly(host.form)
    expect(count()).toBe(1)
  })

  /* Two native fields beside it, because the double leaves a custom element
     out of `form.elements`, which a browser does not. */
  test('and does nothing in a form with other text fields and no button', async () => {
    const host = await mount(
      '<form><probe-submit-control></probe-submit-control><input name="a" /><input name="b" /></form>',
    )
    const count = submits(host.closest('form') as HTMLFormElement)
    submitImplicitly(host.form)
    expect(count()).toBe(0)
  })

  test('nor where the default button is disabled', async () => {
    const host = await mount(
      '<form><probe-submit-control></probe-submit-control><button disabled>Go</button></form>',
    )
    const count = submits(host.closest('form') as HTMLFormElement)
    submitImplicitly(host.form)
    expect(count()).toBe(0)
  })
})

describe('a submit button', () => {
  test('is a native submit button or image input, or a Helix control that says it submits', async () => {
    document.body.innerHTML =
      '<button type="submit"></button><button type="button"></button><input type="image" /><input /><probe-submit-button></probe-submit-button><probe-submit-control></probe-submit-control>'
    expect([...document.body.children].map((element) => submits(element))).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
    ])
  })
})

describe('the default button', () => {
  test('is the first control in the form that submits it', async () => {
    document.body.innerHTML =
      '<form><button type="button">Back</button><input id="first" type="image" /><button type="submit">Send</button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    expect(defaultButton(form) === document.getElementById('first')).toBe(true)
  })

  test('is none in a form with no submit button', () => {
    document.body.innerHTML = '<form><button type="button">Back</button><input /></form>'
    expect(defaultButton(document.querySelector('form') as HTMLFormElement)).toBeUndefined()
  })
})

describe('Enter in a native field', () => {
  test('submits from a text field of the form, which the platform does itself', () => {
    document.body.innerHTML =
      '<form><input id="text" /><input id="box" type="checkbox" /></form><input id="outside" form="other" />'
    const form = document.querySelector('form') as HTMLFormElement
    const field = (id: string) => document.getElementById(id) ?? undefined
    expect(submitsOnEnter(field('text'), form)).toBe(true)
    expect(submitsOnEnter(field('box'), form)).toBe(false)
    expect(submitsOnEnter(field('outside'), form)).toBe(false)
    expect(submitsOnEnter(undefined, form)).toBe(false)
  })
})
