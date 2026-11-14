import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { createContext, useContext } from 'react'

/** The way a toolbar runs. */
export type ToolbarAxis = 'horizontal' | 'vertical'

/**
 * The way the toolbar around a component runs, which a divider in it runs
 * across, as core's `toolbarAround` finds the toolbar on the web.
 *
 * **A toolbar gives its axis to what it holds**, and a menu, a popover, a
 * dialog, or a drawer opened from one gives `undefined`, so a divider in the
 * popup is no longer in the toolbar, as on the web. Nothing outside a
 * toolbar gives one.
 */
export const ToolbarAxisContext = createContext<ToolbarAxis | undefined>(undefined)

/** The way the toolbar around runs, or `undefined` outside one. */
export const useToolbarAxis = (): ToolbarAxis | undefined => useContext(ToolbarAxisContext)

/**
 * The role a reader hears for `role` inside a toolbar or outside one. **A
 * toolbar inside a toolbar is a group of it**, so a reader meets one toolbar,
 * as core's `toolbarAround` makes a toggle group or a button group whose
 * items press on their own a group of the toolbar around it.
 */
export const inToolbarAs = <Role>(role: Role, inToolbar: boolean): Role | 'group' =>
  role === 'toolbar' && inToolbar ? 'group' : role

/** One control of a toolbar, as it joins: the view focus moves to, and whether it is disabled now. */
export interface ToolbarStop {
  readonly disabled: () => boolean
  readonly node: () => unknown
}

/**
 * The controls of the toolbar around, which each control that takes focus
 * joins, and the arrow keys pressed on one of them.
 */
export interface ToolbarStops {
  /** Joins a control, by a key of its own, in the order controls join. */
  readonly join: (key: object, stop: ToolbarStop) => void
  /**
   * Hands the toolbar a key pressed on the control with `key`, and answers
   * whether it took it, so the platform does nothing else with it.
   */
  readonly key: (key: object, press: KeyPress) => boolean
  readonly leave: (key: object) => void
}

/**
 * The controls of the toolbar around a component, which a press that hears
 * its own keys joins, as the web's `ToolbarController` reads the toolbar's
 * focusable children. **A toolbar inside another gives the outer one's**, so
 * the outer toolbar's keys walk its controls. A menu, a popover, a dialog,
 * or a drawer opened from a toolbar gives `undefined`, as it does the axis.
 */
export const ToolbarStopsContext = createContext<ToolbarStops | undefined>(undefined)

/** The controls of the toolbar around, or `undefined` outside one. */
export const useToolbarStops = (): ToolbarStops | undefined => useContext(ToolbarStopsContext)
