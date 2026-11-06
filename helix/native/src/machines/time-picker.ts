/**
 * A list of the times of a day on a phone, or a set of wheels: a list drawn
 * from data and windowed, a choice that asks first, and the now press.
 *
 * **It holds its times, whoever set them**, and moves them through a request a
 * handler can refuse, as the web's does: `before-change`, then `input` and
 * `change`. Core's clock says which times are offered and barred, what a choice
 * and a turn of a wheel leave, and what is wrong with the times held, as it does
 * for the web's element. A missing time waits for the reader, and a refused one
 * is marked at once.
 */

import {
  clockLocale,
  commaList,
  dayPeriod,
  type HourCycle,
  halfBarred,
  hourBarred,
  isTwelveHour,
  nearestTime,
  offeredTimes,
  secondsAsValue,
  type TimeMode,
  timeBarred,
  timeBetween,
  timeChoice,
  timeProblem,
  valueAsSeconds,
  type WheelPart,
  wheelHours,
  wheelMinutes,
  wheelName,
  wheelSeconds,
  wheelsAt,
  wheelTurn,
  writeClock,
} from '@fusion.dev/helix-core/clock'
import { useEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { kebab, numberIn, useHeldWords, wordsIn } from './date-picker-read'
import { langOf, sayIn } from './picker-field-kind'
import { boundTo, given, type HelixEvent, tell } from './props'

/** What the picker reads of its props at one draw. */
interface Clock {
  readonly clock: string
  readonly disableTimes: string
  readonly lang: string
  readonly max: string
  readonly min: string
  readonly mode: TimeMode
  readonly seconds: boolean
  readonly times: readonly number[]
  readonly twelve: boolean
}

/** The list's rows, each written on the clock, barred where `disable-times` says. */
const optionsOf = (now: Clock, value: string) =>
  now.times.map((at) => {
    const one = secondsAsValue(at, now.seconds)
    const between = timeBetween(one, commaList(value), '', now.mode)
    return {
      disabled: timeBarred(at, now.disableTimes),
      label: writeClock(one, now.clock, now.seconds),
      ...(between ? { between } : {}),
      value: one,
    }
  })

/** A wheel: its part, its name, its rows, and the row it stands on. */
const column = (
  part: WheelPart,
  label: string,
  rows: readonly { readonly disabled: boolean; readonly label: string; readonly value: string }[],
  value: string,
) => ({ key: part, label, options: rows, part, value })

/** The wheels of one time, the hour, the minute, the second, and the half of the day. */
const columnsOf = (now: Clock, value: string, read: (name: string) => unknown) => {
  const { hour, meridiem, minute, second, shown } = wheelsAt(value, now.min, now.twelve)
  const named = (part: string, field: 'dayPeriod' | 'hour' | 'minute' | 'second') =>
    wordsIn(read(`${part}-label`)) || wheelName(field, now.lang)
  const barredAt = (at: number) => timeBarred(at, now.disableTimes)
  const pad = (one: number) => String(one).padStart(2, '0')
  const out = [
    column(
      'hour',
      named('hour', 'hour'),
      wheelHours(now.times, now.twelve).map((one) => ({
        disabled: hourBarred(now.times, one, now.disableTimes, now.twelve ? meridiem : undefined),
        label: now.twelve ? String(one) : pad(one),
        value: String(one),
      })),
      String(shown),
    ),
    column(
      'minute',
      named('minute', 'minute'),
      wheelMinutes(now.times, hour).map((one) => ({
        disabled: barredAt(hour * 3600 + one * 60),
        label: pad(one),
        value: String(one),
      })),
      String(minute),
    ),
  ]
  if (now.seconds) {
    out.push(
      column(
        'second',
        named('second', 'second'),
        wheelSeconds(now.times, hour, minute).map((one) => ({
          disabled: barredAt(hour * 3600 + minute * 60 + one),
          label: pad(one),
          value: String(one),
        })),
        String(second),
      ),
    )
  }
  if (now.twelve) {
    out.push(
      column(
        'meridiem',
        named('meridiem', 'dayPeriod'),
        (['AM', 'PM'] as const).map((half) => ({
          disabled: halfBarred(now.times, half, now.disableTimes),
          label: dayPeriod(half, now.clock),
          value: half,
        })),
        meridiem,
      ),
    )
  }
  return out
}

/** What the picker reads of its props. */
const clockOf = (read: (name: string) => unknown): Clock => {
  const lang = langOf(read)
  const hourCycle = wordsIn(read('hour-cycle')) as HourCycle | ''
  const clock = clockLocale(lang, hourCycle === '' ? undefined : hourCycle)
  const mode = wordsIn(read('mode'))
  const min = wordsIn(read('min')) || '00:00'
  const max = wordsIn(read('max')) || '23:59'
  const seconds = read('seconds') === true
  return {
    clock,
    disableTimes: wordsIn(read('disable-times')),
    lang,
    max,
    min,
    mode: mode === 'range' || mode === 'multiple' ? mode : undefined,
    seconds,
    times: offeredTimes(min, max, numberIn(read('step')) ?? 15, seconds),
    twelve: isTwelveHour(clock),
  }
}

/** Whether the picker is marked invalid: by the page, or by a fault, a missing time once touched. */
const markedOf = (
  read: (name: string) => unknown,
  now: Clock,
  value: string,
  touched: boolean,
): boolean => {
  if (read('invalid') === true || wordsIn(read('feedback')) !== '') {
    return true
  }
  const say = sayIn(read, now.lang)
  const found = timeProblem(
    { ...now, required: read('required') === true, value },
    {
      bad: () => '',
      missing: '',
      over: () => '',
      step: '',
      unavailable: say('unavailable-message'),
      under: () => '',
    },
  )
  return found !== undefined && (found[0] !== 'valueMissing' || touched)
}

/** What the ref of a list the picker draws holds, as the web's Listbox has `reveal()`. */
interface Revealing {
  readonly reveal?: () => void
}

/**
 * Brings the time held to the middle of the list, or of each wheel, as the web's
 * `reveal()` does: **the wheels on every change**, as a turn of the hour changes
 * the minutes the next wheel offers, and **the list once**, as it is first drawn,
 * since centering it on every choice would move the row from under the finger
 * that chose it. A list holding several, a range or a set, rests where it is.
 */
const useRevealed = (value: string, wheels: boolean, several: boolean) => {
  const lists = useRef(new Map<string, Revealing>()).current
  const refs = useRef(new Map<string, (handle: Revealing | null) => void>()).current
  /* What was last brought to rest: the wheels' time, or the list, once. */
  const shown = useRef<string | undefined>(undefined)
  const frame = useRef<number | undefined>(undefined)
  const resting = wheels ? `wheels ${value}` : 'list'
  useEffect(() => {
    if (several || shown.current === resting || lists.size === 0) {
      return
    }
    shown.current = resting
    /* A frame on, once each list has measured itself. Nothing cancels it: a draw
       before that frame that held nothing new canceled it, and so did React's
       second mount in development, and a list gone by then has left `lists`. */
    if (frame.current === undefined) {
      frame.current = requestAnimationFrame(() => {
        frame.current = undefined
        for (const list of lists.values()) {
          list.reveal?.()
        }
      })
    }
  }, [lists, resting, several])
  /* One ref for each list across draws, so React keeps it attached. */
  return (key: string) => {
    let ref = refs.get(key)
    if (ref === undefined) {
      ref = (handle) => {
        if (handle === null) {
          lists.delete(key)
        } else {
          lists.set(key, handle)
        }
      }
      refs.set(key, ref)
    }
    return ref
  }
}

/** Hosts a list of times, or a set of wheels. */
export const useTimePicker = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const now = clockOf(read)
  const [held, setValue] = useHeldWords(
    props.value,
    wordsIn(given(family, props, boundTo(use, 'defaultProp', 'prop'))),
  )
  const value = held ?? ''
  const [touched, setTouched] = useState(false)
  const disabled = read('disabled') === true
  const readonly = read('readonly') === true
  const wheels = wordsIn(read('picker')) === 'wheels' && now.mode === undefined
  const send = (name: string, detail: Readonly<Record<string, unknown>> = {}, at = value) => {
    const event = boundTo(use, name, 'event')
    return event === undefined || tell(family, props, event, detail, { value: at })
  }
  const request = (next: string | undefined): void => {
    if (next === undefined || next === value || disabled || readonly) {
      return
    }
    setTouched(true)
    if (!send('onBeforeChange', { value: next }, next)) {
      return
    }
    setValue(next)
    send('onInput', {}, next)
    send('onChange', {}, next)
  }
  const barred = (one: string) => {
    const at = valueAsSeconds(one)
    return at !== null && timeBarred(at, now.disableTimes)
  }
  const options = optionsOf(now, value)
  const columns = wheels ? columnsOf(now, value, read) : []
  const scroller = useRevealed(value, wheels, now.mode !== undefined)
  const turn = (part: WheelPart, to: string) => request(wheelTurn(part, to, { ...now, value }))
  const selectNow = () => {
    const clock = new Date()
    const at = clock.getHours() * 3600 + clock.getMinutes() * 60 + clock.getSeconds()
    const open = now.times.filter((one) => !timeBarred(one, now.disableTimes))
    if (open.length === 0) {
      return
    }
    const next = secondsAsValue(nearestTime(open, at), now.seconds)
    const list = commaList(value)
    if (now.mode === undefined) {
      request(next)
    } else if (!list.includes(next)) {
      request(timeChoice([...list, next].join(','), list, now.mode, barred))
    }
  }
  const listName =
    wordsIn(read('aria-label')) || wordsIn(read('label')) || wordsIn(read('fallback-label'))
  const refuse = (heard: HelixEvent<{ value?: string }>) => {
    heard.preventDefault()
    return String(heard.detail.value ?? '')
  }
  return {
    marks: [],
    parts: {
      column: {
        copy: (item: Entry) => ({
          onBeforeChange: (heard: HelixEvent<{ value?: string }>) =>
            turn(item.fields.part as WheelPart, refuse(heard)),
          ref: scroller(String(item.fields.key)),
          value: String(item.fields.value),
        }),
      },
      host: {
        lists: { [flag('columns')]: columns, [flag('options')]: options },
        states: {
          blank: value === '',
          invalid: markedOf(read, now, value, touched),
          'range-pending': now.mode === 'range' && commaList(value).length === 1,
          [flag('listName')]: listName,
          [flag('multiple')]: now.mode !== undefined,
          [flag('unset')]: value === '',
          [flag('wheels')]: wheels,
        },
        view: { accessibilityLabel: listName },
      },
      list: {
        view: {
          onBeforeChange: (heard: HelixEvent<{ value?: string }>) =>
            request(timeChoice(refuse(heard), commaList(value), now.mode, barred)),
          ref: scroller('list'),
          value,
        },
      },
      now: { view: { disabled: disabled || readonly, onPress: selectNow } },
    },
  }
}
