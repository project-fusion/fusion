/**
 * Slider's derivations: the room its readout keeps, from its props, as the
 * web's Slider keeps it. The marks along its track are a list, which
 * `derivations.ts` holds.
 */

import type { Derivation } from '../derivations/derivations.js'
import { sliderBoundsOf, sliderMarks, sliderSaid } from './slider.js'

/**
 * `slider-reserve`: how wide a slider's readout stands, in characters: the
 * wider of its bounds as a reader sees them, so the track does not move as
 * the value grows a digit. A range holds the two ends and the words of
 * `range-text`, or more than two listed, each with a comma and a space, and an
 * "and".
 */
export const sliderReserve: Derivation = (props) => {
  const bounds = sliderBoundsOf(props)
  const write = (at: number): string =>
    typeof props.formatter === 'function'
      ? String(props.formatter(at))
      : sliderSaid(at, props['format-options'], props.locale)
  const widest = Math.max(write(bounds.min).length, write(bounds.max).length)
  if (props.range !== true) {
    return `${widest}ch`
  }
  const count = String(props.value ?? props['default-value'] ?? '').split(',').length
  const words = String(props['range-text'] ?? '{start} to {end}').replace(/\{(start|end)\}/g, '')
  return `${count > 2 ? widest * count + 2 * (count - 1) + 4 : widest * 2 + words.length}ch`
}

/** `slider-marked`: whether a slider draws marks along its track, two or more. */
export const sliderMarked: Derivation = (props) =>
  sliderMarks(props.markers, sliderBoundsOf(props)).length > 0
