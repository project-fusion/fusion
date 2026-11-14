/**
 * What a text field that filters a list holds of the typing: the text, what the
 * list is narrowed by, the words it finishes, and the delay before it narrows.
 */
import { completionFor } from '@fusion.dev/helix-core/listbox'
import { useEffect, useRef, useState } from 'react'
import type { Entry } from './listbox-model'

/** What narrowing asks of the field around. */
export interface Narrowing {
  /** Asks and tells; answers whether the list may narrow. */
  readonly ask: (text: string) => boolean
  readonly delay: number
  readonly entriesFor: (text: string) => readonly Entry[]
  readonly suggests: boolean
}

/** Holds the text, its narrowing, and its completion. */
export const useTyping = (now: Narrowing) => {
  const [typed, setTyped] = useState('')
  const [filter, setFilter] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [editing, setEditing] = useState(false)
  const [onCreate, setOnCreate] = useState(false)
  const [selectsAll, setSelectsAll] = useState(false)
  const waiting = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<(() => void) | undefined>(undefined)
  const deleting = useRef(false)
  useEffect(() => () => clearTimeout(waiting.current), [])
  const cancel = (): void => {
    clearTimeout(waiting.current)
    pending.current = undefined
  }
  const narrow = (text: string, inserted: boolean): void => {
    cancel()
    const allowed = now.ask(text)
    if (allowed) {
      setFilter(text)
    }
    const seen = now.entriesFor(allowed ? text : filter)
    setSuggestion(now.suggests && inserted ? completionFor(text, seen) : '')
  }
  /* A phone's keyboard takes a selected completion away and says nothing of it, so a
     shorter text and a Backspace are both a deletion. */
  const edit = (text: string): void => {
    const inserted = !deleting.current && text.length >= typed.length
    deleting.current = false
    setSelectsAll(false)
    setTyped(text)
    setEditing(true)
    setOnCreate(false)
    cancel()
    if (now.delay > 0) {
      setSuggestion('')
      pending.current = () => narrow(text, inserted)
      waiting.current = setTimeout(() => narrow(text, inserted), now.delay)
    } else {
      narrow(text, inserted)
    }
  }
  const clear = (): void => {
    cancel()
    setTyped('')
    setFilter('')
    setSuggestion('')
    setEditing(false)
    setOnCreate(false)
  }
  return {
    clear,
    deleting,
    edit,
    editing,
    filter,
    flush: () => pending.current?.(),
    onCreate,
    selectsAll,
    setOnCreate,
    setSelectsAll,
    suggestion,
    typed,
  }
}
