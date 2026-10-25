import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import { type ReactNode, useCallback, useContext, useLayoutEffect, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { PartBinding } from '../render/behavior'
import { holdsContent } from '../render/computed'
import type { Family, Node } from '../style/form'
import type { Binder } from './binder'
import { boundTo, camel, given } from './props'
import { type StackOffer, StackParent, stackOf } from './stack'
import { wordsOf } from './words'

/** Nothing drawn, as a part of a row that is off the page showing draws. */
const NOTHING_DRAWN = (): ReactNode => null

/** Whether `nodes` hold the region named `page`. */
const holds = (nodes: readonly Node[] | undefined, page: string): boolean =>
  (nodes ?? []).some(
    (node) => (node.kind === 'region' && node.name === page) || holds(node.children, page),
  )

/**
 * The parts of a row's tree that do not hold its page: what a row whose
 * page is showing, or holds the page showing, draws nothing of.
 */
const besidePage = (nodes: readonly Node[] | undefined, page: string): string[] =>
  (nodes ?? []).flatMap((node) => {
    if (node.kind === 'region' && node.name === page) {
      return []
    }
    return holds(node.children, page) ? besidePage(node.children, page) : [node.name]
  })

/** What a key on a row does in its stack: go into its page, go back, or nothing. */
const moveOf = (press: KeyPress, hasPage: boolean): 'back' | 'enter' | undefined => {
  if (press.alt || press.control || press.meta || press.shift) {
    return undefined
  }
  const rtl = environment().read().direction === 'rtl'
  const inward = rtl ? 'ArrowLeft' : 'ArrowRight'
  const outward = rtl ? 'ArrowRight' : 'ArrowLeft'
  if (press.key === inward && hasPage) {
    return 'enter'
  }
  return press.key === outward || press.key === 'Escape' ? 'back' : undefined
}

/** What a row's keys read as they are pressed. */
interface Latest {
  readonly hasPage: boolean
  readonly offer: StackOffer | undefined
}

/**
 * The ref a row's press takes, which hears the keys that move through the
 * stack on it, and the view it holds once drawn.
 */
const useRowKeys = (key: object, latest: { readonly current: Latest }) => {
  const node = useRef<unknown>(null)
  const listening = useRef<Stop | undefined>(undefined)
  const keep = useCallback(
    (next: unknown) => {
      listening.current?.()
      listening.current = undefined
      node.current = next
      if (next !== null) {
        listening.current = keys().listen(next, (press) => {
          const now = latest.current
          const move = moveOf(press, now.hasPage)
          if (move === 'enter') {
            now.offer?.enter(key)
            return now.offer !== undefined
          }
          return move === 'back' && now.offer?.back() === true
        })
        latest.current.offer?.drawn(key)
      }
    },
    [key, latest],
  )
  const focusRow = useCallback(() => {
    if (node.current === null) {
      return false
    }
    focus().focus(node.current, false)
    return true
  }, [])
  return { focusRow, keep }
}

/**
 * What a row draws of its parts as the stack stands: its press's ref, and
 * nothing of the parts beside its page while its page is on the path, or of
 * anything while it is off the page showing.
 */
const drawnParts = (
  offer: StackOffer,
  row: {
    readonly beside: readonly string[]
    readonly chooser: string | undefined
    readonly key: object
    readonly keep: (node: unknown) => void
    readonly parent: object | null
  },
): Record<string, PartBinding> => {
  const parts: Record<string, PartBinding> = {}
  if (row.chooser !== undefined) {
    parts[row.chooser] = { view: { ref: row.keep } }
  }
  if (offer.path.has(row.key)) {
    for (const name of row.beside) {
      parts[name] = { ...parts[name], wrap: NOTHING_DRAWN }
    }
  } else if (row.parent !== offer.current) {
    parts.host = { wrap: NOTHING_DRAWN }
  } else if (Object.keys(offer.writes).length > 0) {
    /* A row the stack draws as a row takes what the stack writes on it. */
    parts.host = { states: offer.writes }
  }
  return parts
}

/**
 * Hosts a row of a stack of pages, bound as the expansion binds
 * `stack-row`: the region that holds its page. **The row registers with its
 * parent**, the row whose page holds it, and gives its own key to the rows
 * drawn in its page, so the stack has a tree to walk.
 *
 * **A press on a row that holds a page shows that page**, and sends nothing
 * of its own. The arrow along the line into the page shows it, and the arrow
 * back out, or Escape, goes back one page, as on the web.
 *
 * **Only the page showing is drawn.** A row on the page showing draws its
 * press, and takes the props the stack writes on its rows. A row whose page is showing, or holds the page showing, draws its
 * page and none of its other parts, and any other row draws nothing, so its
 * rows still register while they stay out of sight.
 */
export const stackRow = (family: Family, use: MachineUse): Binder => {
  const page = boundTo(use, 'page', 'region') ?? 'page'
  const Offered = stackOf(family.api?.item?.of ?? '')
  const beside = besidePage(family.tree, page)
  return (props, around) => {
    const offer = useContext(Offered)
    const parent = useContext(StackParent)
    const own = useRef({}).current
    const key = around.joined?.key ?? own
    const hasPage = holdsContent(props[camel(page)])
    const value = String(given(family, props, 'value') ?? '')
    const words = around.joined?.words ?? wordsOf(props.children)
    const latest = useRef<Latest>({ hasPage, offer })
    latest.current = { hasPage, offer }
    const { focusRow, keep } = useRowKeys(key, latest)
    const place = offer?.place
    const leave = offer?.leave
    useLayoutEffect(() => {
      place?.(key, { focus: focusRow, hasPage, parent, value, words })
    }, [focusRow, hasPage, key, parent, place, value, words])
    useLayoutEffect(() => () => leave?.(key), [key, leave])
    if (offer === undefined) {
      return { marks: [], parts: {} }
    }
    if (hasPage) {
      around.stacked.enter = () => offer.enter(key)
    }
    const parts = drawnParts(offer, { beside, chooser: around.joined?.chooser, keep, key, parent })
    return {
      marks: [],
      parts,
      provide: (drawn: ReactNode) => (
        <StackParent.Provider value={key}>{drawn}</StackParent.Provider>
      ),
    }
  }
}
