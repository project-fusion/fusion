import { boolean, headless, number, oneOf, string, Text, time, View, web } from '../../../render.js'
import { clock, derive } from '../../../tree.js'

/**
 * Format Date's headless tier: a timestamp, formatted for the reader's
 * locale.
 *
 * **The words are core's**, from `Intl` with every option asked for and
 * none that was not, so the web and a phone write the same date. A day with
 * no time is read in UTC unless `time-zone` names a zone.
 *
 * **`elapsed` and `relative` read how long ago**, and the element keeps a
 * clock on the time of day that ticks as the words go stale: once a minute
 * for a reading minutes old, and never for a date or while `frozen`. A
 * reading is named in full, "3 hours ago" for "3h", with the whole date as
 * its description, and the element is `past` or `future` by which side of
 * now it reads.
 *
 * **The web's**: `fields`, which draws each field in a part of its own for
 * `::part()`, the light DOM's text as the date, and the `datetime` the
 * `<time>` carries for copying and scripts.
 */
export default headless('format-date', {
  props: {
    calendar: string(),
    date: time(''),
    dateStyle: oneOf(['full', 'long', 'medium', 'short']),
    day: oneOf(['numeric', '2-digit']),
    dayPeriod: oneOf(['long', 'narrow', 'short']),
    elapsed: false,
    era: oneOf(['long', 'narrow', 'short']),
    fields: web(boolean()),
    fractionalSecondDigits: number(),
    frozen: false,
    hour: oneOf(['numeric', '2-digit']),
    hourCycle: oneOf(['h11', 'h12', 'h23', 'h24']),
    locale: '',
    minute: oneOf(['numeric', '2-digit']),
    month: oneOf(['numeric', '2-digit', 'long', 'narrow', 'short']),
    numeric: oneOf(['always', 'auto']),
    relative: oneOf(['long', 'narrow', 'short']),
    second: oneOf(['numeric', '2-digit']),
    timeStyle: oneOf(['full', 'long', 'medium', 'short']),
    timeZone: string(),
    timeZoneName: oneOf([
      'long',
      'longGeneric',
      'longOffset',
      'short',
      'shortGeneric',
      'shortOffset',
    ]),
    weekday: oneOf(['long', 'narrow', 'short']),
    year: oneOf(['numeric', '2-digit']),
  },
  events: {},
  states: ['future', 'past', 'settled'],
  derived: {
    future: derive('format-date-future'),
    past: derive('format-date-past'),
    shown: derive('format-date-shown'),
    spoken: derive('format-date-spoken'),
    whole: derive('format-date-whole'),
  },
  clock: clock({
    expires: 'format-date-expires',
    restarts: ['date', 'elapsed', 'frozen', 'locale', 'numeric', 'relative'],
  }),
  render: ({ derived }) => (
    <>
      {derived.shown && (
        <View
          description={derived.whole}
          label={derived.spoken}
          part="time"
          run
        >
          <Text part="words">{derive('format-date-text')}</Text>
          {/* The parts the web draws each field in under `fields`. */}
          <View
            part="day"
            platform="web"
          />
          <View
            part="day-period"
            platform="web"
          />
          <View
            part="era"
            platform="web"
          />
          <View
            part="fractional-second"
            platform="web"
          />
          <View
            part="hour"
            platform="web"
          />
          <View
            part="minute"
            platform="web"
          />
          <View
            part="month"
            platform="web"
          />
          <View
            part="second"
            platform="web"
          />
          <View
            part="time-zone-name"
            platform="web"
          />
          <View
            part="weekday"
            platform="web"
          />
          <View
            part="year"
            platform="web"
          />
        </View>
      )}
    </>
  ),
})
