import {
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerValue,
} from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
/* Side-effect imports, because this renders these in its own shadow root and a
   custom element registers on import. The public tags rather than the base ones:
   a consumer on the styled tier gets the styled elements, and one on the
   headless tier brings their own under those names. */
import '../../listbox/index.js'
import '../../option/index.js'

/** Whether a string is a time the rest of this component can reason about. */
export const isTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/** Minutes since midnight, or `null` where it is not a time. */
export const toMinutes = (value: string): number | null => {
  if (!isTime(value)) {
    return null
  }
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** Minutes since midnight back to `HH:mm`, which is the value shape throughout. */
export const fromMinutes = (minutes: number): string => {
  const whole = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * A time written the way the reader's locale writes one.
 *
 * `Intl` decides between a twelve and a twenty-four hour clock, because that is
 * a property of the locale rather than of this component: `en-US` gets
 * `2:30 PM` and `en-GB` gets `14:30` without either being configured. There is
 * no flag to force one, deliberately. A product that needs to override its
 * reader's own convention has a locale problem rather than a component one, and
 * the value is 24 hour regardless.
 */
export const writeTime = (value: string, locale?: string): string => {
  const minutes = toMinutes(value)
  if (minutes === null) {
    return value
  }
  const at = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))
  /* `timeStyle` rather than `hour` and `minute` assembled by hand. Measured in
     Chrome: `hour: 'numeric'` gives `9:00` for `en-GB`, unpadded, which is not
     how a twenty-four hour clock is written, while `hour: '2-digit'` gives
     `09:00 AM` for `en-US`, which is not how a twelve hour one is. `short` is
     each locale's own answer: `09:00` and `9:00 AM`. */
  return new Intl.DateTimeFormat(locale || undefined, {
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(at)
}

/**
 * @summary Picks a time, from a list of them.
 *
 * @description
 * **A list rather than three spinners**, and the reason is what a list already
 * is. `helix-listbox` brings the keyboard, the typeahead, the scroll into view
 * and the announcement of a set of options, and a time at a step is a set of
 * options. Three little spinners for hours, minutes and a meridiem are three
 * controls to build, three to test, and a tab stop each for something a reader
 * answers once.
 *
 * **A step is what makes it a list at all.** Fifteen minutes is ninety-six rows,
 * which a reader scrolls or types into; one minute is one thousand four hundred
 * and forty, which is a listbox in name only. So the list is for the times a
 * product actually offers, and arbitrary times are the field's job in Input
 * Time, the same division Input Date draws between typing a date and using the
 * calendar.
 *
 * **The value is `HH:mm` on a twenty-four hour clock, always.** That is what a
 * form submits and what `min` and `max` compare against, and it sorts as a
 * string, which is the whole reason the shape is that one. What each row *says*
 * is the reader's own convention, from `Intl`.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TimePicker, TimeList
 * @documentation https://helix.fusion.dev/components/time
 *
 * @event {HelixChangeEvent} helix-change - Fired when the time changes.
 *
 * @csspart list - The listbox holding the times.
 * @csspart items - The scrolling column inside it, forwarded from the listbox.
 * @csspart empty - What it says when nothing matches, forwarded from the listbox.
 * @csspart option - One time in it.
 */
@customElement('helix-base-time')
export class HelixBaseTime extends MixinControllerValue(HelixFormElement) {
  /**
   * How far apart the offered times are, in minutes.
   *
   * Fifteen, which is four rows an hour and ninety-six in a day: enough that a
   * reader scrolls rather than hunts, and few enough that the list is a list.
   * Anything under five is a thousand rows and wants a field instead.
   */
  @property({ type: Number })
  step = 15

  /** Earliest time offered, as `HH:mm`. */
  @property()
  min = '00:00'

  /** Latest time offered, as `HH:mm`. */
  @property()
  max = '23:59'

  /** Language tag the times are written in. Absent uses the runtime's own. */
  @property()
  locale = ''

  /** Accessible name for the list, which has no visible one of its own. */
  @property()
  label = 'Time'

  /**
   * Every time on offer, as minutes since midnight.
   *
   * Built from `min` upward rather than from midnight, so a list that starts at
   * `09:00` steps from nine rather than offering `09:15` because that is where
   * the quarter hours from midnight happen to land. A step that does not divide
   * the hour is a real thing to want, twenty minutes being the obvious one, and
   * this is the reading that makes it behave.
   */
  private get times(): number[] {
    const from = toMinutes(this.min) ?? 0
    const to = toMinutes(this.max) ?? 1439
    const step = Math.max(1, Math.round(this.step))
    const found: number[] = []
    for (let at = from; at <= to; at += step) {
      found.push(at)
    }
    return found
  }

  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event as HelixChangeEvent).detail.value)
  }

  /** Puts the keyboard on the list, which is the only control here. */
  override focus(options?: FocusOptions): void {
    this.renderRoot?.querySelector<HTMLElement>('[part="list"]')?.focus(options)
  }

  protected override render(): TemplateResult {
    return html`<helix-listbox
      part="list"
      exportparts="items, empty"
      aria-label=${this.label}
      .value=${this.value}
      @helix-change=${this.handleChange}
    >
      ${this.times.map((minutes) => {
        const at = fromMinutes(minutes)
        return html`<helix-option part="option" value=${at}
          >${writeTime(at, this.locale)}</helix-option
        >`
      })}
    </helix-listbox>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-time': HelixBaseTime
  }
}
