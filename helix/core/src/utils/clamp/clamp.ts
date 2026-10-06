/**
 * `value` held between `low` and `high`.
 *
 * Written four times before: Lightbox's zoom, Scroll Area's scrollbar, Color
 * Picker's channels and core's color reading.
 */
export const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high)
