/**
 * App Header's derivations: whether its middle region is folded behind the
 * toggle, and at which end of the bar the toggle stands, as the web element
 * works them out.
 */
import { environment } from '../../capabilities/environment/index.js'
import type { Derivation, DerivationProps } from '../derivations/derivations.js'

/**
 * `app-header-folded`: whether the bar is narrower than its `fold-below`.
 * The web measures the bar, and a phone the window, which is the bar's width
 * while the bar spans the window, as it does at the top of an app. Unset, or
 * at zero or below, it never folds.
 */
export const appHeaderFolded: Derivation = (props) => {
  const below = Number(props['fold-below'])
  return Number.isFinite(below) && below > 0 && environment().read().window.width < below
}

/** Whether the toggle stands before the leading content. */
const leads = (props: DerivationProps): boolean => props['toggle-placement'] === 'start'

/** `app-header-toggle-start`: whether the folded bar draws its toggle at its start. */
export const appHeaderToggleStart: Derivation = (props) => appHeaderFolded(props) && leads(props)

/** `app-header-toggle-end`: whether the folded bar draws its toggle at its end, after the trailing content. */
export const appHeaderToggleEnd: Derivation = (props) => appHeaderFolded(props) && !leads(props)
