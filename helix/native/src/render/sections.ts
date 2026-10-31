/**
 * The sections of a page, which an outline follows on a phone.
 *
 * **A phone has no document to find a section in by its id**, so each
 * section registers its view here with `useSection`, under its id, its words
 * and its level, as an anchor and a heading's id say them on the web. A link
 * whose `href` is a fragment, `#install`, goes to the section registered
 * under that id.
 */
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { useCallback, useRef } from 'react'
import type { HostInstance } from 'react-native'
import { scrollViewAbove } from '../capabilities/scroll'
import type { Node } from '../style/form'
import { bound, type Values } from './styles'

/** What a section says of itself as it registers. */
export interface SectionAbout {
  /** The words its link says, as its heading's. */
  readonly label: string
  /** Its heading's level, from 1, as `data-level` says it on the web. 1 where absent. */
  readonly level?: number
}

/** A section a page registered: its id, its words, its level, and its view. */
export interface Section {
  readonly id: string
  readonly label: string
  readonly level: number
  readonly node: HostInstance
  /** When it registered, which is the order its links are drawn in. */
  readonly order: number
}

const registered = new Map<string, Section>()
const observers = new Set<() => void>()
const travellers = new Set<(id: string) => boolean>()
let drawn = 0
let snapshot: readonly Section[] = []

const tell = (): void => {
  snapshot = [...registered.values()].sort((one, other) => one.order - other.order)
  for (const one of [...observers]) {
    one()
  }
}

/** The sections registered now, in the order they were drawn. */
export const sectionsNow = (): readonly Section[] => snapshot

/** Calls `changed` as a section registers, changes, or leaves, until stopped. */
export const observeSections = (changed: () => void): (() => void) => {
  observers.add(changed)
  return () => {
    observers.delete(changed)
  }
}

/**
 * The id a fragment link names, `install` for `#install`, or `undefined`
 * for any other link.
 */
export const fragmentOf = (href: unknown): string | undefined =>
  typeof href === 'string' && href.startsWith('#') && href.length > 1
    ? decodeURIComponent(href.slice(1))
    : undefined

/**
 * Hears each request to go to a section, until stopped. **A listener that
 * answers `true` takes the travel on itself**, as an outline scrolls with
 * its own `behavior` and `offset` and marks the section at once.
 */
export const observeTravel = (heard: (id: string) => boolean): (() => void) => {
  travellers.add(heard)
  return () => {
    travellers.delete(heard)
  }
}

/**
 * Scrolls the scroll view a section is drawn in to the section's top, less
 * `offset`, gliding where `smooth` holds. Answers whether there was a section
 * to go to.
 */
export const scrollToSection = (id: string, smooth: boolean, offset = 0): boolean => {
  const section = registered.get(id)
  const view = section === undefined ? null : scrollViewAbove(section.node)
  if (section === undefined || view === null) {
    return false
  }
  const frame = measure().box(view)
  const box = measure().box(section.node)
  if (frame === null || box === null) {
    return false
  }
  const at = scroll().offset(view)
  scroll().to(view, at.x, Math.max(0, at.y + box.y - frame.y - offset), smooth)
  return true
}

/**
 * Goes to the section a fragment link names: an outline that hears the
 * request takes it, and otherwise the section's scroll view moves to it at
 * once.
 */
export const goToSection = (id: string): boolean => {
  for (const one of [...travellers]) {
    if (one(id)) {
      return true
    }
  }
  return scrollToSection(id, false)
}

/**
 * Follows a link as a browser does: a fragment goes to its section, and
 * anything else goes through the open-link capability.
 */
export const followLink = (href: string): void => {
  const id = fragmentOf(href)
  if (id === undefined) {
    openLink().open(href)
  } else {
    goToSection(id)
  }
}

/**
 * Registers a section of the page under `id`, with its words and its level,
 * and gives the ref its view takes. An outline draws a link for each section
 * registered, in the order they were drawn, and marks the one being read.
 *
 * ```tsx
 * const install = useSection('install', { label: 'Install', level: 2 })
 * return <View ref={install}>…</View>
 * ```
 */
export const useSection = (
  id: string,
  about: SectionAbout,
): ((node: HostInstance | null) => void) => {
  const order = useRef(0)
  const { label, level = 1 } = about
  return useCallback(
    (node: HostInstance | null) => {
      if (node === null) {
        if (registered.get(id)?.order === order.current) {
          registered.delete(id)
          tell()
        }
        return
      }
      if (order.current === 0) {
        drawn += 1
        order.current = drawn
      }
      registered.set(id, { id, label, level, node, order: order.current })
      tell()
    },
    [id, label, level],
  )
}

/**
 * A press's view, which goes to a section of the page after anything its
 * binding does, where its link is a fragment, as an outline's link is.
 */
export const toSection = (
  scope: Values,
  node: Node,
  view: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const id = fragmentOf(bound(scope, node.attributes?.href, node.name))
  if (id === undefined) {
    return view
  }
  const own = view.onPress
  return {
    ...view,
    onPress: (event: unknown) => {
      if (typeof own === 'function') {
        own(event)
      }
      goToSection(id)
    },
  }
}
