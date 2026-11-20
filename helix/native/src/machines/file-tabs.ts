/**
 * A set of file tabs on a phone, which Code Block and Sandbox draw alike: the
 * file a prop starts and follows, the press and the arrow keys that choose
 * another, and the refusable request a choice sends.
 */
import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useRef, useState } from 'react'
import type { HostInstance } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { PartBinding, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { boundTo, tell } from './props'

/** A value a prop starts and follows, which a press changes in between, as a web property. */
export const useFollowed = <Value>(from: Value): [Value, (next: Value) => void] => {
  const [own, setOwn] = useState(from)
  const seen = useRef(from)
  if (seen.current !== from) {
    seen.current = from
    setOwn(from)
  }
  return [own, setOwn]
}

/** The tab a key goes to, among `count`, or -1 for a key that moves none. */
const keyedTab = (key: string, from: number, count: number): number => {
  const rtl = environment().read().direction === 'rtl'
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
  const back = rtl ? 'ArrowRight' : 'ArrowLeft'
  const moves: Readonly<Record<string, number>> = {
    [back]: (from - 1 + count) % count,
    End: count - 1,
    [forward]: (from + 1) % count,
    Home: 0,
  }
  return moves[key] ?? -1
}

/** What the press and the screen reader hear of a tab, and its keys. */
export const useFileTabs = (
  names: readonly string[],
  shown: string,
  choose: (name: string) => void,
): PartBinding => {
  const nodes = useRef(new Map<string, HostInstance>())
  const stops = useRef(new Map<string, () => void>())
  const now = useRef({ choose, names, shown })
  now.current = { choose, names, shown }
  const pressKey = useCallback((press: KeyPress): boolean => {
    const { choose: chooseNow, names: all, shown: at } = now.current
    const name = all[keyedTab(press.key, all.indexOf(at), all.length)]
    if (name === undefined) {
      return false
    }
    chooseNow(name)
    const view = nodes.current.get(name)
    if (view !== undefined) {
      focus().focus(view, false)
    }
    return true
  }, [])
  const refFor = useCallback(
    (name: string) => (node: HostInstance | null) => {
      stops.current.get(name)?.()
      stops.current.delete(name)
      if (node === null) {
        nodes.current.delete(name)
        return
      }
      nodes.current.set(name, node)
      stops.current.set(name, keys().listen(node, pressKey))
    },
    [pressKey],
  )
  const refs = useRef(new Map<string, (node: HostInstance | null) => void>())
  return {
    copy: (item: Entry) => {
      const name = String(item.fields.name)
      const ref = refs.current.get(name) ?? refFor(name)
      refs.current.set(name, ref)
      return { onPress: () => choose(name), ref }
    },
  }
}

/** The events a set of tabs sends for one request: a refusable one, and what follows it. */
export const useRequest = (family: Family, props: Props, use: MachineUse) => {
  const latest = useRef(props)
  latest.current = props
  return useCallback(
    (before: string, after: string, detail: Readonly<Record<string, unknown>>): boolean => {
      const asked = boundTo(use, before, 'event')
      if (asked !== undefined && !tell(family, latest.current, asked, detail)) {
        return false
      }
      const heard = boundTo(use, after, 'event')
      if (heard !== undefined) {
        tell(family, latest.current, heard, detail)
      }
      return true
    },
    [family, use],
  )
}
