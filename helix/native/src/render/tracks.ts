/*
 * Subgrids on a phone. An element whose host is a subgrid of the grid
 * around it, `grid-template-columns: subgrid`, lines its parts up in that
 * grid's tracks on the web, as each item of a description list puts its term
 * in one column with every other term. React Native has no grid, so the
 * element around shares a width for each track among the elements it holds:
 * each subgrid laid out in a row measures its parts and takes the widest.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import type { Family } from '../style/form'
import type { Behavior, PartBinding } from './behavior'

/** What an element gives the elements it holds, which a subgrid among them lines its parts up by. */
export interface Tracks {
  /**
   * Joins an element that lays its parts out in the tracks, with how many
   * tracks it measures. It answers the function that takes it out.
   */
  readonly join: (key: string, count: number) => () => void
  /** Tells the tracks an element's part at `track` is `width` wide at its own size. */
  readonly report: (key: string, track: number, width: number) => void
  /**
   * The width of each track: the widest part any element reported there.
   * Absent while the tracks are measured.
   */
  readonly widest?: readonly number[]
}

/** The widest at each track, where every member has reported each of its tracks. */
const widestOf = (
  members: ReadonlyMap<string, number>,
  widths: ReadonlyMap<string, readonly number[]>,
): number[] | undefined => {
  const widest: number[] = []
  for (const [key, count] of members) {
    const own = widths.get(key) ?? []
    for (let track = 0; track < count; track += 1) {
      const width = own[track]
      if (width === undefined) {
        return undefined
      }
      widest[track] = Math.max(widest[track] ?? 0, width)
    }
  }
  return members.size === 0 ? undefined : widest
}

/**
 * The tracks an element shares among what it holds, measured at the text
 * size `rem` is for.
 *
 * **The tracks take their widths once every member has reported its own**,
 * as a grid's `auto` column is measured: a part is drawn at its own size
 * while the tracks are measured, and then at least as wide as the widest. A
 * member joining or leaving measures them again, and so does a new text
 * size. A part measured at its own size keeps that width until then.
 */
export const useTracks = (rem: number): Tracks => {
  const [widest, setWidest] = useState<{ readonly at: number; readonly widths: number[] }>()
  const members = useRef(new Map<string, number>())
  const widths = useRef(new Map<string, number[]>())
  const measuredAt = useRef(rem)
  if (measuredAt.current !== rem) {
    measuredAt.current = rem
    widths.current = new Map()
  }
  const settle = useCallback(() => {
    const found = widestOf(members.current, widths.current)
    setWidest(found === undefined ? undefined : { at: measuredAt.current, widths: found })
  }, [])
  const join = useCallback(
    (key: string, count: number) => {
      members.current.set(key, count)
      settle()
      return () => {
        members.current.delete(key)
        widths.current.delete(key)
        settle()
      }
    },
    [settle],
  )
  const report = useCallback(
    (key: string, track: number, width: number) => {
      const own = widths.current.get(key) ?? []
      own[track] = width
      widths.current.set(key, own)
      settle()
    },
    [settle],
  )
  return widest === undefined || widest.at !== rem
    ? { join, report }
    : { join, report, widest: widest.widths }
}

/** Whether a family's host is a subgrid of the grid around it, as its rules write it. */
export const isSubgrid = (family: Family): boolean =>
  (family.rules ?? []).some(
    (item) =>
      item.kind === 'rule' &&
      item.target === 'host' &&
      !item.webOnly &&
      item.set.some(
        ([property, value]) =>
          property === 'grid-template-columns' &&
          typeof value === 'object' &&
          value !== null &&
          'text' in value &&
          value.text === 'subgrid',
      ),
  )

/**
 * The parts a subgrid lays out in the tracks, in order: the parts at the top
 * of its tree. **Every part but the last takes a track's width**, and the
 * last takes the rest of the line, as the value column does.
 */
export const sizedParts = (family: Family): readonly string[] =>
  (family.tree ?? [])
    .filter((node) => node.kind === 'box')
    .map((node) => node.name)
    .slice(0, -1)

/**
 * What a subgrid's parts are drawn with, where it joins the tracks of the
 * element around: each part reports its width while the tracks are
 * measured, and is at least as wide as the widest afterward. **A subgrid
 * joins only while its parts run in a row**, so one that stacks them, as a
 * narrow description list does, takes no track's width.
 */
export const useSubgrid = (
  tracks: Tracks | undefined,
  parts: readonly string[],
  row: boolean,
): Behavior => {
  const key = useId()
  const joined = tracks !== undefined && row && parts.length > 0
  const latest = useRef(tracks)
  latest.current = tracks
  useEffect(() => {
    if (!joined) {
      return undefined
    }
    return latest.current?.join(key, parts.length)
  }, [joined, key, parts.length])
  if (!joined) {
    return { marks: [], parts: {} }
  }
  const widest = tracks.widest
  const bound: Record<string, PartBinding> = {}
  parts.forEach((part, track) => {
    const width = widest?.[track]
    bound[part] = {
      view:
        width === undefined
          ? {
              onLayout: (event: LayoutChangeEvent) =>
                latest.current?.report(key, track, event.nativeEvent.layout.width),
            }
          : { style: { minWidth: width } },
    }
  })
  return { marks: [], parts: bound }
}
