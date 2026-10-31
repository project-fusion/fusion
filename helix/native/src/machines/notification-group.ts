/**
 * The machine a group of notifications runs on a phone: the rows written in it, and
 * which of them it draws while it is folded.
 */
import {
  createContext,
  createElement,
  type ReactNode,
  type Ref,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { FeedContext, type RowOrder, useRowOrder } from './notifications'
import { boundTo, given } from './props'
import type { Turned } from './toggle'

/** What a group offers the rows written in it. */
export interface GroupOffer extends RowOrder {
  /** The row it draws while folded. */
  readonly first: object | undefined
  /** Whether it is folded. */
  readonly folded: boolean
}

/** The group a row stands in. */
export const GroupContext = createContext<GroupOffer | undefined>(undefined)

/** Hosts a group of notifications. */
export const useNotificationGroup = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const { changed, epoch, report, rows } = useRowOrder()
  const collapsible = read('collapsible') === true
  const open = toggled?.checked === true
  const folded = collapsible && !open
  const first = rows[0]?.key
  const offer = useMemo<GroupOffer>(
    () => ({ changed, epoch, first, folded, report }),
    [changed, epoch, first, folded, report],
  )
  const now = useRef({ collapsible, open, toggled })
  now.current = { collapsible, open, toggled }
  const joinGroup = useContext(FeedContext)?.joinGroup
  useLayoutEffect(
    () =>
      joinGroup?.({
        collapsible: () => now.current.collapsible,
        open: () => now.current.open,
        request: (next) => {
          if (next !== now.current.open) {
            now.current.toggled?.turn()
          }
        },
      }),
    [joinGroup],
  )
  useImperativeHandle(
    props.ref as Ref<unknown> | undefined,
    () => ({
      get items() {
        return rows
      },
      requestOpen: (next: boolean) => {
        if (next !== now.current.open) {
          now.current.toggled?.turn()
        }
      },
    }),
    [rows],
  )
  const count = read('count')
  const counted = typeof count === 'number' ? count : rows.length
  return {
    marks: open ? ['open'] : [],
    parts: {
      host: {
        states: { [boundTo(use, 'countWords', 'state') ?? 'countWords']: String(counted) },
      },
    },
    provide: (held: ReactNode) => createElement(GroupContext.Provider, { value: offer }, held),
  }
}
