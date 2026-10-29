import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import * as derivations from '@fusion.dev/helix-core/derivations'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { TextInputInstance } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, camel, given, senderOf, tell } from './props'

/** What an element a reader types into gives the machines bound after it. */
export interface Entered {
  /**
   * The field's view binding and the states the element is in: `blank`
   * while the field holds no text, `focusWithin` on the host while the field
   * has focus, and whether the press that clears is drawn.
   */
  readonly behavior: Behavior
  /** Empties the field, as its press that clears does, and gives it focus. */
  readonly clear: () => void
  /** The press that clears the field, where the tree draws one. */
  readonly clears: string | undefined
  /** The text the field holds as of the last edit or step, between renders as well. */
  readonly current: () => string
  /** Whether the reader has typed the text, as HTML's dirty value flag says. */
  readonly edited: boolean
  /** Whether the field has focus. */
  readonly focused: boolean
  /**
   * Takes the text to `next` as a step does: it asks, sends `input` where
   * it stands, and commits it with `change` where it moved, and says
   * whether it moved. A step is no edit of the reader's, and leaving the
   * field after it commits nothing more, as the web's commits nothing for
   * text a script wrote.
   */
  readonly step: (next: string) => boolean
  /** The text the field holds now. */
  readonly value: string
}

/**
 * How an element shapes its text beside the reader's edits, as a number
 * input shows its number in its format while the field has no focus and
 * holds it to its range as the reader leaves.
 */
export interface Shaping {
  /** What the field shows for `text`, while it has focus or not. */
  readonly shown: (text: string, focused: boolean) => string
  /** The text `text` settles to as the reader leaves the field or presses Enter. */
  readonly settle: (text: string) => string
}

/**
 * What a reader typed, as the derivation the form names turns it into the
 * element's text, as a Pin Input keeps the characters its type accepts. The
 * derivation reads the element's props by their names, with `value` the
 * typed text. Typed text stands as it is where the form names none.
 */
const cleanerOf = (family: Family, use: MachineUse): ((typed: string, props: Props) => string) => {
  const name = boundTo(use, 'cleans', 'derive')
  const derivation =
    name === undefined ? undefined : (derivations as Readonly<Record<string, unknown>>)[name]
  if (typeof derivation !== 'function') {
    return (typed) => typed
  }
  return (typed, props) => {
    const read: Record<string, unknown> = {}
    for (const prop of family.api?.props ?? []) {
      read[prop.name] = given(family, props, prop.name)
    }
    const cleaned: unknown = derivation({ ...read, value: typed })
    return typeof cleaned === 'string' ? cleaned : typed
  }
}

/**
 * What an entry gives its element's drawing: the field's view, `blank` while
 * it holds no text, and on the host whether it has focus, whether the press
 * that clears is drawn, and its text and caret for a derivation to read. **The
 * caret stands after the text**, in the box it is in and the last box once
 * the text fills them, as a phone's hidden field keeps it at the end, and
 * `-1` while the field has no focus.
 */
const hosted = (
  use: MachineUse,
  part: string,
  view: PartBinding,
  now: {
    readonly changes: boolean
    readonly fills: number
    readonly focused: boolean
    readonly offered: boolean
    readonly text: string
  },
): Behavior => {
  const { changes, fills, focused, offered, text } = now
  const blank = boundTo(use, 'blank', 'state')
  const shows = boundTo(use, 'shows', 'state')
  const typed = boundTo(use, 'typed', 'state')
  const caretAt = boundTo(use, 'caret', 'state')
  const last = (Number.isInteger(fills) ? fills : 1) - 1
  const caret = focused ? Math.max(0, Math.min(text.length, last)) : -1
  return {
    marks: text === '' && blank !== undefined ? [blank] : [],
    parts: {
      [part]: view,
      host: {
        states: {
          focusWithin: focused,
          ...(shows === undefined ? {} : { [shows]: offered && text !== '' && changes }),
          ...(typed === undefined ? {} : { [typed]: text }),
          ...(caretAt === undefined ? {} : { [caretAt]: String(caret) }),
        },
      },
    },
  }
}

/** The text a prop holds, where it holds any. */
const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined

/**
 * Hosts the text an element holds, as the expansion binds it: the field the
 * text is typed in, the press that clears it, the props that hold, seed, and
 * fix it, and the events an edit sends. **No machine of core's holds it**,
 * as the web element hears its own `<input>`.
 *
 * **A written `value` is a seed and a correction**, as a script writing the
 * web element's property is: it takes the field there with nothing sent,
 * and the reader still types from it. Where nothing is written, the seed
 * prop says where it starts.
 *
 * **Each edit asks first.** `before` carries the text the edit would leave,
 * and a refused edit leaves the text as it was, which the field draws again.
 * `input` follows an edit that stands. `change` is sent as the field loses
 * focus holding other text than it gained focus with, as a native
 * `<input>` commits. A refusal during composition is the platform's, since
 * React Native reports the composed text only once it is committed.
 *
 * **A commit gives the reader a go at the field**, which shows what is
 * wrong with its text from then on, as on the web.
 *
 * **The press that clears** asks with `''`, and where that stands empties
 * the field, sends `input`, `change`, and `clear`, and gives the field focus,
 * as the web's clear button does.
 *
 * **A shaped entry settles its text** as the reader leaves the field or
 * presses Enter, asking for the settled text before it commits, and shows
 * its text as `shaping` says, as a number input does.
 */
export const useEntry = (
  family: Family,
  props: Props,
  use: MachineUse,
  touch: () => void,
  shaping?: Shaping,
): Entered => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const clears = boundTo(use, 'clears', 'part')
  const valueProp = boundTo(use, 'value', 'prop')
  const written = textOf(valueProp === undefined ? undefined : props[camel(valueProp)])
  const seed = textOf(given(family, props, boundTo(use, 'seed', 'prop'))) ?? ''
  const [held, hold] = useState<{ readonly from: string | undefined; readonly text: string }>(
    () => ({ from: written, text: written ?? seed }),
  )
  /* A written value takes the field there, as it changes, with nothing sent. */
  let text = held.text
  if (written !== undefined && written !== held.from) {
    text = written
    hold({ from: written, text: written })
  }
  const [focused, holdFocus] = useState(false)
  const [edited, edit] = useState(false)
  const field = useRef<TextInputInstance | null>(null)
  const fieldRef = useCallback((node: TextInputInstance | null) => {
    field.current = node
  }, [])
  const committed = useRef(text)
  const events = {
    before: boundTo(use, 'before', 'event'),
    change: boundTo(use, 'change', 'event'),
    clear: boundTo(use, 'clear', 'event'),
    complete: boundTo(use, 'complete', 'event'),
    input: boundTo(use, 'input', 'event'),
  }
  const clean = useMemo(() => cleanerOf(family, use), [family, use])
  const fills = Number(given(family, props, boundTo(use, 'length', 'prop')))
  const latest = useRef({ events, props, text, touch })
  latest.current = { events, props, text, touch }
  const disabled = given(family, props, boundTo(use, 'disabled', 'prop')) === true
  const readonly = given(family, props, boundTo(use, 'readonly', 'prop')) === true
  const offered = given(family, props, boundTo(use, 'offers', 'prop')) === true
  /** Asks for `next` and takes it where it stands, saying whether it did. */
  const ask = useCallback(
    (next: string): boolean => {
      const now = latest.current
      const { before, input } = now.events
      const sender = senderOf(family, now.text)
      if (before !== undefined && !tell(family, now.props, before, { value: next }, sender)) {
        return false
      }
      latest.current = { ...now, text: next }
      hold((was) => ({ ...was, text: next }))
      if (input !== undefined) {
        tell(family, now.props, input, {}, senderOf(family, next))
      }
      return true
    },
    [family],
  )
  const commit = useCallback(() => {
    const { events: bound, props: now, text: settled, touch: touched } = latest.current
    if (settled === committed.current) {
      return
    }
    committed.current = settled
    /* A committed edit gives the reader a go at the field, as on the web. */
    touched()
    if (bound.change !== undefined) {
      tell(family, now, bound.change, {}, senderOf(family, settled))
    }
  }, [family])
  const clear = useCallback(() => {
    if (latest.current.text !== '' && ask('')) {
      edit(true)
      commit()
      const { events: bound, props: now } = latest.current
      if (bound.clear !== undefined) {
        tell(family, now, bound.clear, {}, senderOf(family, ''))
      }
    }
    /* Through the focus capability, which gives the field the keyboard. */
    if (field.current !== null) {
      focus().focus(field.current, false)
    }
  }, [ask, commit, family])
  /* **A reader's edit that fills the text completes it**: `complete`, then
     `change`, since a filled code is its commit, as on the web. */
  const onChangeText = useCallback(
    (typed: string) => {
      const next = clean(typed, latest.current.props)
      if (next === latest.current.text) {
        /* A refused character leaves the field's own text to draw again. */
        hold((was) => ({ ...was }))
        return
      }
      if (!ask(next)) {
        return
      }
      edit(true)
      const { complete } = latest.current.events
      if (complete !== undefined && Number.isInteger(fills) && next.length === fills) {
        tell(family, latest.current.props, complete, { value: next }, senderOf(family, next))
        commit()
      }
    },
    [ask, clean, commit, family, fills],
  )
  const onFocus = useCallback(() => {
    committed.current = latest.current.text
    holdFocus(true)
  }, [])
  /** Asks for the text the shaping settles to, where it moves. */
  const settle = useCallback(() => {
    const now = latest.current.text
    const settled = shaping?.settle(now) ?? now
    if (settled !== now) {
      ask(settled)
    }
  }, [ask, shaping])
  const onBlur = useCallback(() => {
    holdFocus(false)
    settle()
    commit()
  }, [commit, settle])
  /* Enter commits a settled number where settling moved it, as the web's does. */
  const onSubmitEditing = useCallback(() => {
    const before = latest.current.text
    settle()
    if (latest.current.text !== before) {
      commit()
    }
  }, [commit, settle])
  const step = useCallback(
    (next: string): boolean => {
      const before = latest.current.text
      if (next === before || !ask(next)) {
        return false
      }
      /* A step commits as it lands, so leaving the field commits nothing more. */
      committed.current = next
      const { events: bound, props: now, touch: touched } = latest.current
      touched()
      if (bound.change !== undefined) {
        tell(family, now, bound.change, {}, senderOf(family, next))
      }
      return true
    },
    [ask, family],
  )
  const current = useCallback(() => latest.current.text, [])
  const view: PartBinding = useMemo(
    () => ({
      view: {
        editable: !disabled && !readonly,
        onBlur,
        onChangeText,
        onFocus,
        ...(shaping === undefined ? {} : { onSubmitEditing }),
        ref: fieldRef,
        value: shaping === undefined ? text : shaping.shown(text, focused),
      },
    }),
    [
      disabled,
      fieldRef,
      focused,
      onBlur,
      onChangeText,
      onFocus,
      onSubmitEditing,
      readonly,
      shaping,
      text,
    ],
  )
  const behavior = hosted(use, part, view, {
    changes: !disabled && !readonly,
    fills,
    focused,
    offered,
    text,
  })
  return { behavior, clear, clears, current, edited, focused, step, value: text }
}
