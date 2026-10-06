import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* The mark and the message of a picker standing on its own as a form control,
   asked of the mixin rather than of Color, Date or Time Picker. */

type Probe = HTMLElement & {
  feedback: string
  internals: ElementInternals
  invalid: boolean
  updateComplete: Promise<boolean>
  validationMessage: string
  validity: ValidityState
}

const tag = 'probe-picker-feedback'

beforeAll(async () => {
  registerDom()
  const { html } = await import('lit')
  const { HelixFormElement } = await import('../../helix-form-element/helix-form-element.js')
  const { MixinPickerFeedback } = await import('./mixin-picker-feedback.js')
  customElements.define(
    tag,
    class extends MixinPickerFeedback(HelixFormElement) {
      protected override render() {
        return html`<button part="answer" aria-invalid=${this.marked ? 'true' : 'false'}></button>
          ${this.renderPickerFeedback()}`
      }
    },
  )
})

const mount = async (attrs = ''): Promise<Probe> => {
  document.body.innerHTML = `<form><${tag} name="pick" ${attrs}></${tag}></form>`
  const host = document.querySelector(tag) as Probe
  await host.updateComplete
  return host
}

describe('a picker’s feedback', () => {
  test('is a message under it, a verdict the form reads, and a mark on it', async () => {
    const host = await mount('feedback="Pick a weekday"')
    expect(host.shadowRoot?.querySelector('[part="feedback"]')?.textContent).toBe('Pick a weekday')
    expect(host.validity.customError).toBe(true)
    expect(host.validationMessage).toBe('Pick a weekday')
    expect(host.internals.ariaInvalid).toBe('true')
    expect(host.internals.states.has('invalid')).toBe(true)
    expect(host.shadowRoot?.querySelector('[part="answer"]')?.getAttribute('aria-invalid')).toBe(
      'true',
    )
    const described = (host.internals as ElementInternals & { ariaDescribedByElements?: Element[] })
      .ariaDescribedByElements
    if (described !== undefined) {
      expect(described?.[0]?.textContent).toBe('Pick a weekday')
    }
  })

  test('marks the picker as `invalid` does, and both go with it', async () => {
    const host = await mount('invalid')
    expect(host.shadowRoot?.querySelector('[part="feedback"]')).toBeNull()
    expect(host.validity.valid).toBe(true)
    expect(host.internals.states.has('invalid')).toBe(true)
    host.invalid = false
    await host.updateComplete
    expect(host.internals.ariaInvalid).toBeNull()
    expect(host.internals.states.has('invalid')).toBe(false)
  })
})
