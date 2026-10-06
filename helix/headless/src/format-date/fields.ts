import { html, type TemplateResult } from 'lit'

/**
 * Each date field `Intl` names, drawn as a part of its own.
 *
 * Keyed by the `type` of `Intl.DateTimeFormat#formatToParts`. Written out one
 * template to a field rather than bound through one `part` binding, because a
 * part is read from the source as a literal: a bound name is a part no
 * stylesheet check can find. A type left out, the punctuation between the
 * fields among them, is drawn as plain text.
 */
export const FIELD: Record<string, (value: string) => TemplateResult> = {
  day: (value) => html`<span part="day">${value}</span>`,
  dayPeriod: (value) => html`<span part="day-period">${value}</span>`,
  era: (value) => html`<span part="era">${value}</span>`,
  hour: (value) => html`<span part="hour">${value}</span>`,
  minute: (value) => html`<span part="minute">${value}</span>`,
  month: (value) => html`<span part="month">${value}</span>`,
  second: (value) => html`<span part="second">${value}</span>`,
  timeZoneName: (value) => html`<span part="time-zone-name">${value}</span>`,
  weekday: (value) => html`<span part="weekday">${value}</span>`,
  year: (value) => html`<span part="year">${value}</span>`,
}

/**
 * A formatted date, each field in a part of its own and the text between them
 * as it is.
 *
 * The words are the ones `format` would give, in the same order, so the reading
 * a screen reader hears and the text a reader copies do not change: an inline
 * span with no style of its own changes nothing on the page either.
 */
export const drawFields = (parts: readonly Intl.DateTimeFormatPart[]): unknown[] =>
  parts.map(({ type, value }) => FIELD[type]?.(value) ?? value)
