import {
  bind,
  box,
  derive,
  event,
  headless,
  live,
  prop,
  region,
  text,
  total,
  unless,
  when,
} from '../../../tree.js'

/**
 * Meter's headless tier: a measurement in a known range, as a bar, a ring,
 * or an arc, with bands that mark it good, fair, or poor.
 *
 * **The host is the meter**, named by `label`, or by the words of its `label`
 * region. Its reading is the value held inside the range, and the words it is
 * read as are not held, so a value past an end says so: `value-text`, or the
 * reading as a percentage, in `format-options` where they say another style.
 * A phone announces a meter as a progress bar with that reading.
 *
 * **`low`, `high`, and `optimum` set the band**, by the HTML specification's
 * rule, and `band` sets it outright. The fill carries the band as `data-band`
 * and a value past an end as `data-beyond`, and is `indicator-good`, `-fair`,
 * `-poor`, `-over` or `-under` as well. The element is in the custom state of
 * the same name. Each threshold draws a tick, on the bar or round the circle.
 *
 * **The fill is a share of the track**, which the web element writes as
 * `--meter-fraction` on the bar's fill. A round shape is a circle a hundred
 * units long, so how far round its reading and its ticks reach is a length
 * along it, `--meter-along`, and how much of the circle it covers is
 * `--meter-sweep`: all of it for a ring, and three quarters for an arc.
 *
 * **A meter that holds segments measures their sum**, as `total` says, and
 * reads its own `value` only while it holds none. The segments are the fill
 * then, each a slice of the bar, so the meter draws no fill of its own over
 * them.
 *
 * **A move into another band is news**: the meter sends `band`, and says it
 * under `live`. A meter that arrives in a band has not moved.
 */
export default headless('meter', {
  derived: {
    along: derive('meter-along'),
    banded: derive('meter-banded'),
    fair: derive('meter-fair'),
    fraction: derive('meter-fraction'),
    good: derive('meter-good'),
    'high-along': derive('meter-high-along'),
    'high-at': derive('meter-high-at'),
    'in-band': derive('meter-band'),
    'low-along': derive('meter-low-along'),
    'low-at': derive('meter-low-at'),
    over: derive('meter-over'),
    'past-end': derive('meter-beyond'),
    poor: derive('meter-poor'),
    'reading-max': derive('meter-max'),
    'reading-min': derive('meter-min'),
    'reading-now': derive('meter-now'),
    'reading-text': derive('meter-text'),
    said: derive('meter-said'),
    span: derive('meter-span'),
    sweep: derive('meter-sweep'),
    under: derive('meter-under'),
  },
  events: [event('band', { detail: ['band'], follows: 'in-band' })],
  host: {
    label: bind('label'),
    role: 'meter',
    valuemax: bind('reading-max'),
    valuemin: bind('reading-min'),
    valuenow: bind('reading-now'),
    valuetext: bind('reading-text'),
  },
  props: [
    prop('band', ['fair', 'good', 'poor']),
    /* JSON on the web's attribute, such as `{"poor":"Almost full"}`. */
    prop('band-labels', 'object'),
    /* JSON on the web's attribute, such as `{"style":"unit","unit":"gigabyte"}`. */
    prop('format-options', 'object'),
    prop('high', 'number'),
    prop('label', 'string', { default: '' }),
    prop('live', 'boolean', { default: false }),
    prop('live-label', 'string', { default: '{reading}, {band}' }),
    prop('locale', 'string', { default: '' }),
    prop('low', 'number'),
    prop('max', 'number'),
    prop('min', 'number'),
    prop('optimum', 'number'),
    prop('shape', ['arc', 'ring']),
    prop('show-value', 'boolean', { default: false }),
    prop('value', 'number'),
    prop('value-text', 'string', { default: '' }),
  ],
  states: ['fair', 'good', 'over', 'poor', 'settled', 'under'],
  /* The meter measures the sum of its segments where it has any, and is
     `segmented` while it does, which the segments are the fill then. */
  total: total({ holds: 'segmented', into: 'value', of: 'meter-segment', prop: 'value' }),
  tree: [
    region('label', { names: true }),
    unless(
      'shape',
      box('track', { '--meter-span': bind('span') }, [
        /* Segments, each a slice of the bar. */
        region('default'),
        when('banded', box('tick', { '--meter-at': bind('low-at') })),
        when('banded', box('tick', { '--meter-at': bind('high-at') })),
        /* The segments are the fill, so a meter that has them draws no fill of
           its own over them. */
        unless(
          'segmented',
          box('indicator', {
            '--meter-fraction': bind('fraction'),
            also: {
              'indicator-fair': bind('fair'),
              'indicator-good': bind('good'),
              'indicator-over': bind('over'),
              'indicator-poor': bind('poor'),
              'indicator-under': bind('under'),
            },
            'data-band': bind('in-band'),
            'data-beyond': bind('past-end'),
          }),
        ),
      ]),
    ),
    when(
      'shape',
      box('track', { decorative: true, viewBox: '0 0 100 100' }, [
        box('groove', { '--meter-sweep': bind('sweep'), pathLength: 100, shape: 'circle' }),
        when(
          'banded',
          box('tick', { '--meter-along': bind('low-along'), pathLength: 100, shape: 'circle' }),
        ),
        when(
          'banded',
          box('tick', { '--meter-along': bind('high-along'), pathLength: 100, shape: 'circle' }),
        ),
        box('indicator', {
          '--meter-along': bind('along'),
          also: {
            'indicator-fair': bind('fair'),
            'indicator-good': bind('good'),
            'indicator-over': bind('over'),
            'indicator-poor': bind('poor'),
            'indicator-under': bind('under'),
          },
          'data-band': bind('in-band'),
          'data-beyond': bind('past-end'),
          pathLength: 100,
          shape: 'circle',
        }),
      ]),
    ),
    when('show-value', box('value', {}, [text('reading', { says: bind('reading-text') })])),
    live('live', { follows: bind('in-band'), says: bind('said'), while: bind('live') }),
  ],
})
