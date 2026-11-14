/**
 * The machine a composer runs on a phone, over the field its entry holds: a send
 * that asks first and clears after, a stop, whether the reader is writing, and the
 * examples an empty field turns through.
 */
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import {
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { useReducedMotion } from '../render/motion'
import type { Family } from '../style/form'
import { ChatContext, type ChatOffer } from './chat'
import type { Entered } from './entry'
import { boundTo, given, tell } from './props'

/** How long an example shows, by its length, as the web's does. */
const shownFor = (example: string): number =>
  Math.min(10000, 6500 + Math.max(0, example.length - 40) * 60)

/** What a composer's `ref` holds, as the web element's members offer them. */
export interface ComposerHandle {
  send(): boolean
  readonly typing: boolean
}

/** Whether the reader is writing: from their first edit until they send, clear, or pause. */
const useWriting = (family: Family, props: Props, use: MachineUse, timeout: number) => {
  const writing = useRef(false)
  const pause = useRef<(() => void) | undefined>(undefined)
  const now = useRef({ family, props, timeout, use })
  now.current = { family, props, timeout, use }
  const mark = useCallback((typing: boolean) => {
    pause.current?.()
    pause.current = undefined
    if (typing) {
      pause.current = timers().timeout(Math.max(0, now.current.timeout), () => mark(false))
    }
    if (typing === writing.current) {
      return
    }
    writing.current = typing
    const event = boundTo(now.current.use, 'onTyping', 'event')
    if (event !== undefined) {
      tell(now.current.family, now.current.props, event, { typing })
    }
  }, [])
  useEffect(() => () => pause.current?.(), [])
  return { mark, writing }
}

/** The example the empty field shows, turning while nothing holds it. */
const useExample = (placeholders: readonly string[], fallback: string, held: boolean): string => {
  const [at, setAt] = useState(0)
  const reduced = useReducedMotion()
  const example = placeholders[at % Math.max(1, placeholders.length)]
  const count = placeholders.length
  useEffect(() => {
    if (count < 2 || held || reduced || example === undefined) {
      return undefined
    }
    return timers().timeout(shownFor(example), () => setAt((was) => was + 1))
  }, [count, example, held, reduced])
  return example ?? fallback
}

/** Whether what the field's rules say of a draft refuses it, which shows it wrong. */
const refusedDraft = (family: Family, props: Props, draft: string): boolean => {
  const shortest = given(family, props, 'minlength') as number | undefined
  const longest = given(family, props, 'maxlength') as number | undefined
  if (draft === '') {
    return given(family, props, 'required') === true
  }
  return (
    (shortest !== undefined && draft.length < shortest) ||
    (longest !== undefined && draft.length > longest)
  )
}

const wordsOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Whether a region was given anything. */
const has = (region: unknown): boolean => region !== undefined && region !== null

/** What the parts read of the regions and of the button. */
const statesFor = (
  flag: (name: string) => string,
  props: Props,
  facts: { readonly busy: boolean; readonly held: boolean; readonly idling: boolean },
): Readonly<Record<string, boolean | string>> => ({
  [flag('attachmentsEmpty')]: !has(props.attachments),
  [flag('endEmpty')]: !has(props.end),
  [flag('idling')]: facts.idling,
  [flag('mark')]: facts.busy ? 'stop' : 'arrow-elbow-down-left',
  [flag('sendHeld')]: facts.held,
  [flag('startEmpty')]: !has(props.start),
})

/** Marks the reader writing as their edits change the text. */
const useEditsWrite = (value: string, edited: boolean, mark: (typing: boolean) => void) => {
  const seen = useRef(value)
  useEffect(() => {
    if (seen.current !== value) {
      seen.current = value
      if (edited) {
        mark(value !== '')
      }
    }
  }, [edited, mark, value])
  return seen
}

/** What the field does beside its entry: holds the examples still, and sends on return. */
const fieldViewOf = (
  setFocused: (focused: boolean) => void,
  send: (() => boolean) | undefined,
) => ({
  onBlur: () => setFocused(false),
  onFocus: () => setFocused(true),
  ...(send === undefined
    ? {}
    : { onSubmitEditing: send, returnKeyType: 'send', submitBehavior: 'submit' }),
})

const blockedOf = (disabled: boolean, held: boolean, busy: boolean, queue: boolean): boolean =>
  disabled || held || (busy && !queue)

/** Whether the `idle` region stands in the button's place. */
const idlingOf = (props: Props, busy: boolean, attached: boolean, value: string): boolean =>
  !busy && has(props.idle) && !attached && value.trim() === ''

/** A send that asks first and clears after, and a stop. */
const sendingOf = (
  family: Family,
  props: Props,
  use: MachineUse,
  now: {
    readonly blocked: boolean
    readonly entered: Entered | undefined
    readonly mark: (typing: boolean) => void
    readonly offer: ChatOffer | undefined
    readonly seen: { current: string }
    readonly touch: () => void
  },
) => {
  const say = (name: string, detail: Readonly<Record<string, unknown>>): boolean => {
    const event = boundTo(use, name, 'event')
    return event === undefined || tell(family, props, event, detail)
  }
  const send = (): boolean => {
    const draft = (now.entered?.current() ?? '').trim()
    if (now.blocked) {
      return false
    }
    if (refusedDraft(family, props, draft)) {
      now.touch()
      return false
    }
    if (draft === '' || !say('onSend', { value: draft }) || now.offer?.send(draft) === false) {
      return false
    }
    /* Cleared only here, after nobody refused. */
    now.entered?.quietly('')
    now.seen.current = ''
    now.mark(false)
    return true
  }
  return {
    send,
    stop: () => {
      say('onStop', {})
    },
  }
}

/** Hosts the composer. */
export const useChatComposer = (
  family: Family,
  props: Props,
  use: MachineUse,
  entered: Entered | undefined,
  touch: () => void,
): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const offer = useContext(ChatContext)
  const value = entered?.current() ?? ''
  const busy = read('busy') === true
  const disabled = given(family, props, 'disabled') === true
  const sendDisabled = read('sendDisabled') === true
  const queue = read('queue') === true
  const { mark, writing } = useWriting(family, props, use, Number(read('typingTimeout') ?? 3000))
  const seen = useEditsWrite(value, entered?.edited === true, mark)

  const { send, stop } = sendingOf(family, props, use, {
    blocked: blockedOf(disabled, sendDisabled, busy, queue),
    entered,
    mark,
    offer,
    seen,
    touch,
  })
  useImperativeHandle(props.ref as Ref<ComposerHandle> | undefined, () => ({
    send,
    get typing() {
      return writing.current
    },
  }))

  const placeholders = (read('placeholders') as readonly string[] | undefined) ?? []
  const [focused, setFocused] = useState(false)
  const example = useExample(placeholders, wordsOf(read('placeholder')), focused || value !== '')
  const idling = idlingOf(props, busy, read('attached') === true, value)
  const held = disabled || (sendDisabled && !busy)
  const reason = wordsOf(read('sendReason'))
  const submits = read('submitOn') !== 'button'
  return {
    marks: [],
    parts: {
      field: { view: fieldViewOf(setFocused, submits ? send : undefined) },
      host: {
        states: {
          ...statesFor(flag, props, { busy, held, idling }),
          [flag('sendName')]: wordsOf(read(busy ? 'stopLabel' : 'sendLabel')),
          [flag('shownPlaceholder')]: example,
        },
      },
      send: {
        ...(held && reason !== '' ? { hint: reason } : {}),
        view: { onPress: busy ? stop : send },
      },
    },
  }
}
