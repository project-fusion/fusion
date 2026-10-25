import {
  backOf,
  depthOf,
  enterOf,
  labelOf,
  pathOf,
  rowsOn,
  type StackTree,
} from '@fusion.dev/helix-core/stack'
import {
  type Context,
  createContext,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import { carryIntoLayers } from '../render/carry'
import type { Family, Node } from '../style/form'
import type { Binder } from './binder'
import { valued } from './gives'
import { boundTo, camel, senderOf, tell } from './props'

/** A row of a stack, as it registers: what the stack's tree reads of it. */
export interface StackRow {
  /** Moves focus to the row's press, and says whether it was drawn to take it. */
  readonly focus: () => boolean
  /** Whether it holds a page of its own. */
  readonly hasPage: boolean
  /** The row whose page holds it, or `null` on the top page. */
  readonly parent: object | null
  readonly value: string
  /** Its words, which name its page. */
  readonly words: string
}

/** What a stack offers its rows. */
export interface StackOffer {
  /** Goes back one page, after the stack's event stands, and answers whether there was a page to leave. */
  readonly back: () => boolean
  /** The row whose page is showing, or `null` for the top page. */
  readonly current: object | null
  /**
   * Tells the stack the press of the row known by `key` is drawn, which
   * takes focus where a move was waiting for it, as the rows a layer holds
   * are drawn a turn after the stack moves.
   */
  readonly drawn: (key: object) => void
  /** Shows the page of the row known by `key`, after the stack's event stands. */
  readonly enter: (key: object) => void
  readonly leave: (key: object) => void
  /** The rows from the top page's down to the one whose page is showing. */
  readonly path: ReadonlySet<object>
  readonly place: (key: object, row: StackRow) => void
  /**
   * What the stack writes on each row it draws as a row, by the row's prop,
   * as its form's `writes` says: a drilldown's rows are `listed` under
   * `navigation`.
   */
  readonly writes: Readonly<Record<string, boolean | string>>
}

/* One context per stack, by the name its rows join it by, made once. */
const made = new Map<string, Context<StackOffer | undefined>>()

/** The context a stack offers itself through, by the name its rows join it by. */
export const stackOf = (name: string): Context<StackOffer | undefined> => {
  let found = made.get(name)
  if (found === undefined) {
    found = createContext<StackOffer | undefined>(undefined)
    made.set(name, found)
    carryIntoLayers(found)
  }
  return found
}

/** The row whose page holds what is drawn here, which a row gives the rows inside its page. */
export const StackParent = createContext<object | null>(null)
carryIntoLayers(StackParent)

/** Core's tree over the rows that registered, by the key each registered with. */
const treeOf = (rows: ReadonlyMap<object, StackRow>): StackTree<object> => ({
  hasPage: (row) => rows.get(row)?.hasPage === true,
  labelOf: (row) => rows.get(row)?.words ?? '',
  parentOf: (row) => rows.get(row)?.parent ?? null,
  present: (row) => {
    for (let at: object | null = row; at !== null; at = rows.get(at)?.parent ?? null) {
      if (!rows.has(at)) {
        return false
      }
    }
    return true
  },
  rowsOf: (page) => [...rows].filter(([, one]) => one.parent === page).map(([key]) => key),
})

/**
 * **The page prop shows the page of the row with its value**, each time it
 * is written, once that row has registered, and the top page where it is
 * empty.
 */
const usePageProp = (
  rows: ReadonlyMap<object, StackRow>,
  written: unknown,
  show: (row: object | null) => void,
): void => {
  const applied = useRef<unknown>(undefined)
  useLayoutEffect(() => {
    if (typeof written !== 'string' || applied.current === written) {
      return
    }
    const found = [...rows].find(([, row]) => row.value === written && row.hasPage)
    if (found !== undefined || written === '') {
      applied.current = written
      show(found?.[0] ?? null)
    }
  })
}

/** The way the last move went, and how many moves there have been. */
interface Moved {
  readonly count: number
  readonly way: 'back' | 'forward' | undefined
}

/** What the stack's binding names of the values and the states it gives. */
interface Naming {
  readonly drilled: string | undefined
  readonly entered: string | undefined
  readonly labeled: string | undefined
  readonly left: string | undefined
  /** The top page's words, where the stack names a prop for them. */
  readonly top: string
}

/** The values a stack computes as it stands, by the names its binding gives them. */
const computedOf = (
  tree: StackTree<object>,
  here: object | null,
  moved: Moved,
  names: Naming,
): { readonly marks: string[]; readonly states: Record<string, boolean | string> } => {
  const below = depthOf(tree, here) > 0
  const states: Record<string, boolean | string> = {}
  const marks: string[] = []
  if (names.drilled !== undefined) {
    states[names.drilled] = below
    if (below) {
      marks.push(names.drilled)
    }
  }
  if (names.labeled !== undefined) {
    states[names.labeled] = below ? labelOf(tree, here) : names.top
  }
  for (const [state, way] of [
    [names.entered, 'forward'],
    [names.left, 'back'],
  ] as const) {
    if (state !== undefined) {
      states[state] = moved.way === way
      if (moved.way === way) {
        marks.push(state)
      }
    }
  }
  return { marks, states }
}

/** The part a tree draws the `default` region in: the part that holds a stack's rows. */
const holderOf = (nodes: readonly Node[] | undefined, inside?: string): string | undefined => {
  for (const node of nodes ?? []) {
    if (node.kind === 'region' && node.name === 'default') {
      return inside
    }
    const part = node.kind === 'when' || node.kind === 'region' ? inside : node.name
    const found = holderOf(node.children, part)
    if (found !== undefined) {
      return found
    }
  }
  return undefined
}

/** The row a move waits to put focus on: the first of the page showing, or the row it names. */
const landingOn = (
  waiting: object | 'first' | undefined,
  rows: ReadonlyMap<object, StackRow>,
  current: object | null,
): object | undefined => (waiting === 'first' ? rowsOn(treeOf(rows), current)[0] : waiting)

/**
 * Hosts a stack of pages, as a drilldown shows one page at a time, bound as
 * the expansion binds `stack`: the press that goes back, the event a move
 * asks first, the values it computes, and the prop that holds the page
 * showing.
 *
 * **The rows register with their parent**, the row whose page holds them,
 * so the stack has the tree core's `stack` walks, as the web's
 * `DrilldownController` walks the document. It holds the one row whose
 * page is showing, and a row taken away takes its page with it.
 *
 * **A move asks first**: the stack's `before` event, its `value` the row
 * whose page would show, empty for the top page, and a refusal keeps the
 * page showing. Going in moves focus to the first row of the page, and going
 * back to the row whose page was left, as on the web. Writing the page prop
 * shows the page of the row with that value, or the top page.
 *
 * The element is in the `drilled` value its stack names while a page below
 * the top is showing, and its `label` value holds the page's words, or the
 * words of its `top` prop on the top page. It is in its `entered` state
 * once a move has gone into a page and its `left` state once one has gone
 * back, and the part that holds the rows starts its motion again with each
 * move, as the web's drilldown writes its direction anew. **It writes each
 * row it draws as a row the props its form's `writes` names**, from its own.
 */
export const stacking = (family: Family, use: MachineUse): Binder => {
  const writes = Object.entries(family.api?.stack?.writes ?? {})
  const before = boundTo(use, 'before', 'event')
  const drilled = boundTo(use, 'drilled', 'state')
  const labeled = boundTo(use, 'label', 'state')
  const pageProp = boundTo(use, 'page', 'prop')
  const topProp = boundTo(use, 'top', 'prop')
  const backPart = boundTo(use, 'back', 'part')
  const entered = boundTo(use, 'entered', 'state')
  const left = boundTo(use, 'left', 'state')
  /* **The part that holds the rows starts its motion again with each move**,
     where the stack names the states a move leaves, as the web's drilldown
     writes its direction anew so a page slides in each time. */
  const holder = entered === undefined && left === undefined ? undefined : holderOf(family.tree)
  const Offered = stackOf(family.name)
  return (props, around) => {
    const rows = useRef(new Map<object, StackRow>()).current
    const [current, setCurrent] = useState<object | null>(null)
    const [moved, setMoved] = useState<Moved>({ count: 0, way: undefined })
    const [version, redraw] = useState(0)
    const tree = treeOf(rows)
    const latest = useRef({ current, props })
    latest.current = { current, props }
    /* The row focus moves to once the page it lands on is drawn. */
    const landing = useRef<object | 'first' | undefined>(undefined)
    const asks = useCallback(
      (to: object | null) =>
        before === undefined ||
        tell(
          family,
          latest.current.props,
          before,
          { value: to === null ? '' : (rows.get(to)?.value ?? '') },
          senderOf(family, ''),
        ),
      [rows],
    )
    const enter = useCallback(
      (key: object) => {
        const to = enterOf(treeOf(rows), key)
        if (to !== undefined && asks(to)) {
          landing.current = 'first'
          setCurrent(to)
          setMoved((was) => ({ count: was.count + 1, way: 'forward' }))
        }
      },
      [asks, rows],
    )
    const back = useCallback(() => {
      const leaving = latest.current.current
      const { moved, to } = backOf(treeOf(rows), leaving)
      if (!moved || !asks(to)) {
        return false
      }
      landing.current = leaving ?? undefined
      setCurrent(to)
      setMoved((was) => ({ count: was.count + 1, way: 'back' }))
      return true
    }, [asks, rows])
    const place = useCallback(
      (key: object, row: StackRow) => {
        const was = rows.get(key)
        rows.set(key, row)
        if (was?.hasPage !== row.hasPage || was?.parent !== row.parent) {
          redraw((count) => count + 1)
        }
      },
      [rows],
    )
    const leave = useCallback(
      (key: object) => {
        rows.delete(key)
        redraw((count) => count + 1)
      },
      [rows],
    )
    /* Focus lands on the row a move waits for once it is drawn: at once, or
       as its press is drawn later. */
    const land = useCallback(
      (drawnNow?: object) => {
        const target = landingOn(landing.current, rows, latest.current.current)
        if (target === undefined || (drawnNow !== undefined && target !== drawnNow)) {
          return
        }
        if (rows.get(target)?.focus() === true) {
          landing.current = undefined
        }
      },
      [rows],
    )
    // biome-ignore lint/correctness/useExhaustiveDependencies: focus lands once the page it lands on is drawn.
    useLayoutEffect(() => {
      land()
    }, [current])
    usePageProp(rows, pageProp === undefined ? undefined : props[camel(pageProp)], setCurrent)
    const here = tree.present(current ?? {}) ? current : null
    // biome-ignore lint/correctness/useExhaustiveDependencies: the tree changes as rows register, which `version` counts.
    const path = useMemo(() => new Set(pathOf(tree, here)), [here, version])
    if (backPart !== undefined) {
      around.stacked.back = { go: back, part: backPart }
    }
    around.stacked.leave = back
    const written = JSON.stringify(writes.map(([row, prop]) => [row, valued(family, props, prop)]))
    const offer = useMemo<StackOffer>(
      () => ({
        back,
        current: here,
        drawn: land,
        enter,
        leave,
        path,
        place,
        writes: Object.fromEntries(JSON.parse(written) as [string, boolean | string][]),
      }),
      [back, enter, here, land, leave, path, place, written],
    )
    const top = valued(family, props, topProp)
    const { marks, states } = computedOf(tree, here, moved, {
      drilled,
      entered,
      labeled,
      left,
      top: typeof top === 'string' ? top : '',
    })
    const restarts =
      holder === undefined
        ? {}
        : {
            [holder]: { runs: moved.count },
          }
    return {
      marks,
      parts: { host: { states }, ...restarts },
      provide: (drawn: ReactNode) => (
        <Offered.Provider value={offer}>
          <StackParent.Provider value={null}>{drawn}</StackParent.Provider>
        </Offered.Provider>
      ),
    }
  }
}
