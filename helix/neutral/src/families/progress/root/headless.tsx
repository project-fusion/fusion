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
 * Progress's headless tier: how far along a task is, as a bar or a ring.
 *
 * **The host is the progress bar**, named by `label`, or by the words of
 * its `label` region, which a phone draws above the bar and reads as the
 * name. Its reading is the value held inside the range and the words it is
 * read as: `value-text`, the words written on the bar, or the reading as a
 * percentage, in `format-options` where they say another style. An
 * indeterminate bar has no reading of its own.
 *
 * **The fill is a share of the track**, which the web element writes as
 * `--progress-fraction` on the parts that read it: the whole track while
 * indeterminate, where the fill is the segment that travels. Words in the
 * default region are drawn on the bar, or in the middle of the ring.
 *
 * **Arriving at `max` is news**: the bar sends `complete` with the value it
 * arrived at, and says `complete-label` in its live region. A bar that starts
 * full, or is indeterminate, has not arrived.
 */
export default headless('progress', {
  props: {
    completeLabel: 'Complete',
    fallbackLabel: 'Progress',
    /* JSON on the web's attribute, such as `{"style":"unit","unit":"megabyte"}`. */
    formatOptions: object(),
    indeterminate: false,
    label: '',
    locale: '',
    max: number(),
    min: number(),
    shape: oneOf(['ring']),
    showValue: false,
    value: number(),
    valueText: '',
  },
  events: {
    complete: { detail: ['value'], follows: 'complete', gives: { value: 'reading-max' } },
  },
  states: ['complete', 'content', 'settled'],
  derived: {
    complete: derive('progress-complete'),
    content: bind('default'),
    fraction: derive('progress-fraction'),
    name: derive('progress-name'),
    readingMax: derive('progress-max'),
    readingMin: derive('progress-min'),
    readingNow: derive('progress-now'),
    readingSaid: derive('progress-said'),
    readingText: derive('progress-text'),
  },
  host: {
    label: bind('name'),
    role: 'progressbar',
    valuemax: bind('readingMax'),
    valuemin: bind('readingMin'),
    valuenow: bind('readingNow'),
    valuetext: bind('readingSaid'),
  },
  render: ({ derived, props }) => (
    <>
      <Slot
        name="label"
        names
      />
      {!props.shape ? (
        <View part="track">
          <View
            part="indicator"
            style={{
              '--progress-fraction': derived.fraction,
            }}
          />
          <View
            ariaHidden
            part="content"
            style={{
              '--progress-fraction': derived.fraction,
            }}
          >
            <Slot />
          </View>
          {/* The words again, over the fill and cut where it ends, in the ink
              made for it: a phone's way of drawing them in two inks, which the
              web clips a gradient to the glyphs for. */}
          <View
            ariaHidden
            part="content-fill"
            platform="native"
            style={{
              '--progress-fraction': derived.fraction,
            }}
          >
            <Slot />
          </View>
        </View>
      ) : (
        <Svg
          ariaHidden
          part="track"
          viewBox="none"
        >
          <Circle part="groove" />
          <Circle
            part="indicator"
            pathLength={100}
            style={{
              '--progress-fraction': derived.fraction,
            }}
          />
        </Svg>
      )}
      {props.shape && (
        <View
          ariaHidden
          part="content"
          style={{
            '--progress-fraction': derived.fraction,
          }}
        >
          <Slot />
        </View>
      )}
      {props.showValue && !props.indeterminate && (
        <View
          ariaHidden
          part="value"
        >
          <Text part="reading">{derived.readingText}</Text>
        </View>
      )}
      <Announce
        follows={derived.complete}
        part="live"
      >
        {props.completeLabel}
      </Announce>
    </>
  ),
})
