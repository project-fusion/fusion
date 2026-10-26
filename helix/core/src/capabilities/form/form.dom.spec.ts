import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { formValue, registerDom } from '@fusion.dev/helix-testing/dom'
import type { TemplateResult } from 'lit'
import type { webForm as WebForm } from './web.js'

/**
 * The web's form capability, on a Helix control and on a bare `HelixElement`
 * that is form associated.
 *
 * **The test double judges nothing itself**: it records the flags and the
 * message it is handed, so what is asserted is the verdict handed to the
 * platform, read back through `validity` and `validationMessage`.
 */
type Control = HTMLElement & {
  setCustomValidity(message: string): void
  updateComplete: Promise<boolean>
  validationMessage: string
  validity: ValidityState
}

/** A bare `HelixElement` that is form associated, whose internals core holds. */
type Plain = HTMLElement

let webForm: typeof WebForm
let internalsOf: (element: HTMLElement) => ElementInternals

beforeAll(async () => {
  registerDom()
  /* Lit and the web implementation after the double: the implementation
     reaches `HelixFormElementBase` through `utils/implicit-submit`, and Lit's
     templates are built with whichever `document` it found when it loaded. */
  const { html } = await import('lit')
  const { HelixFormElement } = await import('../../helix-form-element/helix-form-element.js')
  const core = await import('../../helix-element/helix-element.js')
  internalsOf = core.internalsOf as unknown as typeof internalsOf
  ;({ webForm } = await import('./web.js'))
  customElements.define(
    'probe-capability-form-control',
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
    'probe-capability-form-plain',
    class extends core.HelixElement {
      static readonly formAssociated = true
    },
  )
})

afterEach(() => {
  document.body.replaceChildren()
})

const mount = async (markup: string): Promise<Control> => {
  document.body.innerHTML = markup
  const host = document.querySelector('probe-capability-form-control') as Control
  await host.updateComplete
  return host
}

/** Counts the form's submissions, and keeps the page where it is. */
const submissions = (form: HTMLFormElement): (() => number) => {
  let count = 0
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    count += 1
  })
  return () => count
}

describe('webForm.value', () => {
  test('gives the form a control’s value, and no value for `null`', async () => {
    const host = await mount('<probe-capability-form-control></probe-capability-form-control>')
    webForm.value(host, 'Ada')
    expect(formValue(host)).toBe('Ada')
    webForm.value(host, null)
    expect(formValue(host)).toBeNull()
  })

  test('gives nothing for a node that keeps no internals', () => {
    const node = document.createElement('div')
    expect(() => webForm.value(node, 'Ada')).not.toThrow()
    expect(formValue(node)).toBeUndefined()
  })
})

describe('webForm.validity', () => {
  test('marks a control invalid with each flag, and the message', async () => {
    const host = await mount('<probe-capability-form-control></probe-capability-form-control>')
    webForm.validity(host, ['valueMissing', 'tooShort'], 'Enter your name', null)
    expect(host.validity.valid).toBe(false)
    expect(host.validity.valueMissing).toBe(true)
    expect(host.validity.tooShort).toBe(true)
    expect(host.validationMessage).toBe('Enter your name')
  })

  test('clears the verdict for an empty list', async () => {
    const host = await mount('<probe-capability-form-control></probe-capability-form-control>')
    webForm.validity(host, ['valueMissing'], 'Enter your name', null)
    webForm.validity(host, [], '', null)
    expect(host.validity.valid).toBe(true)
    expect(host.validationMessage).toBe('')
  })

  test('leaves a custom message laid over the verdict', async () => {
    const host = await mount('<probe-capability-form-control></probe-capability-form-control>')
    host.setCustomValidity('That name is taken')
    webForm.validity(host, [], '', null)
    expect(host.validity.customError).toBe(true)
    expect(host.validationMessage).toBe('That name is taken')
  })

  test('hands `setValidity` the flags, the message, and the anchor, or no anchor for `null`', () => {
    const node = document.createElement('probe-capability-form-plain') as Plain
    const anchor = document.createElement('input')
    const calls: unknown[][] = []
    internalsOf(node).setValidity = (...args: unknown[]) => {
      calls.push(args)
    }
    webForm.validity(node, ['rangeOverflow'], 'Choose 10 or less', anchor)
    webForm.validity(node, ['badInput'], 'Enter a number', null)
    webForm.validity(node, [], '', anchor)
    expect(calls).toEqual([
      [{ rangeOverflow: true }, 'Choose 10 or less', anchor],
      [{ badInput: true }, 'Enter a number', undefined],
      [{}],
    ])
  })
})

describe('webForm.submit', () => {
  test('submits the form of a control with no other text field and no button', async () => {
    const host = await mount(
      '<form><probe-capability-form-control></probe-capability-form-control></form>',
    )
    const count = submissions(host.closest('form') as HTMLFormElement)
    webForm.submit(host)
    expect(count()).toBe(1)
  })

  test('presses the form’s default button, as Enter in a text field does', async () => {
    const host = await mount(
      '<form><probe-capability-form-control></probe-capability-form-control><button type="submit">Send</button></form>',
    )
    submissions(host.closest('form') as HTMLFormElement)
    let pressed = 0
    document.querySelector('button')?.addEventListener('click', () => {
      pressed += 1
    })
    webForm.submit(host)
    expect(pressed).toBe(1)
  })

  test('submits nothing for a control in no form', async () => {
    const host = await mount('<probe-capability-form-control></probe-capability-form-control>')
    expect(() => webForm.submit(host)).not.toThrow()
  })
})
