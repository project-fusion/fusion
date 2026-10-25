/**
 * Accordion's derivations: where a section's chevron stands, from its
 * `chevron-placement`, as the web element draws it.
 */
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'

/** `accordion-chevron-start`: whether the chevron leads the summary. */
export const accordionChevronIsStart: Derivation = (props) =>
  textOf(props['chevron-placement']) === 'start'

/** `accordion-chevron-none`: whether the section draws no chevron. */
export const accordionChevronIsNone: Derivation = (props) =>
  textOf(props['chevron-placement']) === 'none'
