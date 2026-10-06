import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { TemplateResult } from 'lit'

/**
 * What every form control inherits from its base: the validity API, where
 * focus goes, and the fieldset that disabled it. Implicit submission is
 * `utils/implicit-submit`'s.
 *
 * **The test double's `checkValidity` always answers true**, so what is
 * asserted here is the verdict the control hands the platform, read back
 * through `validity` and `validationMessage`, which the double records.
 */
type Probe = HTMLElement & {
  checkValidity(): boolean
  disabled: boolean
  feedback: string
  internals: ElementInternals
  isDisabled: boolean
  setCustomValidity(message: string): void
  updateComplete: Promise<boolean>
  validationAnchor(anchor?: HTMLElement): HTMLElement | undefined
  validationMessage: string
  validity: ValidityState
  requestUpdate(...args: unknown[]): void
  willValidate: boolean
}

beforeAll(async () => {
  registerDom()
  /* Lit too, after the double: its templates are built with whichever
     `document` it found when it loaded. */
  const { html } = await import('lit')
  const { HelixFormElement } = await import('./helix-form-element.js')
  const { MixinField } = await import('../mixins/mixin-field/mixin-field.js')
  customElements.define(
    'probe-form-control',
    class extends HelixFormElement {
      protected override get blocksImplicitSubmission(): boolean {
        return true
      }

      protected override render(): TemplateResult {
        return html`<span part="frame"><button tabindex="-1">-</button><input part="control" /></span>`
      }
    },
  )
  customElements.define(
    'probe-form-field',
    class extends MixinField(HelixFormElement) {
      protected override render(): TemplateResult {
        return html`<input part="control" />`
      }
    },
  )
})

const mount = async (markup: string, selector = 'probe-form-control'): Promise<Probe> => {
  document.body.innerHTML = markup
  const host = document.querySelector(selector) as Probe
  await host.updateComplete
  return host
}

describe('the validity API on the host', () => {
  test('reads the platform’s verdict, as a native control does', async () => {
    const host = await mount('<probe-form-control></probe-form-control>')
    expect(host.validity.valid).toBe(true)
    expect(host.validationMessage).toBe('')
    expect(host.willValidate).toBe(true)
    expect(typeof host.checkValidity()).toBe('boolean')
  })

  test('setCustomValidity marks it invalid with the words it was given', async () => {
    const host = await mount('<probe-form-control></probe-form-control>')
    host.setCustomValidity('That name is taken.')
    expect(host.validity.valid).toBe(false)
    expect(host.validity.customError).toBe(true)
    expect(host.validationMessage).toBe('That name is taken.')
  })

  /* The control reports its own verdict on every update, and the platform keeps
     one verdict per element, so a custom message the next report replaced would
     last until the reader typed one character. */
  test('and the control’s next report keeps it, beside its own flags', async () => {
    const host = await mount('<probe-form-control></probe-form-control>')
    host.setCustomValidity('That name is taken.')
    host.internals.setValidity({ valueMissing: true }, 'Fill this in.')
    expect(host.validity.customError).toBe(true)
    expect(host.validity.valueMissing).toBe(true)
    expect(host.validationMessage).toBe('That name is taken.')
  })

  test('an empty message clears it and the control’s own verdict stands', async () => {
    const host = await mount('<probe-form-control></probe-form-control>')
    host.internals.setValidity({ valueMissing: true }, 'Fill this in.')
    host.setCustomValidity('That name is taken.')
    host.setCustomValidity('')
    expect(host.validity.customError).toBeFalsy()
    expect(host.validationMessage).toBe('Fill this in.')
  })
})

describe('feedback on a field', () => {
  /* A field showing what is wrong in red that still submits is a form that
     says one thing and does another. */
  test('marks it invalid, so the form does not submit', async () => {
    const host = await mount(
      '<probe-form-field feedback="That name is taken."></probe-form-field>',
      'probe-form-field',
    )
    expect(host.validity.customError).toBe(true)
    expect(host.validationMessage).toBe('That name is taken.')
  })

  test('and clearing it lets the form submit again', async () => {
    const host = await mount(
      '<probe-form-field feedback="That name is taken."></probe-form-field>',
      'probe-form-field',
    )
    host.feedback = ''
    await host.updateComplete
    expect(host.validity.valid).toBe(true)
  })
})

describe('where the browser points its bubble', () => {
  test('the anchor the control gave, where focus can go', async () => {
    const host = await mount('<probe-form-control></probe-form-control>')
    const input = host.shadowRoot?.querySelector('input') as HTMLInputElement
    expect(host.validationAnchor(input)).toBe(input)
  })

  /* A group anchors on the part that holds its members, which takes no focus,
     and the platform then blocks the submission with nothing focused. */
  test('and the first tab stop where it cannot', async () => {
    const host = await mount('<probe-form-control></probe-form-control>')
    const frame = host.shadowRoot?.querySelector('[part="frame"]') as HTMLElement
    expect(host.validationAnchor(frame)).toBe(host.shadowRoot?.querySelector('input') ?? undefined)
  })
})

describe('focusing the host', () => {
  /* The first focusable element is a stepper the reader never tabs to, which
     is where `delegatesFocus` sends focus. */
  test('lands on the first tab stop', async () => {
    const host = await mount('<probe-form-control></probe-form-control>')
    host.focus()
    expect(host.shadowRoot?.activeElement).toBe(host.shadowRoot?.querySelector('input') ?? null)
  })
})

describe('a fieldset that disabled the control', () => {
  /* The platform reports the effective state, and removing the control's own
     `disabled` inside a disabled fieldset does not change it, so no callback
     says the fieldset still holds it. */
  test('still holds it once its own disabled is removed', async () => {
    const host = await mount(
      '<fieldset disabled><probe-form-control disabled></probe-form-control></fieldset>',
    )
    host.disabled = false
    await host.updateComplete
    expect(host.isDisabled).toBe(true)
  })

  test('and lets go of a control outside one', async () => {
    const host = await mount('<probe-form-control disabled></probe-form-control>')
    host.disabled = false
    await host.updateComplete
    expect(host.isDisabled).toBe(false)
  })
})

describe('a label that arrives after the control', () => {
  /* A framework renders the `<label for>` after the field, and the platform
     tells the host nothing, so the control inside stayed unnamed until it
     took focus. An update is what lets AriaForwardController name it. */
  test('asks the control to update, so the label can name what is inside it', async () => {
    const host = await mount('<probe-form-control id="late"></probe-form-control>')
    let asked = 0
    const original = host.requestUpdate.bind(host)
    host.requestUpdate = (...args: Parameters<typeof original>) => {
      asked += 1
      return original(...args)
    }
    document.body.insertAdjacentHTML('afterbegin', '<label for="late">Email</label>')
    await new Promise((done) => setTimeout(done, 0))
    expect(asked).toBeGreaterThan(0)
    host.remove()
  })
})
