/**
 * Splitter's derivations: the name its divider is read by, from its props,
 * as the web's Splitter names it.
 */

import type { Derivation } from '../derivations/derivations.js'

/** `splitter-name`: the divider's name, its `label`, or its `fallback-label` where that is empty. */
export const splitterName: Derivation = (props) => {
  const label = props.label
  return typeof label === 'string' && label !== '' ? label : String(props['fallback-label'] ?? '')
}
