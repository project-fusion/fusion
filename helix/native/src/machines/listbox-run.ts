/**
 * Runs what `listKey` says a key does to a list of options.
 */
import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { rangeAdd, toggleEvery } from '@fusion.dev/helix-core/listbox'
import { I18nManager } from 'react-native'
import { type ListKey, listKey } from './listbox-keys'
import { type Entry, gridStep, type Held, movesWith } from './listbox-model'
import type { VirtualFocus } from './virtual-focus'

/** What a list's keys read and do, at one draw. */
export interface ListRun {
  readonly arrive: (value: string, forwarded: boolean) => void
  readonly choose: (value: string) => void
  readonly chosen: readonly string[]
  readonly current: string
  readonly entries: readonly Entry[]
  readonly extend: (to: string) => void
  readonly flush: () => void
  readonly focus: VirtualFocus
  /** Whether Up and Down keep to a column. */
  readonly grid: boolean
  readonly held: Held
  readonly moveTo: (key: object, to: number) => void
  readonly moving: boolean
  readonly multiple: boolean
  readonly page: () => number
  readonly request: (value: string) => void
}

/** The options a reader can reach. */
const reachOf = (run: ListRun): Entry[] => run.entries.filter((one) => !one.hidden && !one.disabled)

/** Where a key that moves the highlight lands it. */
const landed = (run: ListRun, key: string): string => {
  const shown = reachOf(run)
  const column = run.grid && (key === 'ArrowDown' || key === 'ArrowUp')
  if (column && shown.some((one) => one.value === run.current)) {
    const target = gridStep(key, run.current, shown, run.held)
    run.focus.to(target)
    return target
  }
  const paged = key === 'PageDown' || key === 'PageUp'
  return run.focus.step(key, run.current, run.entries, paged ? run.page() : 0)
}

/** Runs a key that moves the highlight, which with Shift adds what it passes or reaches. */
const runMove = (
  run: ListRun,
  action: Extract<ListKey, { kind: 'move' }>,
  typing: boolean,
): void => {
  run.flush()
  const values = reachOf(run).map((one) => one.value)
  const at = values.indexOf(run.current)
  const target = landed(run, action.key)
  if (target === '') {
    return
  }
  run.arrive(target, typing)
  if (!action.shift) {
    return
  }
  if (action.key === 'Home' || action.key === 'End') {
    const taken = rangeAdd(run.chosen, values, at, values.indexOf(target))
    if (taken !== null) {
      run.request(taken.join(','))
    }
  } else if (!run.chosen.includes(target)) {
    run.choose(target)
  }
}

/** Runs Enter or Space on what the highlight is on. */
const runChoose = (run: ListRun, typing: boolean): void => {
  const { active } = run.focus
  if (active !== '') {
    run.choose(active)
    return
  }
  if (!typing) {
    const at = run.chosen[0] ?? reachOf(run)[0]?.value
    if (at !== undefined) {
      run.focus.to(at)
      run.choose(at)
    }
  }
}

/** Runs what a key does. */
const runKey = (run: ListRun, action: ListKey, typing: boolean): void => {
  const shown = reachOf(run)
  switch (action.kind) {
    case 'all':
      run.request(
        toggleEvery(
          run.chosen,
          shown.map((one) => one.value),
        ).join(','),
      )
      return
    case 'along': {
      const at = shown.findIndex((one) => one.value === run.current)
      const target = shown[Math.min(Math.max(at + action.by, 0), shown.length - 1)]?.value
      if (target !== undefined) {
        run.arrive(target, typing)
      }
      return
    }
    case 'choose':
      runChoose(run, typing)
      return
    case 'extend':
      run.extend(run.focus.active)
      return
    case 'link': {
      const link = run.entries.find((one) => one.value === run.focus.active)?.href
      if (link) {
        void openLink().open(link)
      }
      return
    }
    case 'move':
      runMove(run, action, typing)
      return
    case 'reorder': {
      const key = run.entries.find((one) => one.value === run.current)?.key
      if (key !== undefined) {
        run.moveTo(key, action.to)
      }
      return
    }
    case 'type': {
      const target = run.focus.typed(action.key, run.current, run.entries)
      if (target !== undefined) {
        run.arrive(target, typing)
      }
      return
    }
    default:
  }
}

/** Hands a list a key, and answers whether it took it. */
export const heardKey = (run: ListRun, press: KeyPress, typing: boolean): boolean => {
  const shown = reachOf(run)
  if (shown.length === 0) {
    return false
  }
  const around = run.entries.find((one) => one.value === run.current)
  const set = around === undefined ? undefined : movesWith(run.entries, around.key)
  const action = listKey(press, {
    around:
      around === undefined || set === undefined
        ? undefined
        : { at: set.indexOf(around), count: set.length },
    grid: run.grid,
    link: shown.some((one) => one.value === run.focus.active && one.href !== ''),
    multiple: run.multiple,
    reorders: run.moving,
    rtl: I18nManager.isRTL,
    searching: run.focus.typing(),
    typing,
  })
  if (action === undefined) {
    return false
  }
  runKey(run, action, typing)
  return true
}
