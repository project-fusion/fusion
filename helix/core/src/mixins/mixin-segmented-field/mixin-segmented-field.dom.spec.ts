import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * A row of segments for a date or a time, asked of the mixin rather than of
 * Date Input or Time Input, which both take it.
 *
 * A real element with the smallest template a picker field has, `field`,
 * the segments or the text, `trigger` and `surface`, and a `kind` attribute a
 * test sets to make it a date or a time.
 */
type Probe = HTMLElement & {
  open: boolean
  segmented: boolean
  updateComplete: Promise<boolean>
  validity: ValidityState
  validationMessage: string
  value: string
}

const tag = 'probe-segmented'

beforeAll(async () => {
  registerDom()
  const { html, nothing } = await import('lit')
  const { HelixFormElement } = await import('../../helix-form-element/helix-form-element.js')
  const { MixinControllerOpen } = await import('../mixin-controller-open/mixin-controller-open.js')
  const { MixinControllerValue } = await import(
    '../mixin-controller-value/mixin-controller-value.js'
  )
  const { MixinField } = await import('../mixin-field/mixin-field.js')
  const { MixinPickerField } = await import('../mixin-picker-field/mixin-picker-field.js')
  const { MixinSegmentedField } = await import('./mixin-segmented-field.js')

  customElements.define(
    tag,
    class extends MixinSegmentedField(
      MixinPickerField(MixinControllerOpen(MixinControllerValue(MixinField(HelixFormElement)))),
    ) {
      /* Typed, as both families are: a key is `input`, and leaving is `change`. */
      protected override readonly announcesInput = true

      protected override get segmentedKind(): 'date' | 'time' {
        return this.getAttribute('kind') === 'time' ? 'time' : 'date'
      }

      protected override get segmentLocale(): string {
        return this.getAttribute('locale') ?? 'en-US'
      }

      protected override get segmentOptions(): { seconds: boolean } {
        return { seconds: this.hasAttribute('seconds') }
      }

      protected override render() {
        return html`<div part="field" @keydown=${this.handleKeydown}>
            ${this.segmentsShown ? this.renderSegments() : html`<input part="control" id="control" .value=${this.value} />`}
            <button part="trigger" type="button" @click=${this.handleTriggerClick}></button>
          </div>
          <div part="surface" popover="manual" ?hidden=${!this.open}>
            <button id="inside" type="button">Day</button>
          </div>
          ${nothing}`
      }
    },
  )
})

const mount = async (attrs = ''): Promise<Probe> => {
  document.body.innerHTML = `<form><${tag} name="when" label="When" segmented ${attrs}></${tag}></form>`
  const host = document.querySelector(tag) as Probe
  await host.updateComplete
  return host
}

const segments = (host: Probe): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="segment"]') ?? []),
]

const segment = (host: Probe, kind: string): HTMLElement =>
  host.shadowRoot?.querySelector(`[data-segment="${kind}"]`) as HTMLElement

const key = async (host: Probe, at: HTMLElement, name: string, init: KeyboardEventInit = {}) => {
  at.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: name,
      ...init,
    }),
  )
  await host.updateComplete
}

describe('a row of segments', () => {
  test('is drawn in the order the locale writes a date, as spinbuttons in a named group', async () => {
    const host = await mount('value="2026-08-04"')
    const group = host.shadowRoot?.querySelector('[part="segments"]') as HTMLElement
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('aria-labelledby')).toBe('label')
    expect(segments(host).map((one) => one.dataset.segment)).toEqual(['month', 'day', 'year'])
    expect(segments(host).map((one) => one.textContent?.trim())).toEqual(['08', '04', '2026'])
    const month = segment(host, 'month')
    expect(month.getAttribute('role')).toBe('spinbutton')
    expect(month.getAttribute('aria-valuenow')).toBe('8')
    expect(month.getAttribute('aria-valuetext')).toBe('8 – August')
    expect(month.getAttribute('aria-valuemin')).toBe('1')
    expect(month.getAttribute('aria-valuemax')).toBe('12')
    expect(host.shadowRoot?.querySelector('[part="literal"]')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    expect(host.shadowRoot?.querySelector('[part="control"]')).toBeNull()
  })

  /* React Aria's answer to VoiceOver on iOS, which cannot focus a spin
     button. Measured before this: a spinbutton there too. */
  test('is a row of text boxes with no value range on an iPhone or an iPad', async () => {
    const agent = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    })
    try {
      const host = await mount('value="2026-08-04"')
      const month = segment(host, 'month')
      expect(month.getAttribute('role')).toBe('textbox')
      expect(month.hasAttribute('aria-valuenow')).toBe(false)
      expect(month.hasAttribute('aria-valuetext')).toBe(false)
      expect(month.getAttribute('inputmode')).toBe('numeric')
    } finally {
      if (agent) {
        Object.defineProperty(navigator, 'userAgent', agent)
      } else {
        delete (navigator as unknown as Record<string, unknown>).userAgent
      }
    }
  })

  /* A group's `aria-invalid` is announced as focus moves inside it by no
     screen reader; React Aria marks each segment. */
  test('marks each segment invalid while the field shows an error', async () => {
    const host = await mount('value="2026-08-04" feedback="Pick a weekday"')
    expect(segments(host).every((one) => one.getAttribute('aria-invalid') === 'true')).toBe(true)
    const fine = await mount('value="2026-08-04"')
    expect(segments(fine).some((one) => one.hasAttribute('aria-invalid'))).toBe(false)
  })

  test('follows the locale, German writing the day first', async () => {
    const host = await mount('value="2026-08-04" locale="de-DE"')
    expect(segments(host).map((one) => one.dataset.segment)).toEqual(['day', 'month', 'year'])
    expect(segment(host, 'month').getAttribute('aria-label')).toBe('Monat,')
  })

  test('names each segment with the field label after its own, and offers Next', async () => {
    const host = await mount('value="2026-08-04"')
    const month = segment(host, 'month')
    expect(month.getAttribute('aria-label')).toBe('month,')
    expect(month.getAttribute('aria-labelledby')).toBe(`${month.id} label`)
    expect(month.getAttribute('enterkeyhint')).toBe('next')
    host.setAttribute('disabled', '')
    await host.updateComplete
    expect(month.hasAttribute('enterkeyhint')).toBe(false)
  })

  test('names a segment by its own name where the field has no label', async () => {
    document.body.innerHTML = `<${tag} segmented value="2026-08-04"></${tag}>`
    const host = document.querySelector(tag) as Probe
    await host.updateComplete
    expect(segment(host, 'month').getAttribute('aria-label')).toBe('month')
    expect(segment(host, 'month').hasAttribute('aria-labelledby')).toBe(false)
  })

  test('is the text field without `segmented`', async () => {
    const host = await mount('value="2026-08-04"')
    host.segmented = false
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('[part="control"]')).not.toBeNull()
    expect(segments(host)).toHaveLength(0)
  })

  test('says an empty segment in words a screen reader can carry, and shows dashes', async () => {
    const host = await mount('empty-segment-label="Leer"')
    expect(segment(host, 'year').textContent?.trim()).toBe('––––')
    expect(segment(host, 'year').getAttribute('aria-valuetext')).toBe('Leer')
    expect(segment(host, 'year').getAttribute('part')?.split(' ')).toContain('segment-placeholder')
  })
})

describe('a key in a segment', () => {
  test('Up and Down step it and wrap, and the value follows', async () => {
    const host = await mount('value="2026-12-04"')
    let inputs = 0
    host.addEventListener('input', () => inputs++)
    await key(host, segment(host, 'month'), 'ArrowUp')
    expect(host.value).toBe('2026-01-04')
    await key(host, segment(host, 'month'), 'ArrowDown')
    expect(host.value).toBe('2026-12-04')
    expect(inputs).toBe(2)
  })

  test('digits fill it and move on once it can take no more', async () => {
    const host = await mount('value="2026-08-04"')
    const month = segment(host, 'month')
    month.focus()
    await key(host, month, '1')
    expect(host.shadowRoot?.activeElement).toBe(month)
    await key(host, month, '2')
    expect(host.value).toBe('2026-12-04')
    expect(host.shadowRoot?.activeElement).toBe(segment(host, 'day'))
  })

  test('Home and End go to its ends, and a day stays inside its month', async () => {
    const host = await mount('value="2026-02-10"')
    await key(host, segment(host, 'day'), 'End')
    expect(host.value).toBe('2026-02-28')
    await key(host, segment(host, 'day'), 'Home')
    expect(host.value).toBe('2026-02-01')
  })

  test('Backspace empties it, so the value is empty and the field reports a half-typed date', async () => {
    const host = await mount('value="2026-08-04"')
    await key(host, segment(host, 'day'), 'Backspace')
    expect(host.value).toBe('')
    expect(segment(host, 'day').textContent?.trim()).toBe('––')
    expect(segment(host, 'month').textContent?.trim()).toBe('08')
    expect(host.validity.badInput).toBe(true)
    expect(host.validationMessage).toBe('Enter a whole date.')
    await key(host, segment(host, 'day'), '9')
    expect(host.value).toBe('2026-08-09')
    expect(host.validity.valid).toBe(true)
  })

  test('Left and Right move between segments', async () => {
    const host = await mount('value="2026-08-04"')
    const month = segment(host, 'month')
    month.focus()
    await key(host, month, 'ArrowRight')
    expect(host.shadowRoot?.activeElement).toBe(segment(host, 'day'))
    await key(host, segment(host, 'day'), 'ArrowLeft')
    expect(host.shadowRoot?.activeElement).toBe(month)
  })

  test('Alt+Down opens the picker, and Tab passes it by', async () => {
    const host = await mount('value="2026-08-04"')
    await key(host, segment(host, 'month'), 'ArrowDown', { altKey: true })
    expect(host.open).toBe(true)
    expect(host.value).toBe('2026-08-04')
    await key(host, segment(host, 'month'), 'Tab')
    expect(host.open).toBe(false)
  })

  test('changes nothing in a disabled field', async () => {
    const host = await mount('value="2026-08-04" disabled')
    await key(host, segment(host, 'month'), 'ArrowUp')
    expect(host.value).toBe('2026-08-04')
    expect(segment(host, 'month').getAttribute('tabindex')).toBe('-1')
  })
})

describe('a time', () => {
  test('on a twelve hour clock, keeps its half of the day and takes a letter for it', async () => {
    const host = await mount('kind="time" value="14:30"')
    expect(segments(host).map((one) => one.dataset.segment)).toEqual([
      'hour',
      'minute',
      'dayPeriod',
    ])
    expect(segment(host, 'hour').textContent?.trim()).toBe('2')
    expect(segment(host, 'dayPeriod').textContent?.trim()).toBe('PM')
    await key(host, segment(host, 'dayPeriod'), 'a')
    expect(host.value).toBe('02:30')
    await key(host, segment(host, 'hour'), 'ArrowUp')
    expect(host.value).toBe('03:30')
  })

  test('carries its seconds where asked', async () => {
    const host = await mount('kind="time" locale="en-GB" seconds value="09:05:07"')
    expect(segments(host).map((one) => one.dataset.segment)).toEqual(['hour', 'minute', 'second'])
    await key(host, segment(host, 'second'), 'ArrowUp')
    expect(host.value).toBe('09:05:08')
  })
})

describe('the value from elsewhere', () => {
  test('is what the segments show', async () => {
    const host = await mount('value="2026-08-04"')
    host.value = '2027-01-15'
    await host.updateComplete
    expect(segments(host).map((one) => one.textContent?.trim())).toEqual(['01', '15', '2027'])
  })

  test('a reset empties a half-typed date', async () => {
    const host = await mount()
    await key(host, segment(host, 'month'), '3')
    expect(segment(host, 'month').textContent?.trim()).toBe('03')
    ;(host as unknown as { formResetCallback(): void }).formResetCallback()
    await host.updateComplete
    expect(segment(host, 'month').textContent?.trim()).toBe('––')
    expect(host.validity.valid).toBe(true)
  })

  test('a required field with nothing in it is missing its value', async () => {
    const host = await mount('required')
    expect(host.validity.valueMissing).toBe(true)
  })
})

describe('change', () => {
  test('is said once, as focus leaves the segments with a new value', async () => {
    const host = await mount('value="2026-08-04"')
    let changes = 0
    host.addEventListener('change', () => changes++)
    const month = segment(host, 'month')
    month.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    await key(host, month, 'ArrowUp')
    month.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        composed: true,
        relatedTarget: segment(host, 'day'),
      }),
    )
    expect(changes).toBe(0)
    segment(host, 'day').dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: document.body }),
    )
    expect(changes).toBe(1)
  })
})
