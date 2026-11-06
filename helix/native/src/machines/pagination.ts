/**
 * The machines a row of pages and a page-size control run on a phone.
 *
 * **A row of pages holds the page, whoever set it**, and moves through one
 * request a handler can refuse, as the web's does. Core works out which pages
 * show and where each gap goes. A page's press keeps focus on that page, since
 * the row is keyed by page. A gap points somewhere new once the row moves, and a
 * step is disabled at the end it reached, so after either focus goes to the
 * current page. It says the new page as the page moves, whoever moved it.
 *
 * **A page-size control is a Select**, its options the sizes it offers. It holds
 * the size in force, and a refusal leaves the Select where it stood.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import {
  formatNumbers,
  gapKey,
  gapTarget,
  pageCount,
  pageSizes,
  paginationSlots,
} from '@fusion.dev/helix-core/pagination'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'

const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

const numberIn = (value: unknown, otherwise = 0): number => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : otherwise
}

/** A value a prop holds until a reader moves it, and holds again as the prop changes. */
const useHeld = (asked: unknown, start: number) => {
  const [own, setOwn] = useState<number | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  const held = own ?? (asked === undefined ? start : numberIn(asked, start))
  return [held, setOwn] as const
}

/** One control of a row: where it goes, and what a reader hears and sees of it. */
interface SlotRow {
  readonly chosen: boolean
  readonly current: string | undefined
  readonly gap: boolean
  readonly key: string
  readonly label: string
  readonly pressed: boolean
  readonly shown: string
  readonly to: number
}

/** Hosts a row of pages. */
export const usePagination = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const lang = wordsIn(read('locale')) || locale().read()
  const count = pageCount(
    numberIn(read('pages')),
    numberIn(read('total')),
    numberIn(read('pageSize')),
  )
  const [held, setPage] = useHeld(props.page, numberIn(read('defaultPage'), 1))
  const page = Math.min(count, Math.max(1, Math.floor(held) || 1))
  const pageLabel = wordsIn(read('pageLabel'))
  const gapLabel = wordsIn(read('gapLabel'))
  const boundaries = numberIn(read('boundaries'), 1)
  const siblings = numberIn(read('siblings'), 1)
  const [pressed, setPressed] = useState<string>()
  const rows = useMemo<readonly SlotRow[]>(() => {
    const written = formatNumbers(lang)
    return paginationSlots(count, page, { boundaries, siblings }).map((slot) => {
      if (typeof slot === 'number') {
        return {
          chosen: slot === page,
          current: slot === page ? 'page' : undefined,
          gap: false,
          key: String(slot),
          label: formatMessage(pageLabel, { page: slot, pages: count }, lang),
          pressed: pressed === String(slot),
          shown: written(slot),
          to: slot,
        }
      }
      const to = gapTarget(slot)
      return {
        chosen: false,
        current: undefined,
        gap: true,
        key: gapKey(slot, page),
        label: formatMessage(gapLabel, { page: to, pages: count }, lang),
        pressed: pressed === gapKey(slot, page),
        shown: '…',
        to,
      }
    })
  }, [boundaries, count, gapLabel, lang, page, pageLabel, pressed, siblings])

  const nodes = useRef(new Map<string, unknown>())
  const steps = useRef(new Map<string, unknown>())
  const used = useRef(false)
  const before = boundTo(use, 'onBeforeNavigate', 'event')
  const after = boundTo(use, 'onNavigate', 'event')
  const now = useRef({ count, page, props })
  now.current = { count, page, props }
  const go = useCallback(
    (next: number, moves: boolean, holder: unknown) => {
      const latest = now.current
      if (next === latest.page || next < 1 || next > latest.count) {
        return
      }
      const detail = { page: next, value: String(next) }
      if (before !== undefined && !tell(family, latest.props, before, detail)) {
        return
      }
      /* A page keeps its own control. Focus moves only where the control a reader
         used held it, and has gone or has nowhere left to go. */
      used.current = moves && holder !== undefined && focus().focused() === holder
      setPage(next)
      if (after !== undefined) {
        tell(family, latest.props, after, detail)
      }
    },
    [after, before, family, setPage],
  )

  /* Says where the reader now is, and puts focus back where its control went. */
  const said = useRef(page)
  useEffect(() => {
    if (said.current !== page) {
      said.current = page
      announce().say(formatMessage(pageLabel, { page, pages: count }, lang), 'polite')
    }
    if (used.current) {
      used.current = false
      const step = page <= 1 ? 'next' : 'previous'
      const node = nodes.current.get(String(page)) ?? steps.current.get(step)
      if (node !== undefined) {
        focus().focus(node as never, false)
      }
    }
  }, [count, lang, page, pageLabel])

  const copy = useCallback(
    (item: Entry) => {
      const key = String(item.fields.key)
      return {
        onPress: () => go(Number(item.fields.to), item.fields.gap === true, nodes.current.get(key)),
        onTouchCancel: () => setPressed(undefined),
        onTouchEnd: () => setPressed(undefined),
        onTouchStart: () => setPressed(key),
        ref: (node: unknown) => {
          if (node === null) {
            nodes.current.delete(key)
          } else {
            nodes.current.set(key, node)
          }
        },
      }
    },
    [go],
  )
  const step = (name: string, to: number) => ({
    view: {
      onPress: () => go(to, to <= 1 || to >= count, steps.current.get(name)),
      ref: (node: unknown) => {
        if (node === null) {
          steps.current.delete(name)
        } else {
          steps.current.set(name, node)
        }
      },
    },
  })
  const atStart = page <= 1
  const atEnd = page >= count
  const status = formatMessage(wordsIn(read('statusLabel')), { page, pages: count }, lang)
  return {
    marks: [],
    parts: {
      first: step('first', 1),
      host: {
        lists: { [flag('slots')]: rows },
        states: {
          [flag('atEnd')]: atEnd,
          [flag('atStart')]: atStart,
          [flag('empty')]: count <= 1,
          [flag('status')]: status,
        },
        view: { accessibilityLabel: wordsIn(read('label')) || wordsIn(read('fallbackLabel')) },
      },
      last: step('last', count),
      list: { lists: { [flag('slots')]: rows } },
      next: step('next', page + 1),
      page: { copy },
      previous: step('previous', page - 1),
    },
  }
}

/** Hosts a page-size control. */
export const usePaginationSize = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const lang = wordsIn(read('locale')) || locale().read()
  const offered = wordsIn(read('sizes'))
  const sizes = useMemo(() => pageSizes(offered), [offered])
  const [held, setSize] = useHeld(props.value, numberIn(read('defaultValue')))
  const current = sizes.includes(held) ? held : (sizes[0] ?? 0)
  const options = useMemo(() => {
    const written = formatNumbers(lang)
    return sizes.map((size) => ({ key: String(size), label: written(size), value: String(size) }))
  }, [lang, sizes])
  const before = boundTo(use, 'onBeforeChange', 'event')
  const input = boundTo(use, 'onInput', 'event')
  const change = boundTo(use, 'onChange', 'event')
  const onBeforeChange = (event: {
    readonly detail?: { readonly value?: string }
    preventDefault?: () => void
  }) => {
    /* The Select holds what this element says, so it never moves on its own. */
    event.preventDefault?.()
    const next = Number.parseInt(event.detail?.value ?? '', 10)
    if (!Number.isFinite(next) || next === current) {
      return
    }
    const value = String(next)
    if (before !== undefined && !tell(family, props, before, { value })) {
      return
    }
    setSize(next)
    for (const name of [input, change]) {
      if (name !== undefined) {
        tell(family, props, name, { value })
      }
    }
  }
  return {
    marks: [],
    parts: {
      control: { view: { onBeforeChange } },
      host: {
        lists: { [flag('options')]: options },
        states: {
          [flag('empty')]: sizes.length === 0,
          [flag('shown')]: String(current),
        },
      },
    },
  }
}
