/**
 * How an element a reader builds a color in says so in its headless source,
 * as a color picker does, and how a field that opens one says so. Read as
 * syntax, as `tree.ts` says.
 */

/**
 * What an element a reader builds a color in holds: text in the syntax
 * `format` names, with hue, saturation and brightness held beside it.
 *
 * **Each move asks first.** `onBeforeChange` names the event sent before the
 * color changes, with the color it would leave as `value`, and a handler that
 * refuses it keeps the color. `onInput` follows each move that stands, and
 * `onChange` follows once a drag, a key, typed text, or a preset settles it.
 * `onCopy` is sent once the sample puts the value on the clipboard.
 *
 * The other fields name what a render reads as `color.x`: `reading`, the text
 * of the color, `hue`, `saturation`,
 * and `brightness`, the numbers; `painted`, the color as CSS; `tint`, the hue at
 * full strength; `markX` and `markY`, where a phone stands the mark on the
 * square, and `wheelX` and `wheelY`, on the ring, and
 * `wheelGrid`, how wide the square inside the ring stands; `square` and `squareReversed`,
 * what a screen reader hears on each axis of the square; `sampleLabel`, the
 * sample's name; `formatWord` and `formatLabel`, what the syntax toggle says;
 * and the lists `channels`, the ramps, `fields`, a number field for each
 * channel, and `presets`.
 */
export interface ColorPicked {
  readonly alpha?: string
  readonly brightness: string
  readonly channels: string
  readonly defaultProp?: string
  readonly fields: string
  readonly format?: string
  readonly formatLabel: string
  readonly formatWord: string
  readonly hue: string
  readonly markX: string
  readonly markY: string
  readonly onBeforeChange?: string
  readonly onChange?: string
  readonly onCopy?: string
  readonly onInput?: string
  readonly painted: string
  readonly presets: string
  readonly prop: string
  readonly reading: string
  readonly readonly?: string
  readonly sampleLabel: string
  readonly saturation: string
  readonly square: string
  readonly squareReversed: string
  readonly swatches?: string
  readonly tint: string
  readonly wheelGrid: string
  readonly wheelX: string
  readonly wheelY: string
}

/**
 * What a text field that opens a color picker computes from its text: the
 * color its picker shows, `picked`, which is the last text that was a color;
 * the color its swatch paints, `painted`; and what the swatch says of itself,
 * `said`. The text is the element's `text`, and a change in the picker is an
 * edit of it.
 */
export interface ColorFieldComputed {
  readonly painted: string
  readonly picked: string
  readonly said: string
}
