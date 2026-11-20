import type { PressPointerType } from '../../events/details.js'
import type { Host, Performed } from '../runner.js'
import type { PressContext } from './machine.js'
import type * as compiled from './press.generated.js'

/** The effects a host performs for a press. */
export type PressEffect = Performed<typeof compiled>

/** What a family binds a press to: what the part does, and how a press is told. */
export interface PressParts {
  /**
   * Does what a press on the part does, such as Button sending its command
   * and submitting or resetting its form. Called for a click no listener
   * refused.
   */
  readonly act: () => void

  /**
   * Called once a primary pointer has been held still on the part for half a
   * second, a long press. Speed Dial and Menu open what their trigger holds.
   */
  readonly hold: () => void

  /** Tells the consumer what pressed the part, after `act`, as `helix-press` does on the web. */
  readonly press: (pointerType: PressPointerType) => void
}

/**
 * What a press's effects do: `act` has the family do what the press does,
 * `press` has it tell the consumer what pressed the part, and `hold` has it
 * take a long press. Each reaches past the part, so a stop leaves out all
 * three.
 */
export const pressHost = (parts: PressParts): Host<PressContext, PressEffect> => ({
  notifies: ['act', 'hold', 'press'],
  perform: {
    act: () => {
      parts.act()
    },
    hold: () => {
      parts.hold()
    },
    press: (context) => {
      if (context.pointerType !== '') {
        parts.press(context.pointerType)
      }
    },
  },
})
