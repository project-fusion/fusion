/**
 * The sections machine an element that declares `sections` runs, as an
 * outline draws a link for each section the page registers and marks the
 * one being read.
 *
 * **The section being read is worked out as the web works it out**: the
 * last whose top has passed the reading line, `offset` below the top of the
 * scroll view the sections are drawn in, the first where none has, and the
 * last once the scroll view stands at its end. Under `marks="visible"`,
 * every section with part of it on screen.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import type { Rect, Scrolled } from '@fusion.dev/helix-core/capabilities/types'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { HostInstance } from 'react-native'
import { lengthsOf, scrollViewAbove, standingOf } from '../capabilities/scroll'
import type { MachineUse } from '../ir.generated'
import { type Behavior, merged, type PartBinding, type Props } from '../render/behavior'
import { useReducedMotion } from '../render/motion'
import {
  observeSections,
  observeTravel,
  type Section,
  scrollToSection,
  sectionsNow,
} from '../render/sections'
import type { Family } from '../style/form'
import type { Member } from './collection'
import { useFollow } from './follow'
import { useIndicator } from './indicator'
import { boundTo, given, tell } from './props'

/** Where each section's top stands below the top of the view it scrolls in, and how tall that view is. */
export interface Reading {
  /** Whether the view stands at its end, where the last section is the one being read. */
  readonly atEnd: boolean
  /** How tall the view is. */
  readonly height: number
  /** Each section's top, below the view's top, in the sections' order. */
  readonly tops: readonly number[]
}

/**
 * The places of the sections marked, by `marks` and the reading line
 * `offset`: the one being read, or under `visible` every one on screen.
 */
export const markedAt = (reading: Reading, offset: number, marks: unknown): readonly number[] => {
  const { atEnd, height, tops } = reading
  if (tops.length === 0) {
    return []
  }
  if (marks === 'visible') {
    const shown = tops.flatMap((top, at) => {
      const end = tops[at + 1] ?? Number.POSITIVE_INFINITY
      return top < height - 1 && end > offset + 1 ? [at] : []
    })
    if (shown.length > 0) {
      return shown
    }
  }
  if (atEnd) {
    return [tops.length - 1]
  }
  const passed = tops.flatMap((top, at) => (top - offset <= 1 ? [at] : []))
  return [passed.at(-1) ?? 0]
}

/**
 * Each section's depth in the outline, from 1: a section goes under the
 * nearest one before it with a lower level, and a jump of two levels nests
 * one deeper, as the web nests a flat run of links.
 */
export const depthsOf = (levels: readonly number[]): number[] => {
  const open: number[] = []
  return levels.map((level) => {
    while (open.length > 0 && (open.at(-1) ?? 0) >= level) {
      open.pop()
    }
    open.push(level)
    return open.length
  })
}

/**
 * Whether the view the sections are drawn in does not scroll, as a page too
 * short to scroll stands at its end on the web. **From the lengths the view
 * reports**, once it has, and before then from the sections themselves,
 * where each is laid out and the last ends inside the view's frame, so the
 * first mark is already the last section and no `activate` is sent for the
 * first on the way.
 */
const stillIn = (
  view: HostInstance,
  frame: Rect | null,
  boxes: readonly (Rect | null)[],
  standing: Scrolled | undefined,
): boolean => {
  const { content, frame: shown } = lengthsOf(view)
  if (shown.height > 0 && content.height > 0) {
    return content.height <= shown.height + 1
  }
  if (frame === null || frame.height <= 0 || (standing?.offset.y ?? 0) > 0) {
    return false
  }
  const laid = boxes.filter((box): box is Rect => box !== null)
  return (
    laid.length === boxes.length &&
    laid.every((box) => box.y + box.height - frame.y <= frame.height + 1)
  )
}

/** Where the sections stand in the view they scroll in, read now. */
const readNow = (sections: readonly Section[], standing: Scrolled | undefined): Reading => {
  const view = sections[0] === undefined ? null : scrollViewAbove(sections[0].node)
  const frame = view === null ? null : measure().box(view)
  const boxes = sections.map((section) => measure().box(section.node))
  return {
    /* At the end of a view that scrolls, or in one that does not scroll. A
       view not yet measured lets the reading line decide. */
    atEnd:
      (standing?.y.end === true && !standing.y.start) ||
      (view !== null && stillIn(view, frame, boxes, standing)),
    height: frame?.height ?? 0,
    tops: boxes.map((box) => (box?.y ?? 0) - (frame?.y ?? 0)),
  }
}

/** The list the element draws its links from: each section's fields, as a repeat's copies read them. */
const listOf = (sections: readonly Section[], marked: ReadonlySet<string>) => {
  const depths = depthsOf(sections.map((section) => section.level))
  return sections.map((section, at) => {
    const depth = depths[at] ?? 1
    return {
      current: marked.has(section.id) ? 'location' : '',
      depth,
      'depth-2': depth === 2,
      'depth-3': depth === 3,
      'depth-4': depth === 4,
      'depth-5': depth === 5,
      'depth-6': depth >= 6,
      href: `#${encodeURIComponent(section.id)}`,
      id: section.id,
      label: section.label,
      level: section.level,
      marked: marked.has(section.id),
    }
  })
}

/**
 * Hosts the sections machine: the sections the page registers, as the list
 * the element draws its links from, the ones marked, and `changes` sent with
 * the id of the section being read as it changes.
 *
 * **A link's press goes to its section** through the registry, which this
 * element takes on: it marks the section at once and keeps it marked until
 * the scroll comes to rest, as the web keeps its destination over what the
 * page passes on the way, and scrolls gliding under `behavior="smooth"`
 * unless the reader asks for reduced motion. Focus moves to the section.
 *
 * **Under `follow`, the marked link stays in view** in the scroll view the
 * links are drawn in, as the web keeps it in a rail that scrolls on its own,
 * through a ref for each copy of the `link` part.
 */
export const useSections = (family: Family, props: Props, use: MachineUse): Behavior => {
  const list = boundTo(use, 'list', 'state') ?? 'sections'
  const changes = boundTo(use, 'changes', 'event')
  const offset = Number(given(family, props, boundTo(use, 'offset', 'prop'))) || 0
  const marks = given(family, props, boundTo(use, 'marks', 'prop'))
  const follow = given(family, props, boundTo(use, 'follow', 'prop')) === true
  const link = boundTo(use, 'link', 'part')
  const behavior = given(family, props, boundTo(use, 'behavior', 'prop'))
  const reduced = useReducedMotion()
  const sections = useSyncExternalStore(observeSections, sectionsNow)
  const [marked, setMarked] = useState<readonly string[]>([])
  const latest = useRef({ behavior, offset, props, reduced })
  latest.current = { behavior, offset, props, reduced }
  useEffect(() => {
    const first = sections[0]
    const view = first === undefined ? null : scrollViewAbove(first.node)
    let standing: Scrolled | undefined = view === null ? undefined : standingOf(view)
    let landing: string | undefined
    const mark = () => {
      if (landing !== undefined) {
        return
      }
      const at = markedAt(readNow(sections, standing), latest.current.offset, marks)
      const ids = at.flatMap((place) => (sections[place] === undefined ? [] : [sections[place].id]))
      setMarked((was) => (was.join(' ') === ids.join(' ') ? was : ids))
    }
    mark()
    const stopScroll =
      view === null
        ? undefined
        : scroll().observe(view, (at) => {
            standing = at
            if (at.settled) {
              landing = undefined
            }
            mark()
          })
    const stopTravel = observeTravel((id) => {
      if (!sections.some((section) => section.id === id)) {
        return false
      }
      const smooth = latest.current.behavior === 'smooth' && !latest.current.reduced
      landing = id
      setMarked([id])
      if (!scrollToSection(id, smooth, latest.current.offset)) {
        landing = undefined
      }
      /* Focus goes to the section, as a fragment link moves it on the web,
         so the next move goes on from there. */
      const node = sections.find((section) => section.id === id)?.node
      if (node !== undefined) {
        focus().focus(node, true)
      }
      return true
    })
    return () => {
      stopScroll?.()
      stopTravel()
    }
  }, [marks, sections])
  const current = marked[0] ?? ''
  const told = useRef('')
  useEffect(() => {
    if (current !== told.current) {
      told.current = current
      if (changes !== undefined) {
        tell(family, latest.current.props, changes, { value: current })
      }
    }
  }, [changes, current, family])
  const followed = useFollow(follow, current, sections[0]?.node)
  const mark = boundTo(use, 'mark', 'part')
  /* Each link, as the item the mark is placed at while its section is read. */
  const members = useMemo(
    (): Member[] =>
      sections.map((section) => ({
        chooses: true,
        disabled: false,
        node: () => followed.link(section.id) ?? null,
        value: section.id,
        words: section.label,
      })),
    [followed, sections],
  )
  const placed = useIndicator(
    family,
    props,
    { bind: { mark: { part: mark ?? '' } }, machine: 'indicator' },
    members,
    (value) => value === current,
  )
  const on = new Set(marked)
  const links: Record<string, PartBinding> =
    link === undefined ? {} : { [link]: { copy: followed.copy } }
  const drawn: Behavior = {
    marks: [],
    parts: { ...links, host: { lists: { [list]: listOf(sections, on) } } },
  }
  return mark === undefined ? drawn : merged(drawn, placed)
}
