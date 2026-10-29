import {
  bare,
  cancelable,
  headless,
  Path,
  Repeat,
  Slot,
  Svg,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Rating's headless tier: what it takes, what it sends, and its parts.
 *
 * **The control is a row of marks a reader picks a score along.** The
 * `track` draws every mark unfilled, and the `fill` over it draws them
 * again, clipped to the score, so a half score is half a mark. The scores
 * run from `step` to `max`, and those below `min` are not offered. On the
 * web each score is an `option`, a radio laid over its share of the row; a
 * phone hears the row as one control a screen reader adjusts.
 *
 * **A press or a drag picks a score.** A drag shows the score under the
 * finger, sent as `preview`, and picks it as it lets go. The arrow keys
 * pick the score after or before, Home and End the first and the last, and
 * a screen reader's increment and decrement the same. Each choice asks
 * first with `before-change`, and `input` and `change` follow one that
 * stands. With `clearable`, a press on the score chosen, or Backspace or
 * Delete, takes it back to none, and `clear` follows. Read-only, it shows
 * the score and takes no choice.
 *
 * **A required rating with no score** says so in the sentence
 * `value-missing-message` holds.
 *
 * **Web only:** the score a mouse hovers over, which the web previews and a
 * finger cannot, and the form's `name`.
 */
export default headless('rating', {
  props: {
    ariaLabel: string(),
    clearable: false,
    defaultValue: '',
    disabled: false,
    feedback: '',
    hint: '',
    label: '',
    max: 5,
    min: 0,
    /* A form's, which a phone has none of. */
    name: web(''),
    optionLabel: '{score} out of {max}',
    readonly: false,
    required: false,
    showValue: false,
    step: 1,
    value: string(),
    valueMissingMessage: 'Choose a rating to continue.',
    valueText: '',
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    clear: [],
    input: bare(),
    preview: ['value'],
  },
  states: ['invalid', 'settled'],
  derived: {
    /* Whether a shape is passed for the unfilled marks, which the track draws. */
    emptied: bind('emptyMark'),
    markCount: derive('rating-marks'),
    /* Whether a shape is passed for the marks, which draws them as itself. */
    marked: bind('mark'),
  },
  range: {
    clearable: 'clearable',
    defaultProp: 'defaultValue',
    full: 'full',
    max: 'max',
    min: 'min',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onClear: 'clear',
    onInput: 'input',
    onPreview: 'preview',
    optionLabel: 'optionLabel',
    part: 'part',
    prop: 'value',
    reading: 'reading',
    readonly: 'readonly',
    said: 'said',
    spoken: 'spoken',
    step: 'step',
    valueText: 'valueText',
  },
  validation: {
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ derived, props, range, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      <View part="field">
        <View
          data-slotted={derived.marked}
          describedby="hint"
          disabled={props.disabled}
          label={props.ariaLabel}
          labelledby="label"
          part="marks"
          readonly={props.readonly}
          required={props.required}
          role="radiogroup"
        >
          <View
            ariaHidden
            data-slotted={derived.emptied}
            part="track"
          >
            <Repeat
              count={derived.markCount}
              part="track-marks"
            >
              <View part="mark">
                <Slot name="empty-mark">
                  <Slot name="mark">
                    <Svg
                      part="star"
                      platform="native"
                      viewBox="0 0 24 24"
                    >
                      <Path
                        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"
                        part="star-shape"
                      />
                    </Svg>
                  </Slot>
                </Slot>
              </View>
            </Repeat>
          </View>
          <View
            ariaHidden
            part="fill"
            style={{
              '--rating-full': range.full,
              '--rating-part': range.part,
            }}
          >
            <Repeat
              count={derived.markCount}
              part="fill-marks"
            >
              <View part="mark">
                <Slot name="mark">
                  <Svg
                    part="star"
                    platform="native"
                    viewBox="0 0 24 24"
                  >
                    <Path
                      d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"
                      part="star-shape"
                    />
                  </Svg>
                </Slot>
              </View>
            </Repeat>
          </View>
          {!props.readonly && (
            <Repeat
              count={derived.markCount}
              part="options"
            >
              <View
                part="option"
                platform="web"
              />
            </Repeat>
          )}
        </View>
        {props.showValue && (
          <View
            ariaHidden
            part="value"
          >
            <Text part="value-text">{range.said}</Text>
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
