/**
 * Rating's derivations: how many marks its row draws, from its props, as
 * the web's Rating draws them.
 */

import type { Derivation } from '../derivations/derivations.js'
import { ratingScale } from './rating.js'

/** `rating-marks`: how many marks a rating's row draws, its `max` rounded. */
export const ratingMarks: Derivation = (props) =>
  String(ratingScale(props.min, props.max, props.step).marks)
