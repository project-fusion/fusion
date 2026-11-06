/**
 * The columns of a table drawn from an array on a phone: their order as a
 * reader moved them, the ones hidden by a menu or by the page, and the ones a
 * table narrower than their `min-table-width` leaves out, as the web's
 * element works them out.
 */
import { droppedAt } from '@fusion.dev/helix-core/table'
import { useCallback, useMemo, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { columnsOf, type DataColumn, inOrder } from './data-table-model'
import { boundTo, given, tell } from './props'
import { useHeld } from './table-choice'

/**
 * The columns a table this wide leaves out, by each one's `min-table-width`,
 * as the web's `droppedAt` reads them: one always stays. A table not laid out
 * yet leaves none out, as a server's table serves every column.
 */
const droppedOf = (
  columns: readonly DataColumn[],
  width: number,
  rem: number,
): ReadonlySet<DataColumn> =>
  width <= 0 || !columns.some((column) => column.minimum !== '')
    ? new Set()
    : droppedAt(
        width,
        columns.map((column) => ({ column, minimum: column.minimum })),
        { em: rem, rem },
      )

/** The table's width in points, measured as it is laid out. */
export const useTableWidth = () => {
  const [width, setWidth] = useState(0)
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width)
    setWidth((was) => (was === next ? was : next))
  }, [])
  return { onLayout, width }
}

/** What the columns a reader arranged leave: their order, and the ones hidden or dropped. */
export const useArranged = (family: Family, props: Props, use: MachineUse, width: number) => {
  const { rem } = useTheme()
  const [order, setOrder] = useHeld(
    given(family, props, 'order'),
    given(family, props, 'default-order'),
  )
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const all = useMemo(() => columnsOf(props.children), [props.children])
  const arrangedColumns = inOrder(all, order)
  const hiddenOut = (column: DataColumn): boolean => column.hidden || hidden.has(column.field)
  const dropped = droppedOf(
    arrangedColumns.filter((column) => !hiddenOut(column)),
    width,
    rem,
  )
  const isOut = (column: DataColumn): boolean => hiddenOut(column) || dropped.has(column)
  const shown = arrangedColumns.filter((column) => !isOut(column))
  const moveColumn = (field: string, by: number): void => {
    const fields = shown.map((column) => column.field)
    const past = fields[fields.indexOf(field) + by]
    if (past === undefined) {
      return
    }
    const list = arrangedColumns.map((column) => column.field).filter((one) => one !== field)
    list.splice(list.indexOf(past) + (by > 0 ? 1 : 0), 0, field)
    const value = list.join(' ')
    const detail = {
      from: arrangedColumns.findIndex((column) => column.field === field),
      key: field,
      keys: list,
      kind: 'column',
      to: list.indexOf(field),
      value,
    }
    const before = boundTo(use, 'onBeforeReorder', 'event')
    if (before !== undefined && !tell(family, props, before, detail)) {
      return
    }
    setOrder(value)
    const after = boundTo(use, 'onReorder', 'event')
    if (after !== undefined) {
      tell(family, props, after, detail)
    }
  }
  const toggle = (field: string, hide: boolean): boolean => {
    const column = all.find((one) => one.field === field)
    const out = column !== undefined && hiddenOut(column)
    if (column === undefined || field === '' || out === hide || (hide && shown.length <= 1)) {
      return false
    }
    const detail = { field, hidden: hide }
    if (!tell(family, props, 'before-column-toggle', detail)) {
      return false
    }
    setHidden((was) => {
      const next = new Set(was)
      if (hide) {
        next.add(field)
      } else {
        next.delete(field)
      }
      return next
    })
    tell(family, props, 'column-toggle', detail)
    return true
  }
  return { all, arrangedColumns, hidden, isOut, moveColumn, shown, toggle }
}
