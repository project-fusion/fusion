import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The protocol between a text field and the picker floating over it, asked of
 * the mixins rather than of a family that happens to take them.
 *
 * Three families take `MixinPickerField` and two of them `MixinPickerEditing`
 * on top, so a fault here is a fault three times over, and each family's own
 * spec covers only the path that family reaches. What is asked here is the
 * shared half: arriving from outside opens and a hand-off from inside does
 * not, Escape shuts the panel and hands the caret back, a read-only field
 * refuses, a refusal puts the control back, and the family's verdict reaches
 * the form as `badInput`.
 *
 * A real element with a real template, because the parts under test are the
 * ones the families render and the mixin reads: `field`, `control`, `trigger`
 * and `surface`. The template is the smallest one that has all four.
 */
type Probe = HTMLElement & {
  internals: ElementInternals
  message: string
  open: boolean
  panel: { open: boolean }
  readOnly: boolean
  requestValue(next: string): boolean
  updateComplete: Promise<boolean>
  value: string
}

const tag = 'probe-picker'
const plainTag = 'probe-picker-plain'

beforeAll(async () => {
  registerDom()
  /* After the DOM, like everything below: Lit reads `HTMLElement` off the
     global when it loads, and a static import would run before happy-dom had
     put one there. */
  const { html } = await import('lit')
  const { HelixFormElement } = await import('../../helix-form-element/helix-form-element.js')
  const { MixinControllerOpen } = await import('../mixin-controller-open/mixin-controller-open.js')
  const { MixinControllerValue } = await import(
    '../mixin-controller-value/mixin-controller-value.js'
  )
  const { MixinField } = await import('../mixin-field/mixin-field.js')
  const { MixinPickerEditing } = await import('../mixin-picker-editing/mixin-picker-editing.js')
  const { MixinPickerField } = await import('./mixin-picker-field.js')

  const Field = MixinPickerField(
    MixinControllerOpen(MixinControllerValue(MixinField(HelixFormElement))),
  )

  /* The Date Input shape: typed as well as picked, and read-only when asked. */
  customElements.define(
    tag,
    class extends MixinPickerEditing(Field) {
      /** What `validate` answers, set by a test. */
      message = ''

      /* Written out while idle, so a test can see which of the two the field
         holds without a formatter: the value in brackets. */
      protected override get display(): string {
        return this.editing ? this.value : `[${this.value}]`
      }

      protected override validate(): string {
        return this.message
      }

      /* Typing, the way every family wires it: announce, then put the control
         back wherever the answer did not follow it. */
      private readonly handleInput = (event: Event): void => {
        this.requestValue((event.target as HTMLInputElement).value)
        this.restore()
      }

      protected override render() {
        return html`<div part="field" @keydown=${this.handleKeydown}>
            <input part="control" id="control" .value=${this.display}
              @blur=${this.handleBlur} @focus=${this.handleFocus} @input=${this.handleInput} />
            <button part="trigger" type="button" @click=${() => this.toggleOpen()}></button>
          </div>
          <div part="surface" popover="manual" ?hidden=${!this.open}></div>`
      }
    },
  )

  /* The Color Input shape: the field alone, showing the value as it is. */
  customElements.define(
    plainTag,
    class extends Field {
      protected override render() {
        return html`<div part="field" @keydown=${this.handleKeydown}>
            <input part="control" id="control" .value=${this.display} />
            <button part="trigger" type="button"></button>
          </div>
          <div part="surface" popover="manual" ?hidden=${!this.open}></div>`
      }
    },
  )
})

const mount = async (attrs = '', name = tag): Promise<Probe> => {
  document.body.innerHTML = `<${name} ${attrs}></${name}>`
  const host = document.body.firstElementChild as Probe
  await host.updateComplete
  return host
}

const control = (host: Probe): HTMLInputElement =>
  host.shadowRoot?.querySelector('[part="control"]') as HTMLInputElement

const trigger = (host: Probe): HTMLElement =>
  host.shadowRoot?.querySelector('[part="trigger"]') as HTMLElement

const focus = (host: Probe, from: EventTarget | null): void => {
  control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: from }))
}

describe('arriving at the field', () => {
  test('from outside opens the picker', async () => {
    const host = await mount()
    focus(host, null)
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  /* Picking shuts the panel and puts the caret back in the field, so a hand-off
     from inside must not reopen it: opening on any focus at all brings the
     picker straight back and the reader cannot get out. */
  test('but a hand-off from inside the element does not', async () => {
    const host = await mount()
    focus(host, trigger(host))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('and a disabled field stays shut', async () => {
    const host = await mount('disabled')
    focus(host, null)
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('puts the value in the field, and leaving writes it out again', async () => {
    const host = await mount('default-value="v"')
    expect(control(host).value).toBe('[v]')
    focus(host, null)
    await host.updateComplete
    expect(control(host).value).toBe('v')
    control(host).dispatchEvent(new FocusEvent('blur'))
    await host.updateComplete
    expect(control(host).value).toBe('[v]')
  })
})

describe('the panel', () => {
  test('follows `open`, whoever set it', async () => {
    const host = await mount()
    expect(host.panel.open).toBe(false)
    host.open = true
    await host.updateComplete
    expect(host.panel.open).toBe(true)
    host.open = false
    await host.updateComplete
    expect(host.panel.open).toBe(false)
  })

  test('shuts on Escape, and the key goes no further', async () => {
    const host = await mount()
    host.open = true
    await host.updateComplete
    let escaped = 0
    const heard = (): void => {
      escaped += 1
    }
    document.addEventListener('keydown', heard)
    control(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Escape' }),
    )
    document.removeEventListener('keydown', heard)
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(escaped).toBe(0)
  })

  /* The hand-off is the whole difficulty: the caret goes back to a field that
     opens on arrival, so without `returning` the panel Escape just shut would
     come straight back, and the field would take the shape it has for typing.
     happy-dom dispatches `focus` from `focus()` the way a focused browser does,
     which is what makes this askable here. */
  test('and hands the caret back without reopening', async () => {
    const host = await mount('default-value="v"')
    host.open = true
    await host.updateComplete
    control(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Escape' }),
    )
    await host.updateComplete
    expect(host.shadowRoot?.activeElement).toBe(control(host))
    expect(host.open).toBe(false)
    expect(control(host).value).toBe('[v]')
  })

  /* Shut already, Escape is somebody else's: an overlay holding this field
     should hear it. */
  test('and leaves Escape alone while it is shut', async () => {
    const host = await mount()
    let escaped = 0
    const heard = (): void => {
      escaped += 1
    }
    document.addEventListener('keydown', heard)
    control(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Escape' }),
    )
    document.removeEventListener('keydown', heard)
    expect(escaped).toBe(1)
  })
})

describe('a read-only field', () => {
  test('refuses every request, and announces nothing', async () => {
    const host = await mount('default-value="v" readonly')
    let asked = 0
    host.addEventListener('helix-before-change', () => {
      asked += 1
    })
    expect(host.requestValue('w')).toBe(false)
    await host.updateComplete
    expect(host.value).toBe('v')
    expect(asked).toBe(0)
  })

  test('still submits what it holds', async () => {
    const host = await mount('default-value="v" readonly')
    expect(host.readOnly).toBe(true)
    expect(host.value).toBe('v')
  })

  test('and is reachable from markup as the platform spells it', async () => {
    const host = await mount('readonly')
    expect(host.hasAttribute('readonly')).toBe(true)
    expect(host.readOnly).toBe(true)
  })
})

describe('a refusal', () => {
  /* The native control has already changed by the time anybody is asked, so
     what is on screen and what the form would submit disagree until something
     puts the control back. */
  test('puts the control back to what the field still holds', async () => {
    const host = await mount('default-value="v"')
    host.addEventListener('helix-before-change', (event) => {
      event.preventDefault()
    })
    const field = control(host)
    field.value = 'w'
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.value).toBe('v')
    expect(field.value).toBe('[v]')
  })

  test('and an accepted change moves the value and renders it', async () => {
    const host = await mount('default-value="v"')
    const field = control(host)
    field.value = 'w'
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.value).toBe('w')
    expect(field.value).toBe('[w]')
  })
})

describe('what the form is told', () => {
  test('the value, whatever the markup arrived with', async () => {
    const host = await mount('default-value="v"')
    expect(host.internals.validity.valid).toBe(true)
  })

  /* The control is `type="text"` and cannot know what a date or a color is, so
     the family's verdict is reported as `badInput` against the control. */
  test('the family’s verdict, as bad input', async () => {
    const host = await mount('default-value="v"')
    host.message = 'Not a thing.'
    host.requestValue('w')
    await host.updateComplete
    expect(host.internals.validity.badInput).toBe(true)
    expect(host.internals.validationMessage).toBe('Not a thing.')
  })

  test('and the platform’s once the family has nothing to say', async () => {
    const host = await mount('default-value="v"')
    host.message = 'Not a thing.'
    host.requestValue('w')
    await host.updateComplete
    host.message = ''
    host.requestValue('x')
    await host.updateComplete
    expect(host.internals.validity.valid).toBe(true)
    expect(host.internals.validationMessage).toBe('')
  })
})

describe('the field alone, without the editing half', () => {
  test('shows the value as it is', async () => {
    const host = await mount('default-value="#ff0000"', plainTag)
    expect(control(host).value).toBe('#ff0000')
  })

  test('has no `readOnly`, because that is the editing half’s to add', async () => {
    const host = await mount('readonly', plainTag)
    expect(host.readOnly).toBeUndefined()
    expect(host.requestValue('w')).toBe(true)
  })

  test('and still shuts on Escape', async () => {
    const host = await mount('', plainTag)
    host.open = true
    await host.updateComplete
    control(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Escape' }),
    )
    await host.updateComplete
    expect(host.open).toBe(false)
  })
})
