import { bind, box, clock, derive, headless, prop, text, when } from '../../../tree.js'

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
  clock: clock({
    expires: 'format-date-expires',
    restarts: ['date', 'elapsed', 'frozen', 'locale', 'numeric', 'relative'],
  }),
  derived: {
    future: derive('format-date-future'),
    past: derive('format-date-past'),
    shown: derive('format-date-shown'),
    spoken: derive('format-date-spoken'),
    whole: derive('format-date-whole'),
  },
  events: [],
  props: [
    prop('calendar', 'string'),
    prop('date', 'time', { default: '' }),
    prop('date-style', ['full', 'long', 'medium', 'short']),
    prop('day', ['numeric', '2-digit']),
    prop('day-period', ['long', 'narrow', 'short']),
    prop('elapsed', 'boolean', { default: false }),
    prop('era', ['long', 'narrow', 'short']),
    prop('fields', 'boolean', { platform: 'web' }),
    prop('fractional-second-digits', 'number'),
    prop('frozen', 'boolean', { default: false }),
    prop('hour', ['numeric', '2-digit']),
    prop('hour-cycle', ['h11', 'h12', 'h23', 'h24']),
    prop('locale', 'string', { default: '' }),
    prop('minute', ['numeric', '2-digit']),
    prop('month', ['numeric', '2-digit', 'long', 'narrow', 'short']),
    prop('numeric', ['always', 'auto']),
    prop('relative', ['long', 'narrow', 'short']),
    prop('second', ['numeric', '2-digit']),
    prop('time-style', ['full', 'long', 'medium', 'short']),
    prop('time-zone', 'string'),
    prop('time-zone-name', [
      'long',
      'longGeneric',
      'longOffset',
      'short',
      'shortGeneric',
      'shortOffset',
    ]),
    prop('weekday', ['long', 'narrow', 'short']),
    prop('year', ['numeric', '2-digit']),
  ],
  states: ['future', 'past', 'settled'],
  tree: [
    when(
      'shown',
      box('time', { description: bind('whole'), label: bind('spoken'), run: true }, [
        text('words', { says: derive('format-date-text') }),
        /* The parts the web draws each field in under `fields`. */
        box('day', { platform: 'web' }),
        box('day-period', { platform: 'web' }),
        box('era', { platform: 'web' }),
        box('fractional-second', { platform: 'web' }),
        box('hour', { platform: 'web' }),
        box('minute', { platform: 'web' }),
        box('month', { platform: 'web' }),
        box('second', { platform: 'web' }),
        box('time-zone-name', { platform: 'web' }),
        box('weekday', { platform: 'web' }),
        box('year', { platform: 'web' }),
      ]),
    ),
  ],
})
