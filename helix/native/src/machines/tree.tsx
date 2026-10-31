/**
 * The machine a tree runs on a phone: it holds what is chosen, and the items
 * join it through a context, wherever they stand.
 *
 * **The web element walks its own items.** A phone has no document to walk, so
 * each item says which item it stands in, as it draws. The order among siblings
 * is the order those draws ran in, which is the order the page wrote them in,
 * so an item the page moves takes its place with no word about it.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { Typeahead } from '@fusion.dev/helix-core/tree'
import { createContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { carryIntoLayers } from '../render/carry'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'
import { treeKey } from './tree-keys'
import { chosen, drop, focusOn, type Held, type Latest, moveTo, pickUp } from './tree-moves'
import {
  type Facts,
  factsOf,
  ROOT,
  type Rows,
  settled,
  siblingsOf,
  type TreeRow,
} from './tree-rows'

export type { Facts, TreeRow } from './tree-rows'

/** What a tree offers the items that join it. */
export interface TreeOffer {
  /** Tells the tree's consumer an event an item sent, and answers whether it stood. */
  readonly bubble: (event: string, detail: Readonly<Record<string, unknown>>) => boolean
  /** Where a chevron stands. */
  readonly chevron: string
  /** Hears a grip's drag: its start, its travel along the column, and its end. */
  readonly drag: {
    readonly end: (dropped: boolean) => void
    readonly move: (travel: number) => void
    readonly start: (row: object) => void
  }
  /** What the tree says of an item. */
  readonly facts: (row: object) => Facts | undefined
  /** Tells the tree focus reached an item. */
  readonly focused: (row: object) => void
  /** Whether a branch only opens and closes as it is pressed. */
  readonly heads: boolean
  /** Hears the latest of an item. */
  readonly hold: (row: TreeRow) => void
  /** Hands the tree a key pressed on an item, and answers whether it took it. */
  readonly key: (row: object, press: KeyPress) => boolean
  /** Tells the tree an item left. */
  readonly leave: (row: object) => void
  /** Moves an item a place among its siblings, as a screen reader's action does. */
  readonly move: (row: object, by: number) => void
  /** Whether a reader checks many. */
  readonly multiple: boolean
  /** What a deeper level means. */
  readonly nesting: string
  /** Asks to pick up an item, or to put it down where it was picked up. */
  readonly pick: (row: object) => void
  /** Whether a held item waited for a press on an item, which took this one. */
  readonly pressed: (row: object) => boolean
  /** Whether a reader can move items. */
  readonly reorderable: boolean
  /** Tells the tree an item's choice stood. */
  readonly selected: (row: object) => void
  /** Asks the tree to work out again what it says of its items. */
  readonly settle: () => void
}

/** The tree an item stands in. */
export const TreeContext = createContext<TreeOffer | undefined>(undefined)

/** The item an item stands in, and its level. */
export const TreeParent = createContext<
  { readonly key: object; readonly level: number } | undefined
>(undefined)

carryIntoLayers(TreeContext)

/** Takes an item's latest in, and the place it drew in. */
const holdRow = (rows: Rows, row: TreeRow): void => {
  rows.rows.set(row.key, row)
  const parent = row.parent ?? ROOT
  const pass = rows.pass.get(parent)
  if (pass === undefined) {
    rows.pass.set(parent, [row.key])
  } else if (!pass.includes(row.key)) {
    pass.push(row.key)
  }
}

/**
 * Lets an item go. **Focus that was on it moves to the item after it among its
 * siblings, or the one before, or its parent**, so focus stays in the tree.
 */
const leaveRow = (rows: Rows, key: object): void => {
  const parent = rows.rows.get(key)?.parent ?? ROOT
  rows.rows.delete(key)
  rows.kids.delete(key)
  const kids = rows.kids.get(parent) ?? []
  const at = kids.indexOf(key)
  if (at >= 0) {
    kids.splice(at, 1)
  }
  if (rows.stop === key && focus().focused() === null) {
    const beside = [kids[at], kids[at - 1], parent].flatMap((one) => {
      const row = one === undefined ? undefined : rows.rows.get(one)
      return row === undefined ? [] : [row]
    })
    focusOn(rows, beside[0])
  }
}

/** A press on a row while an item is held drops it there, among its siblings. */
const dropOn = (held: Held, key: object): boolean => {
  const { rows } = held
  const hold = rows.hold
  const row = rows.rows.get(key)
  const moved = hold === undefined ? undefined : rows.rows.get(hold.key)
  if (hold === undefined || row === undefined || moved === undefined) {
    return false
  }
  const to = siblingsOf(rows, moved).indexOf(row)
  if (to >= 0) {
    rows.hold = { ...hold, to }
    drop(held, true)
  }
  return true
}

/** A grip's drag reached `travel` along the column. */
const dragged = ({ rows, schedule }: Held, travel: number): void => {
  const hold = rows.hold
  const row = hold === undefined ? undefined : rows.rows.get(hold.key)
  if (hold === undefined || row === undefined) {
    return
  }
  const to = row.travel(travel, siblingsOf(rows, row), hold.from)
  if (to !== hold.to) {
    rows.hold = { ...hold, to }
    schedule()
  }
}

/** What a tree offers that holds across its draws. */
const lasting = (
  held: Held,
  typeahead: Typeahead,
): Omit<TreeOffer, 'chevron' | 'heads' | 'multiple' | 'nesting' | 'reorderable'> => {
  const { latest, rows, schedule } = held
  const reorders = (): boolean => {
    const now = latest.current
    return given(now.family, now.props, boundTo(now.use, 'reorderable', 'prop')) === true
  }
  return {
    bubble: (event, detail) => tell(latest.current.family, latest.current.props, event, detail),
    drag: {
      end: (dropped) => drop(held, dropped),
      move: (travel) => dragged(held, travel),
      start: (key) => pickUp(held, key),
    },
    facts: (key) => rows.facts.get(key),
    focused: (key) => {
      if (rows.stop !== key) {
        rows.stop = key
        schedule()
      }
    },
    hold: (row) => {
      holdRow(rows, row)
      schedule()
    },
    key: (key, press) => {
      const row = rows.rows.get(key)
      const took = row !== undefined && treeKey(held, row, press, typeahead, reorders())
      schedule()
      return took
    },
    leave: (key) => {
      leaveRow(rows, key)
      schedule()
    },
    move: (key, by) => {
      const row = rows.rows.get(key)
      if (row !== undefined) {
        moveTo(held, row, siblingsOf(rows, row).indexOf(row) + by)
      }
    },
    pick: (key) => {
      if (rows.hold?.key === key) {
        drop(held, true)
      } else {
        pickUp(held, key)
      }
    },
    pressed: (key) => dropOn(held, key),
    selected: (key) => chosen(held, key),
    settle: schedule,
  }
}

/** Nothing held yet. */
const noRows = (): Rows => ({
  anchor: undefined,
  facts: new Map(),
  hold: undefined,
  kids: new Map(),
  pass: new Map(),
  rows: new Map(),
  stop: undefined,
})

/**
 * What is chosen: what the page writes, once it writes a new value, and between
 * writes what a reader last chose, as on the web.
 */
const useActive = (
  family: Family,
  props: Props,
  use: MachineUse,
): readonly [string, (next: string) => void] => {
  const written = props.active
  const seed = given(family, props, boundTo(use, 'defaultActive', 'prop'))
  const [held, setHeld] = useState(() =>
    typeof written === 'string' ? written : String(seed ?? ''),
  )
  const [seen, setSeen] = useState(written)
  if (seen !== written) {
    setSeen(written)
    if (typeof written === 'string') {
      setHeld(written)
    }
  }
  return [held, setHeld]
}

/**
 * Hosts a tree: what is chosen, the items that have joined and what each is,
 * and the keys and the moves of the items.
 */
export const useTree = (family: Family, props: Props, use: MachineUse): Behavior => {
  const [active, setActive] = useActive(family, props, use)
  const mode = given(family, props, boundTo(use, 'selectionMode', 'prop'))
  const nesting = String(given(family, props, boundTo(use, 'nesting', 'prop')) ?? 'peer')
  const reorderable = given(family, props, boundTo(use, 'reorderable', 'prop')) === true
  const chevron = String(given(family, props, boundTo(use, 'chevronPlacement', 'prop')) ?? 'start')
  const latest = useRef<Latest>({ active, family, mode, props, use })
  latest.current = { active, family, mode, props, use }
  const rows = useRef<Rows>(noRows()).current
  const [, redraw] = useState(0)
  const [empty, setEmpty] = useState(false)
  const scheduled = useRef(false)
  const typeahead = useRef(new Typeahead()).current
  const offer = useMemo(() => {
    const settle = (): void => {
      scheduled.current = false
      const now = latest.current
      const facts = factsOf(rows, now.active, now.mode === 'multiple')
      if (settled(rows, facts)) {
        rows.facts = facts
        redraw((at) => at + 1)
      }
      setEmpty(rows.rows.size === 0)
    }
    const schedule = (): void => {
      if (!scheduled.current) {
        scheduled.current = true
        void Promise.resolve().then(settle)
      }
    }
    return lasting({ latest, rows, schedule, setActive }, typeahead)
  }, [rows, setActive, typeahead])
  /* What each item reads is worked out once the items have said what they are,
     and again as what is chosen moves. */
  useLayoutEffect(() => {
    offer.settle()
  })
  /* A new object each draw, since `facts` reads what is new while it stays one function. */
  const drawn: TreeOffer = {
    ...offer,
    chevron,
    heads: nesting === 'heading' || mode === 'leaf',
    multiple: mode === 'multiple',
    nesting,
    reorderable,
  }
  const empties = boundTo(use, 'empty', 'state') ?? 'empty'
  return {
    marks: [],
    parts: { host: { states: { [empties]: empty } } },
    provide: (inside) => <TreeContext.Provider value={drawn}>{inside}</TreeContext.Provider>,
  }
}
