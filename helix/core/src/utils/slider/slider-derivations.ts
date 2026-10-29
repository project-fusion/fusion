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
 * the value grows a digit.
 */
export const sliderReserve: Derivation = (props) => {
  const bounds = sliderBoundsOf(props)
  const widest = Math.max(
    sliderSaid(bounds.min, props['format-options'], props.locale).length,
    sliderSaid(bounds.max, props['format-options'], props.locale).length,
  )
  return `${widest}ch`
}

/** `slider-marked`: whether a slider draws marks along its track, two or more. */
export const sliderMarked: Derivation = (props) =>
  sliderMarks(props.markers, sliderBoundsOf(props)).length > 0
