import {
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  object,
  oneOf,
  Path,
  Pressable,
  Slot,
  Svg,
  string,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Color Input's headless tier: a field for a color, typed in any syntax or
 * picked from the picker it opens.
 *
 * **The field is the box around the text and a swatch of the color**, which
 * opens the picker. `variant="swatch"` is the swatch alone, and the picker
 * then shows the text. A move in the picker is an edit of the text: it asks
 * first with `before-change`, and a refusal leaves the square on the color
 * the field holds.
 *
 * **Text that is not a color** is reported with `bad-input-message` once the
 * reader leaves the field, and the picker keeps the last color it was given.
 *
 * **Read-only**, the text can be read and the picker does not open.
 *
 * **Web only:** the form's `name`, and Down in the field, which opens the
 * picker from a keyboard.
 */
export default headless('color-input', {
  props: {
    alpha: false,
    ariaLabel: string(),
    autocomplete: 'off',
    badInputMessage: 'Enter a color, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).',
    channelFields: false,
    colorWords: object(),
    defaultOpen: false,
    defaultValue: '',
    disabled: false,
    feedback: '',
    format: oneOf(['hex', 'hsb', 'hsl', 'oklch', 'rgb']),
    hint: '',
    label: '',
    /* A form's, which a phone has none of. */
    name: web(''),
    noFormat: false,
    open: boolean(),
    placeholder: '#000000',
    readonly: false,
    required: false,
    swatches: '',
    swatchLabel: '{name} {value}',
    triggerLabel: 'Choose a color',
    value: string(),
    valueMissingMessage: 'Choose a color.',
    variant: oneOf(['swatch']),
    wheel: false,
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    change: bare(),
    input: bare(),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['alignedStart', 'invalid', 'open', 'placedBottom', 'placedTop', 'settled'],
  derived: {
    locked: derive('color-input-locked'),
    texted: derive('color-input-texted'),
  },
  colorField: {
    painted: 'painted',
    picked: 'picked',
    said: 'said',
  },
  text: {
    defaultProp: 'defaultValue',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    prop: 'value',
    readonly: 'readonly',
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  validation: {
    badInput: 'badInputMessage',
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ colorField, derived, props, state, validation }) => (
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
        <Slot name="start" />
        {derived.texted && (
          <TextInput
            autoCapitalize="none"
            autoComplete={props.autocomplete}
            autoCorrect={false}
            describedby="hint"
            disabled={props.disabled}
            labelledby="label"
            part="control"
            placeholder={props.placeholder}
            required={props.required}
          />
        )}
        <Slot name="end" />
        <Pressable
          disabled={derived.locked}
          label={colorField.said}
          part="trigger"
          role="button"
        >
          <View
            part="preview"
            style={{ '--color-input-swatch': colorField.painted }}
          >
            <View
              ariaHidden
              part="preview-tile"
              platform="native"
            >
              <Svg
                part="preview-checker"
                viewBox="0 0 128 8"
              >
                <Path
                  d="M.5 .25H128M0 .75H128M.5 1.25H128M0 1.75H128M.5 2.25H128M0 2.75H128M.5 3.25H128M0 3.75H128M.5 4.25H128M0 4.75H128M.5 5.25H128M0 5.75H128M.5 6.25H128M0 6.75H128M.5 7.25H128M0 7.75H128"
                  part="preview-squares"
                />
              </Svg>
            </View>
            <View
              ariaHidden
              part="preview-fill"
              platform="native"
              style={{ '--color-input-swatch': colorField.painted }}
            />
          </View>
          <Slot name="trigger" />
        </Pressable>
      </View>
      <Layer
        anchor="field"
        anchorPress="toggle"
        closedby="any"
        label={props.triggerLabel}
        offset={8}
        open={props.open}
        part="surface"
        placement="bottom-start"
        role="dialog"
      >
        <Slot name="panel-header" />
        <View
          draws="color-picker"
          exports={{
            actions: true,
            channel: true,
            'channel-control': true,
            'channel-feedback': true,
            'channel-field': true,
            'channel-hint': true,
            'channel-label': true,
            'channel-marker': true,
            'channel-marker-label': true,
            'channel-markers': true,
            'channel-output': true,
            'channel-thumb': true,
            'channel-thumbs': true,
            'channel-tooltip': true,
            'channel-tooltips': true,
            channels: true,
            controls: true,
            eyedropper: true,
            'eyedropper-button': true,
            'eyedropper-live': true,
            'eyedropper-spinner': true,
            'eyedropper-text': true,
            feedback: true,
            field: true,
            'field-input': true,
            'field-label': true,
            fields: true,
            footer: true,
            format: true,
            'format-button': true,
            'format-live': true,
            'format-spinner': true,
            'format-text': true,
            grid: true,
            'grid-brightness': true,
            'grid-handle': true,
            'grid-saturation': true,
            hint: true,
            icon: true,
            label: true,
            sample: true,
            swatch: true,
            swatches: true,
            value: true,
            wheel: true,
            'wheel-hue': true,
          }}
          gives={{
            alpha: props.alpha,
            channelFields: props.channelFields,
            colorWords: props.colorWords,
            disabled: props.disabled,
            feedback: props.feedback,
            format: props.format,
            noFormat: props.noFormat,
            noValue: derived.texted,
            swatches: props.swatches,
            wheel: props.wheel,
          }}
          part="picker"
        />
        <Slot name="panel-footer" />
      </Layer>
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
