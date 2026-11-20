/**
 * The copy machine an element that declares a `copy` runs: a press on its
 * pressable that `copies` puts its text on the clipboard, and the result
 * stands for a moment, as a copy button confirms a copy.
 *
 * **The clipboard capability writes it**, expo-clipboard on a phone, as the
 * web's `CopyController` writes through the browser's clipboard, and **the
 * timers capability ends the result**, so a fake clock ends it on both
 * platforms alike. Empty text is not copied, and is a failed copy.
 *
 * **The result is what the element is named by** for its `after`: the words
 * for a copy confirmed, its `sends` event with the text as `value`, and its
 * part `data-copied`; or the words for a failure, its `fails` event, and its
 * part `data-failed`. The words are said to a screen reader too, politely, as
 * the web's live region says them. A press while a result stands starts it
 * again. The element is in the state `copied` or `failed` while it stands.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { clipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { waitOf } from './delay'
import { valued } from './gives'
import { boundTo, given, senderOf, tell } from './props'

/** Where a copy stands: at rest, or the result of the last press. */
type Result = 'copied' | 'failed' | 'resting'

/** What a copy gives the element: its behavior, and the copy a press runs. */
export interface Copied {
  readonly behavior: Behavior
  /** Copies the text, as a press on the part that copies does once its event stands. */
  readonly copy: () => void
  /** The pressable that copies. */
  readonly part: string
}

/**
 * Tells what became of a copy: its event, with the text as `value` where it
 * is on the clipboard, and its words, said to a screen reader.
 */
const told = (
  at: { readonly family: Family; readonly props: Props; readonly use: MachineUse },
  wrote: boolean,
  text: string,
): void => {
  const sender = senderOf(at.family, given(at.family, at.props, 'value'))
  const event = boundTo(at.use, wrote ? 'sends' : 'fails', 'event')
  if (event !== undefined) {
    tell(at.family, at.props, event, wrote ? { value: text } : {}, sender)
  }
  const name = boundTo(at.use, wrote ? 'words-copied' : 'words-failed', 'prop')
  const said = wordsOf(valued(at.family, at.props, name))
  if (said !== '') {
    announce().say(said, 'polite')
  }
}

/** Words a name says, or nothing. */
const wordsOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Hosts a copy on one element, as `use` binds it. */
export const useCopy = (family: Family, props: Props, use: MachineUse): Copied => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const [result, setResult] = useState<Result>('resting')
  const latest = useRef({ family, props, use })
  latest.current = { family, props, use }
  const ending = useRef<Stop | undefined>(undefined)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      ending.current?.()
    }
  }, [])
  const words = (at: Result): string => {
    const name = boundTo(use, `words-${at}`, 'prop')
    return wordsOf(valued(family, props, name))
  }
  const copy = useCallback(() => {
    const now = latest.current
    const text = wordsOf(given(now.family, now.props, boundTo(now.use, 'text', 'prop')))
    const writing = text === '' ? Promise.resolve(false) : clipboard().write(text)
    void writing.then((wrote) => {
      if (!alive.current) {
        return
      }
      const at = latest.current
      told(at, wrote, text)
      setResult(wrote ? 'copied' : 'failed')
      ending.current?.()
      const after = waitOf(given(at.family, at.props, boundTo(at.use, 'after', 'prop')))
      ending.current = timers().timeout(after > 0 ? after : 1200, () => {
        ending.current = undefined
        if (alive.current) {
          setResult('resting')
        }
      })
    })
  }, [])
  const named = (name: string | undefined, fallback: string) => name ?? fallback
  const copiedState = named(boundTo(use, 'copied', 'state'), 'copied')
  const failedState = named(boundTo(use, 'failed', 'state'), 'failed')
  const says = named(boundTo(use, 'says', 'state'), 'says')
  const standingAs = named(boundTo(use, 'told', 'state'), 'told')
  const standing = result === 'resting' ? '' : words(result)
  return {
    behavior: {
      marks: [],
      parts: {
        host: {
          states: {
            [copiedState]: result === 'copied',
            [failedState]: result === 'failed',
            [says]: result === 'resting' ? words('resting') : standing,
            [standingAs]: standing,
          },
        },
        [part]: {
          states: { 'data-copied': result === 'copied', 'data-failed': result === 'failed' },
        },
      },
    },
    copy,
    part,
  }
}
