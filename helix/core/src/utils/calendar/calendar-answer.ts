/**
 * What a calendar's chosen dates say and what is wrong with them, with no
 * element in them, for Date Picker on the web and on a phone.
 */
import { valueAsDate as asDate } from '../value-as/value-as.js'
import { barredBy } from './calendar.js'
import { type DateMode, type DateRules, dateRange, rangePending } from './calendar-grid.js'

/** What the words for the chosen dates say: one date, a waiting range, a range, or several. */
export const selectionKind = (
  mode: DateMode,
  selected: readonly string[],
): 'date' | 'dates' | 'range' | 'start' => {
  if (dateRange(mode, selected)) {
    return 'range'
  }
  if (rangePending(mode, selected)) {
    return 'start'
  }
  return mode === 'multiple' ? 'dates' : 'date'
}

/** A validity flag, the message prop that words it, and what the message fills in. */
export type DateProblem = readonly [
  flag: 'badInput' | 'rangeOverflow' | 'rangeUnderflow' | 'stepMismatch' | 'valueMissing',
  message:
    | 'badInputMessage'
    | 'rangeOrderMessage'
    | 'rangeOverflowMessage'
    | 'rangeUnderflowMessage'
    | 'stepMismatchMessage'
    | 'unavailableMessage'
    | 'valueMissingMessage',
  values: Readonly<Record<string, string>>,
]

/** What a calendar's answer is checked against. */
export interface DateAnswer {
  mode: DateMode
  required: boolean
  rules: DateRules
  selected: readonly string[]
}

/** What is wrong with one date the calendar can read, or nothing. */
const dateFault = (iso: string, rules: DateRules): DateProblem | undefined => {
  if (rules.min !== '' && iso < rules.min) {
    return ['rangeUnderflow', 'rangeUnderflowMessage', { min: rules.min }]
  }
  if (rules.max !== '' && iso > rules.max) {
    return ['rangeOverflow', 'rangeOverflowMessage', { max: rules.max }]
  }
  const date = asDate(iso)
  const why = date ? barredBy(date, rules) : null
  if (why === null) {
    return undefined
  }
  return why === 'listed'
    ? ['badInput', 'unavailableMessage', {}]
    : ['stepMismatch', 'stepMismatchMessage', {}]
}

/**
 * What is wrong with the dates chosen, or nothing: none where one is required,
 * one the calendar cannot read, one outside the bounds or barred, or a range
 * set from outside that ends before it starts. Dates in `values` are `YYYY-MM-DD`,
 * for the caller to write in its locale.
 */
export const dateProblem = ({
  mode,
  required,
  rules,
  selected,
}: DateAnswer): DateProblem | undefined => {
  if (required && selected.length === 0) {
    return ['valueMissing', 'valueMissingMessage', {}]
  }
  if (selected.some((one) => asDate(one) === null)) {
    return ['badInput', 'badInputMessage', { mode: mode ?? 'single' }]
  }
  for (const one of selected) {
    const fault = dateFault(one, rules)
    if (fault) {
      return fault
    }
  }
  const [start, end] = selected
  if (mode === 'range' && start !== undefined && end !== undefined && end < start) {
    return ['rangeUnderflow', 'rangeOrderMessage', { start }]
  }
  return undefined
}
