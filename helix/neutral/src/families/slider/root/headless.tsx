import {
  bare,
  callback,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Repeat,
  Slot,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Slider's headless tier: what it takes, what it sends, and its parts.
 *
 * **The control is the track a reader moves the value along.** On the web it
 * is a native `<input type="range">`, whose track and thumb the browser
 * draws and the styled tier paints through the range's pseudo-elements. A
 * phone draws the track, its fill, and the thumb as parts: `rail` holds the
 * control and the layers over it, `track` and `fill` are the control's
 * groove, and the `thumb` over the track is the thumb itself, where the web
 * draws it only to hold the `thumb` slot.
 *
 * **A drag, a press on the track, the keys, and a screen reader each move
 * the value**, held to `min`, `max`, and `step`. Each move asks first with
 * `before-change`, `input` follows a move that stands, and `change` follows
 * a drag or a press as it lets go and each step a key or a screen reader
 * takes. A screen reader hears the value, in `format-options` or
 * `value-text` where they ask for words.
 *
 * **Marks, their labels, the readout, and a bubble on the thumb** are drawn
 * on both, from the props that ask for them.
 *
 * **A `range` holds a thumb for each value**, written joined by commas, the
 * lowest first. A press takes the nearest thumb to the point pressed, and each
 * thumb stops at its neighbors and is its own control to a screen reader and to
 * the keys. `formatter` writes a value with a function.
 *
 * **Web only:** the form's `name`.
 */
export default headless('slider', {
  props: {
    ariaLabel: string(),
    defaultValue: '',
    disabled: false,
    feedback: '',
    /* JSON on the web's attribute, such as `{"style":"percent"}`. */
    formatOptions: object(),
    formatter: callback('(value: number) => string'),
    hint: '',
    label: '',
    locale: '',
    markerLabels: false,
    markers: 0,
    max: 100,
    maximumLabel: 'maximum',
    min: 0,
    minimumLabel: 'minimum',
    minStepsBetweenThumbs: 0,
    /* A form's, which a phone has none of. */
    name: web(''),
    orientation: oneOf(['horizontal', 'vertical']),
    origin: oneOf(['center', 'end', 'start']),
    pageStep: number(),
    range: false,
    rangeText: '{start} to {end}',
    readonly: false,
    required: false,
    showValue: false,
    step: 1,
    thumbLabel: 'thumb {index}',
    tooltip: false,
    value: string(),
    valueMissingMessage: string(),
    valueText: '',
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    input: bare(),
  },
  states: ['dragging', 'focusVisible', 'invalid', 'settled'],
  derived: {
    marked: derive('slider-marked'),
    reserve: derive('slider-reserve'),
    /* Whether the thumb's region holds something, which lays the thumbs over the track on the web. */
    thumbed: bind('thumb'),
  },
  range: {
    dragging: 'dragging',
    defaultProp: 'defaultValue',
    fillFrom: 'fillFrom',
    fillSpan: 'fillSpan',
    fillTo: 'fillTo',
    focusVisible: 'focusVisible',
    formatOptions: 'formatOptions',
    formatter: 'formatter',
    fraction: 'fraction',
    label: 'label',
    locale: 'locale',
    max: 'max',
    maximumLabel: 'maximumLabel',
    min: 'min',
    minimumLabel: 'minimumLabel',
    minStepsBetween: 'minStepsBetweenThumbs',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    orientation: 'orientation',
    origin: 'origin',
    pageStep: 'pageStep',
    prop: 'value',
    rangeText: 'rangeText',
    reading: 'reading',
    readonly: 'readonly',
    said: 'said',
    several: 'range',
    spoken: 'spoken',
    step: 'step',
    thumbLabel: 'thumbLabel',
    thumbs: 'thumbs',
    valueText: 'valueText',
  },
  validation: {
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ derived, entry, props, range, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      <View
        data-markers={derived.marked}
        data-range={props.range}
        data-thumbs={derived.thumbed}
        data-tooltip={props.tooltip}
        part="field"
      >
        <Wrap
          part="rail"
          platform="native"
        >
          <View
            data-origin={props.origin}
            describedby="hint"
            disabled={props.disabled}
            label={props.ariaLabel}
            labelledby="label"
            part="control"
            readonly={props.readonly}
            role="slider"
            style={{
              '--slider-fraction': range.fraction,
              '--slider-from': range.fillFrom,
              '--slider-to': range.fillTo,
            }}
            valuemax={props.max}
            valuemin={props.min}
            valuenow={range.reading}
            valuetext={range.spoken}
          >
            <View
              part="track"
              platform="native"
            >
              <View
                part="fill"
                platform="native"
                style={{
                  '--slider-fill-from': range.fillFrom,
                  '--slider-fill-span': range.fillSpan,
                }}
              />
            </View>
          </View>
          {derived.marked && (
            <View
              ariaHidden
              part="markers"
            >
              <Repeat
                each={derive('slider-markers')}
                key="at"
                part="marks"
              >
                <View
                  part="marker"
                  style={{
                    '--slider-marker-at': entry.place,
                  }}
                >
                  {props.markerLabels && (
                    <View part="marker-label">
                      <Text part="marker-label-text">{entry.label}</Text>
                    </View>
                  )}
                </View>
              </Repeat>
            </View>
          )}
          <View
            ariaHidden
            part="thumbs"
          >
            {props.range ? (
              <Repeat
                each={range.thumbs}
                key="at"
                part="thumb-stops"
              >
                <View
                  part="thumb"
                  style={{
                    '--slider-at': entry.fraction,
                  }}
                >
                  <View
                    hidden={entry.unlit}
                    part="thumb-halo"
                    platform="native"
                  />
                  <View
                    hidden={entry.notStart}
                    part="thumb-start"
                    platform="native"
                  >
                    <Slot name="thumb" />
                  </View>
                  <View
                    hidden={entry.notEnd}
                    part="thumb-last"
                    platform="native"
                  >
                    <Slot name="thumb-end" />
                  </View>
                </View>
              </Repeat>
            ) : (
              <View
                part="thumb"
                style={{
                  '--slider-at': range.fraction,
                }}
              >
                <Slot name="thumb" />
              </View>
            )}
          </View>
          {props.tooltip && (
            <View
              ariaHidden
              part="tooltips"
            >
              {props.range ? (
                <Repeat
                  each={range.thumbs}
                  key="at"
                  part="tooltip-stops"
                >
                  <View
                    part="tooltip"
                    style={{
                      '--slider-at': entry.fraction,
                    }}
                  >
                    <Text part="tooltip-text">{entry.said}</Text>
                  </View>
                </Repeat>
              ) : (
                <View
                  part="tooltip"
                  style={{
                    '--slider-at': range.fraction,
                  }}
                >
                  <Text part="tooltip-text">{range.said}</Text>
                </View>
              )}
            </View>
          )}
        </Wrap>
        {props.showValue && (
          <View
            ariaHidden
            part="output"
            style={{
              '--_slider-output-reserve': derived.reserve,
            }}
          >
            <Text part="output-text">{range.said}</Text>
          </View>
        )}
      </View>
      {!state.invalid ? (
        <Wrap
          part="hint"
          when={props.hint}
        >
          <Slot name="hint">
            <Text part="hint-text">{props.hint}</Text>
          </Slot>
        </Wrap>
      ) : (
        <View
          part="feedback"
          role="alert"
        >
          <Slot name="feedback">
            <Text part="feedback-text">{validation.message}</Text>
          </Slot>
        </View>
      )}
    </>
  ),
})
