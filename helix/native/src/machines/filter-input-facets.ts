/**
 * What a field for filters does with a facet, a token's request to go, and a key:
 * a facet goes to the menu that holds its field, or is the field's own to ask and
 * say, and a typed filter is read into facets on Return.
 */
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  type FacetDetail,
  type FilterGrammarField,
  readFilterText,
} from '@fusion.dev/helix-core/filter-text'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { tokenTarget } from './filter-input-tokens'
import type { FieldPicker } from './filter-menu-model'
import { boundTo, type HelixEvent, tell, told } from './props'

/** Asks the field's own `before-facet`, or says its `facet`, and answers whether it stood. */
export const facetTold =
  (family: Family, props: Props, use: MachineUse) =>
  (kind: 'before-facet' | 'facet', facet: FacetDetail): boolean => {
    const name = boundTo(use, kind === 'facet' ? 'onFacet' : 'onBeforeFacet', 'event')
    if (name === undefined) {
      return true
    }
    if (kind === 'facet') {
      told(family, props, name, { ...facet })
      return true
    }
    return tell(family, props, name, { ...facet })
  }

/** The chips `chips` holds once a facet stands: one for each field filtered. */
export const chipsAfter = (held: readonly FacetDetail[], facet: FacetDetail): FacetDetail[] => {
  const rest = held.filter((one) => one.field !== facet.field)
  return facet.values.length === 0 && facet.arity !== 'none' ? rest : [...rest, facet]
}

/** A field filtered by nothing, under its usual comparison. */
export const emptyFacet = (field: FilterGrammarField): FacetDetail => {
  const usual = field.operators.find((one) => one.default) ?? field.operators[0]
  return {
    arity: usual?.arity ?? 'many',
    field: field.name,
    label: field.label,
    operator: usual?.name ?? '',
    operatorLabel: '',
    values: [],
  }
}

/** What a facet is handed to: the menus joined to the field, and the field's own events. */
export interface Facets {
  readonly heard: (kind: 'before-facet' | 'facet', facet: FacetDetail) => boolean
  readonly pickers: ReadonlySet<FieldPicker>
}

/** Applies a facet through the menu that holds its field, or asks and says it as the field's own. */
export const announced = (facets: Facets, facet: FacetDetail): boolean => {
  const picker = [...facets.pickers].find((one) => one.fields().includes(facet.field))
  if (picker !== undefined) {
    return picker.apply(facet.field, facet.values, facet.operator)
  }
  if (!facets.heard('before-facet', facet)) {
    return false
  }
  facets.heard('facet', facet)
  return true
}

/** What a token's request to go reads of the field. */
export interface Going {
  readonly announce: (facet: FacetDetail) => boolean
  readonly family: Family
  readonly fields: readonly FilterGrammarField[]
  readonly props: Props
  readonly use: MachineUse
}

/**
 * A token's request to go. **A chip naming a declared field is the field filtered by
 * nothing**, as the web's field takes it on its way down; any other token's request
 * is heard by the token's own handler and then by the field's `dismiss`.
 */
export const goneWith =
  (going: Going) =>
  (token: Readonly<Record<string, unknown>>, asked: HelixEvent): void => {
    const name = typeof token.name === 'string' ? token.name : ''
    const declared = going.fields.find((one) => name !== '' && one.name === name)
    if (declared !== undefined) {
      going.announce(emptyFacet(declared))
      return
    }
    if (typeof token.onDismiss === 'function') {
      token.onDismiss(asked)
    }
    const event = boundTo(going.use, 'onDismiss', 'event')
    if (asked.defaultPrevented || event === undefined) {
      return
    }
    if (!tell(going.family, going.props, event, { ...asked.detail }, tokenTarget(token) as never)) {
      asked.preventDefault()
    }
  }

/**
 * Reads the typed filters against the fields, announces each, and answers the text
 * left: what was not a filter, and what a refusal kept.
 */
export const readFilters = (
  text: string,
  fields: readonly FilterGrammarField[],
  announce: (facet: FacetDetail) => boolean,
): string | undefined => {
  if (fields.length === 0) {
    return undefined
  }
  const reading = readFilterText(text, fields)
  const refused = reading.terms.filter((one) => !announce(one.facet)).flatMap((one) => one.written)
  return refused.length === reading.terms.length
    ? undefined
    : [...refused, reading.text].filter(Boolean).join(' ')
}

/** What a key on the field reads of it. */
export interface KeyNow {
  readonly clear: () => void
  readonly close: () => void
  readonly list: ((press: KeyPress) => boolean) | undefined
  readonly open: boolean
  readonly read: () => boolean
  readonly text: string
}

/** The keys that move in the list while it is open. */
const LISTED = new Set(['ArrowDown', 'ArrowUp', 'End', 'Enter', 'Home'])

/**
 * A hardware key on the field: Escape closes the list, or empties the text where it
 * is closed; the list's keys go to the list while it is open; Return reads the text.
 */
export const fieldKey = (press: KeyPress, now: KeyNow): boolean => {
  if (press.key === 'Escape') {
    if (now.open) {
      now.close()
    } else if (now.text !== '') {
      now.clear()
    }
    return now.open || now.text !== ''
  }
  if (now.open && LISTED.has(press.key)) {
    return now.list?.(press) === true
  }
  return press.key === 'Enter' && now.read()
}

/** Return, as a phone's keyboard sends it on submit. */
export const RETURN = {
  alt: false,
  control: false,
  key: 'Enter',
  meta: false,
  shift: false,
} as KeyPress
