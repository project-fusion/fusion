/**
 * A field of dates or times with no element in it, for a platform that draws
 * one of its own: the text it holds, the segments it is set with, and what is
 * wrong with its values.
 */

export type { MonthSystem } from '../calendar/calendar.js'
export type { HourCycle } from '../clock/clock.js'
export * from '../date-segments/date-segments.js'
export * from '../date-segments/segment-rows.js'
export { latinDigits } from '../number-format/number-format.js'
export * from './date-text.js'
export * from './picker-text.js'
export * from './time-text.js'
