/**
 * A column's menu on a phone: its heading's button, and the rows the web's menu
 * holds, drawn from Menu's own elements, whose `select` a table reads as the web
 * reads it. A column in a `Table` has none, as on the web.
 */
import { parse } from '@fusion.dev/helix-core/table'
import { createContext, type ReactNode } from 'react'
import { View } from 'react-native'
import { madeFor } from '../render/made'

/** What a table offers the menus of its columns. */
export interface DataTableMenus {
  /** The fields of the columns drawn, in the order drawn. */
  readonly columns: readonly string[]
  readonly hide: (field: string) => void
  readonly move: (field: string, by: number) => void
  /** Whether columns move, `reorderable`. */
  readonly moves: boolean
  readonly restorable: readonly string[]
  readonly restore: (fields: readonly string[]) => void
  /** The words a table prop says. */
  readonly says: (name: string) => string
  readonly sort: string
  readonly sortTo: (field: string, direction: 'asc' | 'desc') => void
}

/** The table around a column. */
export const DataTableMenuContext = createContext<DataTableMenus | undefined>(undefined)

/** A column as its menu reads it. */
export interface MenuColumn {
  readonly field: string
  /** The words that name the button. */
  readonly label: string
  /** Whether the table may order it. */
  readonly moves: boolean
  readonly sorts: boolean
}

/** A menu's box on the heading's line. */
const CENTERED = { alignSelf: 'center' } as const

/** Does what a row of the menu says. */
const choose = (menus: DataTableMenus, field: string, value: string): void => {
  if (value === 'ascending' || value === 'descending') {
    menus.sortTo(field, value === 'ascending' ? 'asc' : 'desc')
  } else if (value === 'left' || value === 'right') {
    menus.move(field, value === 'left' ? -1 : 1)
  } else if (value === 'hide') {
    menus.hide(field)
  } else if (value === 'restore') {
    menus.restore(menus.restorable)
  }
}

/** The menu of a column: its button, and each group of its rows. */
export const drawMenu = (menus: DataTableMenus, column: MenuColumn): ReactNode => {
  const menu = madeFor('helix-menu')
  const item = madeFor('helix-menu-item')
  const divider = madeFor('helix-divider')
  const button = madeFor('helix-icon-button')
  const icon = madeFor('helix-icon')
  if (menu === undefined || item === undefined || button === undefined) {
    return null
  }
  const { field } = column
  const spec = parse(menus.sort)
  const at = menus.columns.indexOf(field)
  const row = (value: string, label: string, disabled = false, checked?: boolean): ReactNode => (
    <item.Component
      checked={checked ?? false}
      disabled={disabled}
      exclusive={checked !== undefined}
      key={value}
      value={value}
    >
      {label}
    </item.Component>
  )
  const groups: ReactNode[][] = [
    column.sorts
      ? [
          row(
            'ascending',
            menus.says('sortAscendingLabel'),
            false,
            spec?.field === field && spec.direction === 'asc',
          ),
          row(
            'descending',
            menus.says('sortDescendingLabel'),
            false,
            spec?.field === field && spec.direction === 'desc',
          ),
        ]
      : [],
    column.moves
      ? [
          row('left', menus.says('moveLeftLabel'), menus.columns[at - 1] === undefined),
          row('right', menus.says('moveRightLabel'), menus.columns[at + 1] === undefined),
        ]
      : [],
    [
      row('hide', menus.says('hideColumnLabel'), menus.columns.length <= 1),
      ...(menus.restorable.length > 0 ? [row('restore', menus.says('showColumnsLabel'))] : []),
    ],
  ].filter((group) => group.length > 0)
  /* A Menu draws no box of its own, and its trigger stands at the start of its line,
     so a box of this one's holds it on the line of the heading's words. */
  return (
    <View style={CENTERED}>
      <menu.Component
        label={column.label}
        onBeforeCheck={(event: { preventDefault: () => void }) => event.preventDefault()}
        onSelect={(event: { readonly detail: { readonly value: string } }) =>
          choose(menus, field, event.detail.value)
        }
        trigger={
          <button.Component label={column.label}>
            {icon === undefined ? null : <icon.Component name="dots-three" />}
          </button.Component>
        }
      >
        {groups.flatMap((group) => {
          const first = group[0] as { readonly key: string }
          return [
            ...(first === (groups[0]?.[0] as unknown) || divider === undefined
              ? []
              : [<divider.Component key={`line-${first.key}`} />]),
            ...group,
          ]
        })}
      </menu.Component>
    </View>
  )
}
