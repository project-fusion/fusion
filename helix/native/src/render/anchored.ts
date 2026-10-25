/**
 * What a layer gives each press drawn in its anchor, as a popover's trigger
 * opens it and a tooltip describes the control it holds.
 *
 * **A press reads the anchor around it**, since a phone has no element to
 * listen on: the content passed into a layer's anchor is drawn inside a
 * provider of this context, and each press inside reads it. A layer drawn in
 * the host holds no anchor's context, so a press inside a popover's panel
 * never turns the popover.
 */
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { createContext, useContext } from 'react'

/** What a layer's anchor gives each press drawn in it, at one render. */
export interface AnchorPress {
  /**
   * Opens the layer on Down or Up from a hardware keyboard while it stands
   * closed, with focus on its first or its last control, and answers
   * whether it took the key. Absent where the layer opens on no key.
   */
  readonly arrow?: (press: KeyPress) => boolean
  /**
   * Whether the layer stands open, which a press that says whether it is
   * expanded says, as a popover's trigger does. Absent for a layer whose
   * anchor discloses nothing, as a tooltip's.
   */
  readonly expanded?: boolean
  /** The words the press is described by, as a tooltip describes its trigger. */
  readonly hint?: string
  /**
   * Opens the layer on a long press of the press, where the press has no
   * long press of its own, as a tooltip shows its bubble. Absent where the
   * layer opens on none.
   */
  readonly hold?: () => void
  /**
   * Whether the layer hears the press before the press's own event, as a
   * tooltip closes as its trigger is used, where the web's tooltip hears the
   * click first. A popover hears it once the press's event stands.
   */
  readonly early?: boolean
  /**
   * Opens the layer as keyboard focus lands on the press and closes it as
   * focus leaves, as a tooltip shows on the web's `:focus-visible`. Absent
   * where the layer opens on none.
   */
  readonly focused?: (on: boolean) => void
  /** Runs as the press presses, as the layer's `presses` says. */
  readonly pressed: () => void
  /**
   * Tells the layer the press's view as it is drawn, and `null` as it goes,
   * which focus goes back to as the layer closes in place of the anchor's
   * own box, as the web gives focus back to the trigger.
   */
  readonly seen?: (node: unknown) => void
  /**
   * How a long press that opens the layer ranks: `own`, the trigger's own
   * long press, as a speed dial's under `open-on="long-press"`, or `hint`,
   * as a tooltip's, which a press's own long press outranks. `hint` where
   * absent.
   */
  readonly rank?: 'hint' | 'own'
}

/** What the anchor around a press gives it. Nothing outside an anchor gives one. */
export const AnchorPressContext = createContext<AnchorPress | undefined>(undefined)

/** What the anchor around gives a press, or `undefined` outside one. */
export const useAnchorPress = (): AnchorPress | undefined => useContext(AnchorPressContext)

/**
 * A press's view with the words its binding describes it by after its own
 * hint, as a tooltip describes its trigger, unless they are already its name.
 */
export const described = (
  view: Readonly<Record<string, unknown>>,
  hint: string | undefined,
): Readonly<Record<string, unknown>> => {
  if (hint === undefined || hint === '' || view.accessibilityLabel === hint) {
    return view
  }
  const own = typeof view.accessibilityHint === 'string' ? view.accessibilityHint : ''
  return { ...view, accessibilityHint: own === '' ? hint : `${own}. ${hint}` }
}
