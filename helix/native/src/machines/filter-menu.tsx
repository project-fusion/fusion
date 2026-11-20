/**
 * A menu that builds a filter, on a phone: a row for each `FilterField` it holds,
 * whose page offers the field's comparisons and checks its values, drawn from
 * Menu's own elements, as the web's menu draws them.
 *
 * **It holds what is ticked.** Each change asks `before-facet` with the field's
 * whole set and then says `facet`, the menu's own first and then the field's
 * around it, as the web's events bubble; a refusal anywhere keeps what was held.
 * A row's tick follows what the menu holds, so a refused change leaves it.
 */
import type { FacetDetail, FilterGrammarField } from '@fusion.dev/helix-core/filter-text'
import { type ReactNode, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { madeFor } from '../render/made'
import type { Family } from '../style/form'
import { fieldsIn } from './filter-input-fields'
import {
  appliedTo,
  type FilterInputAround,
  FilterInputContext,
  facetOf,
  operatorIn,
  type Picked,
  toggledValue,
} from './filter-menu-model'
import { wordsIn } from './listbox-hooks'
import { boundTo, given, type HelixEvent, tell, told } from './props'

/** The value a row stands for: what it changes, the field, and its own value. */
const rowValue = (kind: 'operator' | 'value', field: string, value: string): string =>
  JSON.stringify([kind, field, value])

/** A row's value read back, where it is one of the menu's. */
const readRow = (value: string): readonly [string, string, string] | undefined => {
  try {
    const read = JSON.parse(value) as unknown
    return Array.isArray(read) && read.length === 3 ? (read as [string, string, string]) : undefined
  } catch {
    return undefined
  }
}

/** Asks the menu's own handler, and then the field's around it, as the event bubbles. */
const asked = (
  family: Family,
  props: Props,
  use: MachineUse,
  around: FilterInputAround | undefined,
  facet: FacetDetail,
): boolean => {
  const before = boundTo(use, 'onBeforeFacet', 'event')
  if (before !== undefined && !tell(family, props, before, { ...facet })) {
    return false
  }
  if (around !== undefined && !around.hear('before-facet', facet)) {
    return false
  }
  const after = boundTo(use, 'onFacet', 'event')
  if (after !== undefined) {
    told(family, props, after, { ...facet })
  }
  around?.hear('facet', facet)
  return true
}

/** The rows of one field's page: its comparisons, a rule, and its values. */
const pageOf = (field: FilterGrammarField, picked: Picked | undefined): ReactNode[] => {
  const item = madeFor('helix-menu-item')
  const divider = madeFor('helix-divider')
  if (item === undefined) {
    return []
  }
  const using = operatorIn(field, picked?.operator)
  const offered = using?.arity === 'none' ? [] : field.values
  const ticked = new Set(picked?.values ?? [])
  const comparisons =
    field.operators.length > 1
      ? [
          <item.Component
            key="comparison"
            submenu={field.operators.map((one) => (
              <item.Component
                checkable
                checked={one.name === using?.name}
                exclusive
                key={one.name}
                value={rowValue('operator', field.name, one.name)}
              >
                {one.label}
              </item.Component>
            ))}
          >
            {using?.label ?? ''}
          </item.Component>,
          ...(offered.length > 0 && divider !== undefined
            ? [<divider.Component key="rule" />]
            : []),
        ]
      : []
  return [
    ...comparisons,
    ...offered.map((one) => (
      <item.Component
        checkable
        checked={ticked.has(one.value)}
        exclusive={using?.arity === 'one'}
        key={one.value}
        value={rowValue('value', field.name, one.value)}
      >
        {one.label}
      </item.Component>
    )),
  ]
}

/** Hosts a menu that builds a filter. */
export const useFilterMenu = (family: Family, props: Props, use: MachineUse): Behavior => {
  const around = useContext(FilterInputContext)
  const [picked, setPicked] = useState<ReadonlyMap<string, Picked>>(new Map())
  const fields = fieldsIn(props.children)
  const latest = useRef({ fields, picked, props })
  latest.current = { fields, picked, props }
  const apply = (field: string, values: readonly string[], operator?: string): boolean => {
    const now = latest.current
    const declared = now.fields.find((one) => one.name === field)
    if (declared === undefined) {
      return false
    }
    const next = appliedTo(declared, now.picked.get(field), values, operator)
    if (!asked(family, now.props, use, around, facetOf(declared, next))) {
      return false
    }
    const held = new Map(now.picked)
    held.set(field, next)
    latest.current = { ...now, picked: held }
    setPicked(held)
    return true
  }
  const applying = useRef(apply)
  applying.current = apply
  useLayoutEffect(
    () =>
      around?.join({
        apply: (field, values, operator) => applying.current(field, values, operator),
        fields: () => latest.current.fields.map((one) => one.name),
      }),
    [around],
  )
  const choose = (value: string): void => {
    const row = readRow(value)
    const declared = row === undefined ? undefined : fields.find((one) => one.name === row[1])
    if (row === undefined || declared === undefined) {
      return
    }
    const held = picked.get(row[1])
    if (row[0] === 'operator') {
      apply(row[1], held?.values ?? [], row[2])
    } else {
      apply(row[1], toggledValue(declared, held, row[2]))
    }
  }
  const read = (name: string): string =>
    wordsIn(given(family, props, boundTo(use, name, 'prop') ?? name))
  const label = read('label') || read('fallbackLabel')
  const item = madeFor('helix-menu-item')
  /* The fields the page passed are read, and their rows drawn in their place. */
  const rows =
    item === undefined
      ? []
      : fields.map((field) => (
          <item.Component key={field.name} submenu={pageOf(field, picked.get(field.name))}>
            {field.label}
          </item.Component>
        ))
  return {
    marks: [],
    parts: {
      menu: {
        view: {
          label,
          /* A tick follows what the menu holds, so the row keeps the one drawn. */
          onBeforeCheck: (event: HelixEvent) => event.preventDefault(),
          onSelect: (event: HelixEvent<{ readonly value: string }>) => choose(event.detail.value),
        },
      },
    },
    regions: { default: rows },
  }
}
