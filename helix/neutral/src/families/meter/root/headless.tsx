import {
  Announce,
  Circle,
  headless,
  number,
  object,
  oneOf,
  Slot,
  Svg,
  Text,
  View,
} from '../../../render.js'
import { bind, derive } from '../../../tree.js'

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
  props: {
    band: oneOf(['fair', 'good', 'poor']),
    /* JSON on the web's attribute, such as `{"poor":"Almost full"}`. */
    bandLabels: object(),
    /* JSON on the web's attribute, such as `{"style":"unit","unit":"gigabyte"}`. */
    formatOptions: object(),
    high: number(),
    label: '',
    live: false,
    liveLabel: '{reading}, {band}',
    locale: '',
    low: number(),
    max: number(),
    min: number(),
    optimum: number(),
    shape: oneOf(['arc', 'ring']),
    showValue: false,
    value: number(),
    valueText: '',
  },
  events: {
    band: { detail: ['band'], follows: 'in-band' },
  },
  states: ['fair', 'good', 'over', 'poor', 'settled', 'under'],
  derived: {
    along: derive('meter-along'),
    banded: derive('meter-banded'),
    fair: derive('meter-fair'),
    fraction: derive('meter-fraction'),
    good: derive('meter-good'),
    highAlong: derive('meter-high-along'),
    highAt: derive('meter-high-at'),
    inBand: derive('meter-band'),
    lowAlong: derive('meter-low-along'),
    lowAt: derive('meter-low-at'),
    over: derive('meter-over'),
    pastEnd: derive('meter-beyond'),
    poor: derive('meter-poor'),
    readingMax: derive('meter-max'),
    readingMin: derive('meter-min'),
    readingNow: derive('meter-now'),
    readingText: derive('meter-text'),
    said: derive('meter-said'),
    span: derive('meter-span'),
    sweep: derive('meter-sweep'),
    under: derive('meter-under'),
  },
  host: {
    label: bind('label'),
    role: 'meter',
    valuemax: bind('readingMax'),
    valuemin: bind('readingMin'),
    valuenow: bind('readingNow'),
    valuetext: bind('readingText'),
  },
  /* The meter measures the sum of its segments where it has any, and is
     `segmented` while it does, which the segments are the fill then. */
  total: { holds: 'segmented', itemProp: 'value', of: 'meter-segment', prop: 'value' },
  render: ({ derived, props, total }) => (
    <>
      <Slot
        name="label"
        names
      />
      {!props.shape ? (
        <View
          part="track"
          style={{
            '--meter-span': derived.span,
          }}
        >
          {/* Segments, each a slice of the bar. */}
          <Slot />
          {derived.banded && (
            <View
              part="tick"
              style={{
                '--meter-at': derived.lowAt,
              }}
            />
          )}
          {derived.banded && (
            <View
              part="tick"
              style={{
                '--meter-at': derived.highAt,
              }}
            />
          )}
          {/* The segments are the fill, so a meter that has them draws no fill of
              its own over them. */}
          {!total.holds && (
            <View
              also={{
                'indicator-fair': derived.fair,
                'indicator-good': derived.good,
                'indicator-over': derived.over,
                'indicator-poor': derived.poor,
                'indicator-under': derived.under,
              }}
              data-band={derived.inBand}
              data-beyond={derived.pastEnd}
              part="indicator"
              style={{
                '--meter-fraction': derived.fraction,
              }}
            />
          )}
        </View>
      ) : (
        <Svg
          ariaHidden
          part="track"
          viewBox="0 0 100 100"
        >
          <Circle
            part="groove"
            pathLength={100}
            style={{
              '--meter-sweep': derived.sweep,
            }}
          />
          {derived.banded && (
            <Circle
              part="tick"
              pathLength={100}
              style={{
                '--meter-along': derived.lowAlong,
              }}
            />
          )}
          {derived.banded && (
            <Circle
              part="tick"
              pathLength={100}
              style={{
                '--meter-along': derived.highAlong,
              }}
            />
          )}
          <Circle
            also={{
              'indicator-fair': derived.fair,
              'indicator-good': derived.good,
              'indicator-over': derived.over,
              'indicator-poor': derived.poor,
              'indicator-under': derived.under,
            }}
            data-band={derived.inBand}
            data-beyond={derived.pastEnd}
            part="indicator"
            pathLength={100}
            style={{
              '--meter-along': derived.along,
            }}
          />
        </Svg>
      )}
      {props.showValue && (
        <View part="value">
          <Text part="reading">{derived.readingText}</Text>
        </View>
      )}
      <Announce
        follows={derived.inBand}
        part="live"
        when={props.live}
      >
        {derived.said}
      </Announce>
    </>
  ),
})
