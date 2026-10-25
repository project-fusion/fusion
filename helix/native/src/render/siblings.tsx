/**
 * The elements of one kind that stand beside each other, as the web finds a
 * callout's or an announcement's siblings in its parent: where a dismissal
 * hands focus, and which queued announcement waits its turn.
 *
 * **A phone has no parent to read**, so the elements of one tag drawn
 * directly inside the same Helix element, or outside any, are siblings, in
 * the order they were first drawn, which is the order React draws them in.
 * An element drawn later between two others joins after them.
 */

import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react'

/** What an element tells its siblings of itself. */
export interface Sibling {
  /** Moves focus to the element's control that takes it, and answers whether it did. */
  readonly focus?: () => boolean
  /** Whether it is drawn now: not closed, and not waiting its turn. */
  readonly present: () => boolean
  /** Whether it waits its turn behind the queued siblings before it, as a queued announcement. */
  readonly queued?: () => boolean
}

/** The siblings of one tag in one place, in the order they joined, and who hears them change. */
interface Group {
  readonly heard: Set<() => void>
  readonly members: Map<object, Sibling>
}

/** The place an element is drawn in: the Helix element around it, or the app. */
const Place = createContext<object>({})

/** Gives what an element draws a place of its own, so its children are siblings of each other. */
export const PlaceOf = ({ children, place }: { children: ReactNode; place: object }) => (
  <Place.Provider value={place}>{children}</Place.Provider>
)

/* The groups of each place, by tag. */
const groups = new WeakMap<object, Map<string, Group>>()

/** The group of `tag` in `place`, made the first time it is asked for. */
const groupOf = (place: object, tag: string): Group => {
  const tags = groups.get(place) ?? new Map<string, Group>()
  groups.set(place, tags)
  const group = tags.get(tag) ?? { heard: new Set(), members: new Map() }
  tags.set(tag, group)
  return group
}

/** What an element reads of its siblings. */
export interface Siblings {
  /** The siblings after it, nearest first, then those before it, nearest first. */
  readonly around: () => readonly Sibling[]
  /** The siblings before it, nearest first. */
  readonly before: () => readonly Sibling[]
  /** Tells the siblings this one changed, so each reads the others again. */
  readonly changed: () => void
}

/**
 * Joins the siblings of `tag` in the place the element is drawn, as `me`,
 * and draws the element again each time one of them joins, leaves, or says
 * it changed.
 */
export const useSiblings = (tag: string, me: Sibling): Siblings => {
  const place = useContext(Place)
  const key = useRef({}).current
  const latest = useRef(me)
  latest.current = me
  const [, redraw] = useReducer((count: number) => count + 1, 0)
  const group = groupOf(place, tag)
  const member: Sibling = useState(() => {
    const made: Sibling = {
      focus: () => latest.current.focus?.() ?? false,
      present: () => latest.current.present(),
      queued: () => latest.current.queued?.() ?? false,
    }
    /* **Joined as it first draws**, in the order React draws, so an element
       drawn after another reads it at its first render, as a queued
       announcement waits from the start. */
    group.members.set(key, made)
    return made
  })[0]
  useLayoutEffect(() => {
    group.members.set(key, member)
    group.heard.add(redraw)
    for (const hear of group.heard) {
      hear()
    }
    return () => {
      group.members.delete(key)
      group.heard.delete(redraw)
      for (const hear of group.heard) {
        hear()
      }
    }
  }, [group, key, member])
  const split = () => {
    const order = [...group.members.keys()]
    const at = order.indexOf(key)
    const all = order.map((one) => group.members.get(one) as Sibling)
    return { after: all.slice(at + 1), before: all.slice(0, Math.max(at, 0)).reverse() }
  }
  return {
    around: () => {
      const { after, before } = split()
      return [...after, ...before]
    },
    before: () => split().before,
    changed: () => {
      for (const hear of group.heard) {
        if (hear !== redraw) {
          hear()
        }
      }
    },
  }
}
