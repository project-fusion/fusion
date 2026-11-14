/**
 * The machine a turn in a chat runs on a phone: its name, its time as a wall clock
 * moves it, what it says of itself to the chat around it, and a retry.
 *
 * **Core's `authorWords` and `turnName` name it**, as they do on the web.
 */
import { locale as localeOf } from '@fusion.dev/helix-core/capabilities/locale'
import { authorWords, relativeTime, TURN_WORDS, turnName } from '@fusion.dev/helix-core/chat'
import {
  Children,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { ChatContext } from './chat'
import { useWallClock } from './clocks'
import { boundTo, given, tell } from './props'
import { wordsOf } from './words'

const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The moment `at` holds, or nothing where it holds none. */
const momentOf = (at: string): Date | undefined => {
  if (at === '') {
    return undefined
  }
  const parsed = new Date(at)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/** The turn's state: what the prop says, until a retry that stood says `sending`. */
const useTurnState = (asked: string | undefined) => {
  const [own, setOwn] = useState<string | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  return [own ?? asked, setOwn] as const
}

/** Hosts one turn. */
export const useChatMessage = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const offer = useContext(ChatContext)
  const words = offer?.words ?? TURN_WORDS
  const author = read('author') as string | undefined
  const authorLabel = wordsIn(read('authorLabel'))
  const failedLabel = wordsIn(read('failedLabel'))
  const [state, setState] = useTurnState(read('state') as string | undefined)
  const moment = momentOf(wordsIn(read('at')))
  const lang = wordsIn(read('locale')) || localeOf().read()
  const now = useWallClock(
    (at) => (moment === undefined ? undefined : relativeTime(lang)(moment, new Date(at)).next),
    `${moment?.getTime()}|${lang}`,
  )
  const reading =
    moment === undefined ? '' : relativeTime(lang)(moment, new Date(now ?? Date.now())).text
  const by = authorWords(author, authorLabel, words)
  const text = wordsOf(props.children)
  const self = useRef({}).current

  /* What the chat around it reads of it, reported in its turn as every turn does. */
  const facts = useRef({ author, by, failed: failedLabel, id: self, state, text })
  facts.current = { author, by, failed: failedLabel, id: self, state, text }
  const epoch = offer?.epoch
  const report = offer?.report
  const changed = offer?.changed
  // biome-ignore lint/correctness/useExhaustiveDependencies: each round of reports is asked anew
  useLayoutEffect(() => {
    report?.(facts.current)
  }, [epoch, report])
  // biome-ignore lint/correctness/useExhaustiveDependencies: what it says is what the chat reads
  useEffect(() => {
    changed?.()
  }, [changed, author, by, failedLabel, state, text])
  useEffect(() => () => changed?.(), [changed])

  const retry = () => {
    const event = boundTo(use, 'onSend', 'event')
    const value = wordsOf(props.children)
    if (event !== undefined && !tell(family, props, event, { value })) {
      return
    }
    if (offer?.send(value) !== false) {
      setState('sending')
    }
  }
  const empty = Children.count(props.children as ReactNode) === 0 || props.children === ''
  /* Words directly beside elements are one paragraph, as a browser flows them. */
  const held = Children.toArray(props.children as ReactNode)
  const inline =
    held.some((child) => typeof child === 'string' && child.trim() !== '') && held.length > 1
  const has = (region: unknown): boolean => region !== undefined && region !== null
  return {
    marks: [],
    parts: {
      host: {
        states: {
          [flag('actionsEmpty')]: !has(props.actions),
          [flag('attachmentsEmpty')]: !has(props.attachments),
          [flag('contentEmpty')]: empty,
          [flag('failed')]: state === 'failed',
          [flag('inline')]: inline,
          [flag('named')]: turnName(by, reading, words),
          [flag('reading')]: reading,
          [flag('sending')]: state === 'sending',
          [flag('sourcesEmpty')]: !has(props.sources),
          [flag('waiting')]: state === 'streaming' && empty,
          [flag('workEmpty')]: !has(props.work),
        },
      },
      retry: { view: { onPress: retry } },
    },
  }
}
