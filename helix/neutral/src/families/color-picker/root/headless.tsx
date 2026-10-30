import {
  bare,
  boolean,
  cancelable,
  headless,
  object,
  oneOf,
  Path,
  Pressable,
  Repeat,
  Slot,
  Svg,
  string,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Color Picker's headless tier: what it takes, what it sends, and its parts.
 *
 * **A square, a ramp of hue, and a ramp of opacity with `alpha` build the
 * color**, which is text in the syntax `format` names. Hue, saturation and
 * brightness are held beside the text, since black has neither a hue nor a
 * saturation to read back. `wheel` draws the hue as a ring around the square.
 *
 * **The web lays two invisible ranges over the square and paints it with
 * gradients.** A phone draws the same picture from gradients and vectors: the
 * mark on the square is a part, the ring is 180 wedges of hue, and a
 * checkerboard is a dashed path, since a phone has no conic gradient. The two
 * ranges are two adjustable elements a screen reader reaches on a phone.
 *
 * **Each move asks first** with `before-change`, `input` follows a move that
 * stands, and `change` follows once a drag, a key, typed text, or a preset
 * settles it. Disabled or read-only, nothing moves it.
 *
 * **Text that is not a color** stays in the field and out of the value, and is
 * marked once the reader leaves the field.
 *
 * **Web only:** the eyedropper, since a phone has no way to sample the screen,
 * with its label, its icon, and the events that bracket it, and the form's
 * `name`.
 */
export default headless('color-picker', {
  props: {
    alpha: false,
    autocomplete: 'off',
    badInputMessage: 'Enter a color, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).',
    blueLabel: 'Blue',
    brightnessLabel: 'Brightness',
    channelFields: false,
    chromaLabel: 'Chroma',
    colorWords: object(),
    copiedLabel: 'Copied',
    copyLabel: 'Copy {value}',
    defaultValue: '',
    disabled: false,
    eyedropperLabel: web('Sample a color from the screen'),
    feedback: '',
    format: oneOf(['hex', 'hsb', 'hsl', 'oklch', 'rgb']),
    formatLabel: 'Syntax: {format}. Change it.',
    greenLabel: 'Green',
    hint: '',
    hueLabel: 'Hue',
    invalid: boolean(),
    label: '',
    lightnessLabel: 'Lightness',
    /* A form's, which a phone has none of. */
    name: web(''),
    noEyedropper: web(false),
    noFormat: false,
    noValue: false,
    opacityLabel: 'Opacity',
    presetsLabel: 'Presets',
    readonly: false,
    redLabel: 'Red',
    required: false,
    saturationLabel: 'Saturation',
    squareText:
      '{first, select, brightness {{brightnessLabel} {brightness, number, percent}, {saturationLabel} {saturation, number, percent}, {name}} other {{saturationLabel} {saturation, number, percent}, {brightnessLabel} {brightness, number, percent}, {name}}}',
    swatches: '',
    toolsLabel: 'Color tools',
    value: string(),
    valueLabel: 'Color',
    valueMissingMessage: 'Choose a color.',
    wheel: false,
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    copy: ['value'],
    helixSampleEnd: web(bare()),
    helixSampleStart: web(bare()),
    input: bare(),
  },
  states: ['copied', 'dragging', 'invalid', 'sampling', 'settled'],
  color: {
    alpha: 'alpha',
    brightness: 'brightness',
    channels: 'channelRows',
    defaultProp: 'defaultValue',
    fields: 'fieldRows',
    format: 'format',
    formatLabel: 'formatSaid',
    formatWord: 'formatWord',
    hue: 'hue',
    markX: 'markX',
    markY: 'markY',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onCopy: 'copy',
    onInput: 'input',
    painted: 'painted',
    presets: 'presetRows',
    prop: 'value',
    reading: 'reading',
    readonly: 'readonly',
    sampleLabel: 'sampleSaid',
    saturation: 'saturation',
    square: 'squareSaid',
    squareReversed: 'squareReversed',
    swatches: 'swatches',
    tint: 'tint',
    wheelGrid: 'wheelGrid',
    wheelX: 'wheelX',
    wheelY: 'wheelY',
  },
  validation: {
    badInput: 'badInputMessage',
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ color, entry, props, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      <Wrap
        part="wheel"
        when={props.wheel}
      >
        {props.wheel && (
          <View
            ariaHidden
            part="wheel-ring"
            platform="native"
          />
        )}
        {props.wheel && (
          <View
            ariaHidden
            part="wheel-band"
            platform="native"
          />
        )}
        {props.wheel && (
          <View
            ariaHidden
            part="wheel-mark"
            platform="native"
            style={{
              '--color-picker-wheel-x': color.wheelX,
              '--color-picker-wheel-y': color.wheelY,
            }}
          />
        )}
        {props.wheel && (
          <View
            describedby="hint"
            disabled={props.disabled}
            label={props.hueLabel}
            part="wheel-hue"
            role="slider"
            valuemax={360}
            valuemin={0}
            valuenow={color.hue}
          />
        )}
        <View
          part="grid"
          style={{
            '--color-picker-tint': color.tint,
            '--color-picker-wheel-grid': color.wheelGrid,
          }}
        >
          <View
            ariaHidden
            part="grid-white"
            platform="native"
          />
          <View
            ariaHidden
            part="grid-black"
            platform="native"
          />
          <View
            ariaHidden
            part="grid-mark"
            platform="native"
            style={{
              '--color-picker-mark-x': color.markX,
              '--color-picker-mark-y': color.markY,
            }}
          />
          <View
            describedby="hint"
            disabled={props.disabled}
            label={props.saturationLabel}
            part="grid-saturation"
            readonly={props.readonly}
            role="slider"
            valuemax={100}
            valuemin={0}
            valuenow={color.saturation}
            valuetext={color.square}
          />
          <View
            describedby="hint"
            disabled={props.disabled}
            label={props.brightnessLabel}
            part="grid-brightness"
            readonly={props.readonly}
            role="slider"
            valuemax={100}
            valuemin={0}
            valuenow={color.brightness}
            valuetext={color.squareReversed}
          />
        </View>
      </Wrap>
      <View part="controls">
        <Pressable
          disabled={props.disabled}
          label={color.sampleLabel}
          part="sample"
          role="button"
        >
          <View
            ariaHidden
            part="sample-tile"
            platform="native"
          >
            <Svg
              part="sample-checker"
              viewBox="0 0 128 8"
            >
              <Path
                d="M.5 .25H128M0 .75H128M.5 1.25H128M0 1.75H128M.5 2.25H128M0 2.75H128M.5 3.25H128M0 3.75H128M.5 4.25H128M0 4.75H128M.5 5.25H128M0 5.75H128M.5 6.25H128M0 6.75H128M.5 7.25H128M0 7.75H128"
                part="sample-squares"
              />
            </Svg>
          </View>
          <View
            ariaHidden
            part="sample-fill"
            platform="native"
            style={{
              '--color-picker-swatch': color.painted,
            }}
          />
          {state.copied && (
            <View
              ariaHidden
              icon="check"
              part="sample-tick"
              platform="native"
            />
          )}
        </Pressable>
        <View part="channels">
          <Repeat
            each={color.channels}
            key="key"
            part="channel-rows"
          >
            <Wrap
              part="channel-row"
              platform="native"
            >
              <View
                ariaHidden
                part="ramp"
                platform="native"
              >
                <View
                  part="ramp-bar"
                  platform="native"
                >
                  <View
                    hidden={entry.alphaHidden}
                    part="ramp-tile"
                    platform="native"
                  >
                    <Svg
                      part="ramp-checker"
                      viewBox="0 0 128 8"
                    >
                      <Path
                        d="M.5 .25H128M0 .75H128M.5 1.25H128M0 1.75H128M.5 2.25H128M0 2.75H128M.5 3.25H128M0 3.75H128M.5 4.25H128M0 4.75H128M.5 5.25H128M0 5.75H128M.5 6.25H128M0 6.75H128M.5 7.25H128M0 7.75H128"
                        part="ramp-squares"
                      />
                    </Svg>
                  </View>
                  <View
                    hidden={entry.alphaHidden}
                    part="ramp-alpha"
                    platform="native"
                    style={{
                      '--color-picker-tint': color.tint,
                    }}
                  />
                  <View
                    hidden={entry.hueHidden}
                    part="ramp-hue"
                    platform="native"
                  />
                </View>
              </View>
              <View
                data-channel={entry.channel}
                draws="slider"
                exports={{
                  control: true,
                  feedback: true,
                  field: true,
                  hint: true,
                  label: true,
                  marker: true,
                  'marker-label': true,
                  markers: true,
                  output: true,
                  thumb: true,
                  thumbs: true,
                  tooltip: true,
                  tooltips: true,
                }}
                gives={{
                  disabled: props.disabled,
                  label: entry.label,
                  max: entry.max,
                  min: '0',
                  value: entry.value,
                  valueText: entry.said,
                }}
                part="channel"
              />
            </Wrap>
          </Repeat>
        </View>
      </View>
      {props.channelFields && (
        <View part="fields">
          <Repeat
            each={color.fields}
            key="key"
            part="field-rows"
          >
            <View part="field">
              <View part="field-label">
                <Text part="field-label-text">{entry.word}</Text>
              </View>
              <TextInput
                disabled={props.disabled}
                inputMode={entry.inputmode}
                label={entry.fieldName}
                part="field-input"
                type="number"
              />
            </View>
          </Repeat>
        </View>
      )}
      <View part="footer">
        {!props.noValue && (
          <TextInput
            autoCapitalize="none"
            autoComplete={props.autocomplete}
            autoCorrect={false}
            describedby="hint"
            disabled={props.disabled}
            label={props.valueLabel}
            part="value"
          />
        )}
        {!props.noFormat && (
          <Wrap
            draws="button-group"
            gives={{ label: props.toolsLabel }}
            part="actions"
          >
            <View
              draws="button"
              exports={{ button: true, live: true, spinner: true, text: true }}
              part="eyedropper"
              platform="web"
            />
            <Wrap
              draws="button"
              exports={{ button: true, live: true, spinner: true, text: true }}
              gives={{ disabled: props.disabled, label: color.formatLabel }}
              part="format"
            >
              <Text part="format-word">{color.formatWord}</Text>
            </Wrap>
          </Wrap>
        )}
      </View>
      {props.swatches && (
        <View
          label={props.presetsLabel}
          part="swatches"
          role="group"
        >
          <Repeat
            each={color.presets}
            key="key"
            part="swatch-rows"
          >
            <Pressable
              disabled={props.disabled}
              label={entry.name}
              part="swatch"
              role="button"
            >
              <View
                ariaHidden
                part="swatch-tile"
                platform="native"
              >
                <Svg
                  part="swatch-checker"
                  viewBox="0 0 128 8"
                >
                  <Path
                    d="M.5 .25H128M0 .75H128M.5 1.25H128M0 1.75H128M.5 2.25H128M0 2.75H128M.5 3.25H128M0 3.75H128M.5 4.25H128M0 4.75H128M.5 5.25H128M0 5.75H128M.5 6.25H128M0 6.75H128M.5 7.25H128M0 7.75H128"
                    part="swatch-squares"
                  />
                </Svg>
              </View>
              <View
                ariaHidden
                part="swatch-fill"
                platform="native"
                style={{
                  '--color-picker-swatch': entry.color,
                }}
              />
            </Pressable>
          </Repeat>
        </View>
      )}
      <Wrap
        part="hint"
        when={props.hint}
      >
        <Slot name="hint">
          <Text part="hint-text">{props.hint}</Text>
        </Slot>
      </Wrap>
      {state.invalid && (
        <View
          part="feedback"
          role="alert"
        >
          <Text part="feedback-text">{validation.message}</Text>
        </View>
      )}
      <Slot
        name="eyedropper-icon"
        platform="web"
      />
    </>
  ),
})
