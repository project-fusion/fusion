import { LONG_PRESS_SLOP } from '../speed-dial/long-press.js'

/*
 * Whether one finger's touch was a tap or a swipe.
 *
 * **Measured on the page, in CSS pixels**, because the slop is about the hand
 * and the eye: a finger that drifted a few pixels while tapping meant to tap,
 * whatever the device's own units make of the drift.
 */

/**
 * How far a touch may travel and still be a tap, in CSS pixels: the drift
 * Speed Dial's long press allows a press that stays one press.
 */
export const TAP_SLOP = LONG_PRESS_SLOP

/** What one finger did between landing and lifting. */
export type Gesture = 'swipe' | 'tap'

/**
 * A tap where the finger never strayed further than `TAP_SLOP` from where it
 * landed, and a swipe otherwise. The furthest it strayed, and not where it
 * lifted: a finger that went out and came back moved something on the way.
 */
export const gestureOf = (furthest: number): Gesture => (furthest > TAP_SLOP ? 'swipe' : 'tap')
