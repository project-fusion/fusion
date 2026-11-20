/**
 * The states a layer gives its element, the flag its part takes once it
 * is placed, as the web's floating controller writes them, and whether it
 * stands open where a machine before it computes that.
 */
import type { Behavior } from '../render/behavior'
import type { Placed } from './layer-place'

/**
 * Whether an anchored layer's part is placed: once Floating UI has put it
 * against its anchor, or as a sheet, as the web's floating controller writes
 * `data-placed`, so it moves in from where its rules hold it before then.
 */
export const placedOf = (
  anchored: boolean,
  open: boolean,
  sheet: boolean,
  placed: Placed,
): Record<string, boolean> =>
  anchored ? { 'data-placed': open && (sheet || placed.at !== undefined) } : {}

/**
 * The states a layer gives its element: `open`, `sheet` while it is drawn
 * as one, and while it stands open as a popover the side it landed on and
 * the end of that side it is aligned to, as the web's floating controller
 * writes them.
 */
export const statesOf = (
  open: boolean,
  sheet: boolean,
  placed: Placed,
): Record<string, boolean> => {
  const popover = open && !sheet
  const states: Record<string, boolean> = {
    'aligned-end': popover && placed.aligned === 'end',
    'aligned-start': popover && placed.aligned === 'start',
    open,
    sheet,
  }
  for (const side of ['bottom', 'left', 'right', 'top'] as const) {
    states[`placed-${side}`] = popover && placed.side === side
  }
  return states
}

/** What a machine bound before the layer computes under `name`, where one computes it. */
export const shownBy = (
  bound: readonly Behavior[],
  name: string | undefined,
): boolean | undefined => {
  if (name === undefined) {
    return undefined
  }
  for (const one of bound) {
    const state = one.parts.host?.states?.[name]
    if (typeof state === 'boolean') {
      return state
    }
  }
  return undefined
}

/**
 * What a machine bound before the layer computes under `name`, a flag, words,
 * or a number, as a tour stop computes how far its panel stands from its
 * target, where one computes it.
 */
export const statedBy = (bound: readonly Behavior[], name: string): unknown => {
  for (const one of bound) {
    const state: unknown = one.parts.host?.states?.[name]
    if (state !== undefined) {
      return state
    }
  }
  return undefined
}

/**
 * Whether a layer stands open: as its toggle holds it, or else as a machine
 * before it computes, or else as its prop says.
 */
export const openOf = (
  checked: boolean | undefined,
  shown: boolean | undefined,
  said: boolean,
): boolean => checked ?? shown ?? said
