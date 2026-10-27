import { focus } from '@fusion.dev/helix-core/capabilities/focus'
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
  /** Whether the reader has typed the text, as HTML's dirty value flag says. */
  readonly edited: boolean
  /** The text the field holds now. */
  readonly value: string
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
 */
export const useEntry = (
  family: Family,
  props: Props,
  use: MachineUse,
  touch: () => void,
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
    input: boundTo(use, 'input', 'event'),
  }
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
  const onChangeText = useCallback(
    (next: string) => {
      if (ask(next)) {
        edit(true)
      }
    },
    [ask],
  )
  const onFocus = useCallback(() => {
    committed.current = latest.current.text
    holdFocus(true)
  }, [])
  const onBlur = useCallback(() => {
    holdFocus(false)
    commit()
  }, [commit])
  const blank = text === ''
  const blankState = boundTo(use, 'blank', 'state')
  const shows = boundTo(use, 'shows', 'state')
  const view: PartBinding = useMemo(
    () => ({
      view: {
        editable: !disabled && !readonly,
        onBlur,
        onChangeText,
        onFocus,
        ref: fieldRef,
        value: text,
      },
    }),
    [disabled, fieldRef, onBlur, onChangeText, onFocus, readonly, text],
  )
  const behavior: Behavior = {
    marks: blank && blankState !== undefined ? [blankState] : [],
    parts: {
      [part]: view,
      host: {
        states: {
          focusWithin: focused,
          ...(shows === undefined ? {} : { [shows]: offered && !blank && !disabled && !readonly }),
        },
      },
    },
  }
  return { behavior, clear, clears, edited, value: text }
}
