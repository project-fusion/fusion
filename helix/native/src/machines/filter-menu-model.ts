/**
 * What a menu that builds a filter holds and works out, with no element in it:
 * what is ticked for each field, the comparison in force, and the facet a change
 * announces, as the web's `FilterMenu` works them out.
 */
import type {
  FacetDetail,
  FilterGrammarField,
  FilterGrammarOperator,
} from '@fusion.dev/helix-core/filter-text'
import { createContext } from 'react'

/** What a menu holds for one field: the values ticked, and the comparison a reader chose. */
export interface Picked {
  readonly operator?: string
  readonly values: readonly string[]
}

/** The comparison in force: the one chosen, or the field's usual one, or its first. */
export const operatorIn = (
  field: FilterGrammarField,
  chosen: string | undefined,
): FilterGrammarOperator | undefined => {
  const usual = field.operators.find((one) => one.default) ?? field.operators[0]
  return chosen === undefined
    ? usual
    : (field.operators.find((one) => one.name === chosen) ?? usual)
}

/** The facet a field announces with what it now holds. */
export const facetOf = (field: FilterGrammarField, picked: Picked): FacetDetail => {
  const operator = operatorIn(field, picked.operator)
  return {
    arity: operator?.arity ?? 'many',
    field: field.name,
    label: field.label,
    operator: operator?.name ?? '',
    operatorLabel: operator?.default ? '' : (operator?.label ?? ''),
    values: picked.values,
  }
}

/**
 * What a field holds once a change is applied: the comparison named, or the usual
 * one again where nothing is left and none was named, and no values under a
 * comparison that takes none.
 */
export const appliedTo = (
  field: FilterGrammarField,
  held: Picked | undefined,
  values: readonly string[],
  operator?: string,
): Picked => {
  const chosen = operator ?? (values.length === 0 ? undefined : held?.operator)
  const arity = operatorIn(field, chosen)?.arity ?? 'many'
  return {
    ...(chosen === undefined ? {} : { operator: chosen }),
    values: arity === 'none' ? [] : values,
  }
}

/** The values a press on `value` leaves: one replaces another under a comparison of one. */
export const toggledValue = (
  field: FilterGrammarField,
  held: Picked | undefined,
  value: string,
): string[] => {
  const ticked = held?.values ?? []
  if (operatorIn(field, held?.operator)?.arity === 'one') {
    return ticked.length === 1 && ticked[0] === value ? [] : [value]
  }
  return ticked.includes(value) ? ticked.filter((one) => one !== value) : [...ticked, value]
}

/** A menu as the field around it reaches it: the fields it holds, and a change applied. */
export interface FieldPicker {
  readonly apply: (field: string, values: readonly string[], operator?: string) => boolean
  readonly fields: () => readonly string[]
}

/** What a field for filters offers the menus inside it. */
export interface FilterInputAround {
  /** Hears a facet a menu asks for and then says, as the web's events bubble to the field. */
  readonly hear: (event: 'before-facet' | 'facet', facet: FacetDetail) => boolean
  /** Joins a menu to the field, so a typed filter and a removed chip reach it. */
  readonly join: (picker: FieldPicker) => () => void
}

/** The field for filters around a menu. */
export const FilterInputContext = createContext<FilterInputAround | undefined>(undefined)
