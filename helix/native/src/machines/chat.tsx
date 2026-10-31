/**
 * The machine a chat runs on a phone: a transcript drawn in the box the `tail`
 * follows, from `turns` in a window or from the messages passed in, what a screen
 * reader is told as turns settle, the history asked for at the top, and a composer
 * kept above the software keyboard.
 *
 * **Core's `turnsToSay` finds what is new**, the arithmetic the web element reads.
 *
 * **The composer stays above the keyboard by what the chat measures**: the room
 * the keyboard takes from under the composer, and none where the app has moved the
 * chat out of its way already.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import {
  authorWords,
  declarationsOf,
  type HeardTurn,
  openingTurns,
  TURN_WORDS,
  type TurnMemory,
  type TurnWords,
  turnsToSay,
} from '@fusion.dev/helix-core/chat'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  Children,
  createContext,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Dimensions, type HostInstance, useColorScheme } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import { useKeyboard } from '../root/keyboard'
import type { Family } from '../style/form'
import { useBox } from './log'
import { type RowOrder, useRowOrder } from './notifications'
import { boundTo, given, tell } from './props'
import type { Tail } from './tail'
import type { DrawnRow, WindowDrawing, WindowScroller } from './window'

/** One turn handed over as data. */
export interface ChatTurnData {
  readonly at?: string
  readonly author?: string
  readonly authorLabel?: string
  readonly key?: string
  readonly state?: string
  readonly text: string
}

/** What a chat offers the elements passed into it. */
export interface ChatOffer extends RowOrder<HeardTurn> {
  /** A turn or a composer offering words to send, which answers whether it stands. */
  readonly send: (value: string) => boolean
  /** What every turn is named with, in the chat's language. */
  readonly words: TurnWords
}

/** The chat an element passed in stands in. */
export const ChatContext = createContext<ChatOffer | undefined>(undefined)

/** One turn a chat draws from data. */
interface ChatRow extends DrawnRow {
  readonly last: boolean
  readonly later: boolean
  readonly turn: ChatTurnData
}

/** What a chat's `ref` holds, as the web element's members offer them. */
export interface ChatHandle {
  readonly pinned: boolean
  resume(): void
}

const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Keeps the object of each row whose turn did not change, so its drawing is kept. */
const useRows = (turns: readonly ChatTurnData[]): readonly ChatRow[] => {
  const held = useRef(new Map<string, ChatRow>())
  return useMemo(() => {
    const next = new Map<string, ChatRow>()
    const final = turns.length - 1
    const rows = turns.map((turn, at) => {
      const key = turn.key ?? String(at)
      const was = held.current.get(key)
      const row: ChatRow =
        was !== undefined && was.turn === turn && was.at === at && was.last === (at === final)
          ? was
          : { at, header: false, key, last: at === final, later: at > 0, turn }
      next.set(key, row)
      return row
    })
    held.current = next
    return rows
  }, [turns])
}

/** How many older turns a list takes at a time, as a reader nears the top of what it holds. */
const BATCH = 40

/**
 * The turns a list holds: those from the newest back, and more as a reader nears
 * the top of them.
 *
 * **A list opens at its end only where it holds no turn it has not measured.**
 * `scrollToEnd` lands where the rows it has drawn end, so a list of 2,000 turns stopped
 * at the 18th and went on drawing. `maintainVisibleContentPosition` holds the reader
 * as the list takes the turns above them.
 */
const useHeldRows = (
  rows: readonly ChatRow[],
): { readonly held: readonly ChatRow[]; readonly older: () => void; readonly all: boolean } => {
  const [firstKey, setFirstKey] = useState<string | undefined>(undefined)
  const found = firstKey === undefined ? -1 : rows.findIndex((row) => row.key === firstKey)
  const start = found >= 0 ? found : Math.max(0, rows.length - BATCH)
  const now = useRef({ rows, start })
  now.current = { rows, start }
  const older = useCallback(() => {
    const { rows: every, start: from } = now.current
    if (from > 0) {
      setFirstKey(every[Math.max(0, from - BATCH)]?.key)
    }
  }, [])
  const held = useMemo(() => (start === 0 ? rows : rows.slice(start)), [rows, start])
  return { all: start === 0, held, older }
}

/** The drawing of each row, kept until what every row reads changes. */
const useKept = (revision: string, hooks: unknown): WeakMap<DrawnRow, ReactNode> => {
  const kept = useRef({ hooks, revision, rows: new WeakMap<DrawnRow, ReactNode>() })
  if (kept.current.revision !== revision || kept.current.hooks !== hooks) {
    kept.current = { hooks, revision, rows: new WeakMap() }
  }
  return kept.current.rows
}

/** What a screen reader hears as turns settle, as the web's status region says. */
const useSaid = (
  heard: readonly HeardTurn[],
  phrase: (turn: HeardTurn) => string,
  opening: boolean,
): string => {
  const memory = useRef<TurnMemory>({ newest: undefined, pending: new Set() })
  const [said, say] = useState('')
  const phrased = useRef(phrase)
  phrased.current = phrase
  useLayoutEffect(() => {
    if (opening) {
      memory.current = openingTurns(heard)
      return
    }
    const { memory: next, say: told } = turnsToSay(heard, memory.current)
    memory.current = next
    if (told.length > 0) {
      const words = told.map((turn) => phrased.current(turn)).join(' ')
      announce().say(words, 'polite')
      say(words)
    }
  }, [heard, opening])
  return said
}

/** Whether the first frame has passed: what stands before it is what the chat opened with. */
const useOpening = (): boolean => {
  const [opening, open] = useState(true)
  useEffect(() => {
    const frame = requestAnimationFrame(() => open(false))
    return () => cancelAnimationFrame(frame)
  }, [])
  return opening
}

/** Fires `history` once for each time a reader reaches the top. */
const useReach = (
  history: string,
  threshold: number,
  opening: boolean,
  ask: () => void,
): ((offset: number, frame: number) => void) => {
  const asked = useRef(false)
  const at = useRef<number | undefined>(undefined)
  const now = useRef({ ask, history, opening, threshold })
  now.current = { ask, history, opening, threshold }
  const reach = useCallback((offset: number, frame: number) => {
    if (frame <= 0) {
      return
    }
    at.current = offset
    const { history: more, opening: early, threshold: near } = now.current
    if (early || more !== 'more') {
      return
    }
    if (offset > Math.max(0, near)) {
      asked.current = false
    } else if (!asked.current) {
      asked.current = true
      now.current.ask()
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: a change of `history` is an arrival anew
  useEffect(() => {
    asked.current = false
    if (!opening && at.current !== undefined) {
      reach(at.current, 1)
    }
  }, [history, opening, reach])
  return reach
}

/**
 * The room the keyboard takes from under the composer, and how tall the chat stood
 * as it arrived.
 *
 * **The chat holds its height while the keyboard shows.** The transcript gives up
 * the room and what stands under it moves up into it, so a chat as tall as its turns
 * does not grow to keep the room, which would leave the composer where it stood.
 */
const useLift = () => {
  const keyboard = useKeyboard('avoid')
  const [{ height, lift }, set] = useState({ height: 0, lift: 0 })
  const node = useRef<HostInstance | null>(null)
  const composerRef = useCallback((next: HostInstance | null) => {
    node.current = next
  }, [])
  const stood = useRef(0)
  const onLayout = useCallback(
    ({
      nativeEvent,
    }: {
      readonly nativeEvent: { readonly layout: { readonly height: number } }
    }) => {
      if (keyboardNow.current === 0) {
        stood.current = nativeEvent.layout.height
      }
    },
    [],
  )
  const keyboardNow = useRef(keyboard)
  keyboardNow.current = keyboard
  const lifted = useRef(0)
  useEffect(() => {
    if (keyboard === 0) {
      lifted.current = 0
      set({ height: 0, lift: 0 })
      return
    }
    node.current?.measureInWindow((_x, y, _width, tall) => {
      const bottom = y + tall + lifted.current
      const next = Math.max(0, bottom - (Dimensions.get('window').height - keyboard))
      lifted.current = next
      set({ height: stood.current, lift: next })
    })
  }, [keyboard])
  return { composerRef, height, lift, onLayout }
}

/** What a list of turns draws with. */
const drawingOf = (
  tail: Tail | undefined,
  moved: (offset: number, frame: number, content: number) => void,
  rows: readonly ChatRow[],
  listRef: (list: WindowScroller | null) => void,
  kept: WeakMap<DrawnRow, ReactNode>,
  fed: boolean,
): WindowDrawing => ({
  across: 1,
  gap: 0,
  horizontal: false,
  initial: BATCH,
  kept,
  laid: () => undefined,
  listRef,
  measured: () => undefined,
  moved,
  plain: !fed,
  rows,
  shrinks: true,
  ...(tail === undefined
    ? {}
    : { maintainVisibleContentPosition: tail.maintainVisibleContentPosition }),
})

/** The declarations for each author, as an object or the JSON the web's attribute holds. */
const stylesOf = (given_: unknown): Readonly<Record<string, string>> | undefined => {
  if (typeof given_ !== 'string') {
    return given_ as Readonly<Record<string, string>> | undefined
  }
  try {
    return JSON.parse(given_) as Readonly<Record<string, string>>
  } catch {
    return undefined
  }
}

/** What a message drawn for one turn takes. */
const messageOf =
  (styles: Readonly<Record<string, string>> | undefined, failedLabel: string) =>
  (item: Entry): Readonly<Record<string, unknown>> => {
    const { turn } = item.fields as unknown as ChatRow
    const style = turn.author === undefined ? undefined : styles?.[turn.author]
    return {
      at: turn.at ?? '',
      author: turn.author,
      authorLabel: turn.authorLabel ?? '',
      children: turn.text,
      failedLabel,
      state: turn.state,
      ...(style === undefined ? {} : { style: declarationsOf(style) }),
    }
  }

/** A turn from data as the announcer reads it. */
const heardOf = (turn: ChatTurnData, words: TurnWords, failed: string): HeardTurn => ({
  author: turn.author,
  by: authorWords(turn.author, turn.authorLabel ?? '', words),
  failed,
  id: turn.key ?? turn,
  state: turn.state,
  text: turn.text,
})

/** Whether a region was given anything. */
const has = (region: unknown): boolean => region !== undefined && region !== null

/** What the parts read of the regions and of what stands in place of turns. */
const statesOf = (
  props: Props,
  flag: (name: string) => string,
  facts: {
    readonly fed: boolean
    readonly history: string
    readonly holds: boolean
    readonly label: string
    readonly loading: boolean
    readonly said: string
    readonly typing: string
    readonly typingWords: string
  },
): Readonly<Record<string, boolean | string>> => ({
  [flag('actionsEmpty')]: !has(props.actions),
  [flag('blank')]: !facts.fed && !facts.holds && !facts.loading,
  [flag('busy')]: facts.loading || facts.history === 'loading',
  [flag('composerEmpty')]: !has(props.composer),
  [flag('headerEmpty')]: !has(props.header) && !has(props.actions),
  [flag('historyShown')]: facts.history === 'loading',
  [flag('loadingShown')]: facts.loading,
  [flag('named')]: facts.label,
  [flag('said')]: facts.said,
  [flag('scrolls')]: !facts.fed,
  [flag('statusEmpty')]: !has(props.status) && facts.typing === '',
  [flag('typingWords')]: facts.typingWords,
  [flag('windowed')]: facts.fed,
})

/** What moves up over the room the keyboard gave up. */
const raisedOf = (lift: number): Readonly<Record<string, unknown>> =>
  lift === 0 ? {} : { style: { top: -lift } }

/** The box the transcript scrolls in, which hears where it stands for what asks for more. */
const useChatBox = (
  tail: Tail | undefined,
  fed: boolean,
  all: boolean,
  older: () => void,
  reach: (offset: number, frame: number) => void,
) => {
  const tailMoved = tail?.moved
  const allNow = useRef(all)
  allNow.current = all
  const moved = useCallback(
    (offset: number, frame: number, content: number) => {
      tailMoved?.(offset, frame, content)
      if (frame > 0 && offset < frame) {
        older()
      }
      if (allNow.current) {
        reach(offset, frame)
      }
    },
    [older, reach, tailMoved],
  )
  const boxTail = useMemo(
    () => (tail === undefined ? undefined : { ...tail, moved }),
    [tail, moved],
  )
  return { moved, ...useBox(boxTail, fed) }
}

/** What is said for a turn, as the web's `phrase` says it. */
const phraseOf =
  (arrival: string, failedTurn: string, lang: string) =>
  (turn: HeardTurn): string => {
    if (turn.state === 'failed') {
      return formatMessage(failedTurn, { failed: turn.failed, text: turn.text }, lang)
    }
    return turn.by === ''
      ? turn.text
      : formatMessage(arrival, { author: turn.by, text: turn.text }, lang)
  }

/** Older turns loading are said through the same voice, as the web's region does. */
const useHistorySaid = (history: string, text: string): void => {
  const was = useRef(history)
  useEffect(() => {
    if (history === 'loading' && was.current !== 'loading') {
      announce().say(text, 'polite')
    }
    was.current = history
  }, [history, text])
}

/** The box goes to the end as turns arrive, and as it gives up room, while a reader follows. */
const useFollowing = (tail: Tail | undefined, count: number, lift: number): void => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: these are when the box moves
  useLayoutEffect(() => {
    if (tail?.following === true) {
      tail.stick()
    }
  }, [count, lift, tail?.following])
}

/** What the elements passed in read of the chat, and how they send through it. */
const useOffer = (
  family: Family,
  props: Props,
  use: MachineUse,
  parts: Pick<ChatOffer, 'changed' | 'epoch' | 'report' | 'words'>,
): ChatOffer => {
  const now = useRef(props)
  now.current = props
  const send = useCallback(
    (value: string) => {
      const event = boundTo(use, 'onSend', 'event')
      return event === undefined || tell(family, now.current, event, { value })
    },
    [family, use],
  )
  const { changed, epoch, report, words } = parts
  return useMemo(
    () => ({ changed, epoch, report, send, words }),
    [changed, epoch, report, send, words],
  )
}

/** What a chat's `ref` holds. */
const useChatHandle = (ref: unknown, tail: Tail | undefined): void => {
  const resume = tail?.resume
  const following = tail?.following
  useImperativeHandle(
    ref as Ref<ChatHandle> | undefined,
    () => ({
      get pinned() {
        return following ?? true
      },
      resume: () => resume?.(),
    }),
    [following, resume],
  )
}

/** The custom states a chat is in. */
const marksOf = (empty: boolean, loading: boolean, typing: boolean): readonly string[] => [
  ...(empty ? ['empty'] : []),
  ...(loading ? ['loading'] : []),
  ...(typing ? ['typing'] : []),
]

const hostViewOf = (onLayout: unknown, lift: number, height: number) => ({
  onLayout,
  ...(lift === 0 || height === 0 ? {} : { style: { maxHeight: height } }),
})

const logViewOf = (tail: Tail | undefined, fed: boolean, lift: number, scrollerRef: unknown) => ({
  ...(lift === 0 ? {} : { style: { marginBottom: lift } }),
  ...(fed || tail === undefined
    ? {}
    : { maintainVisibleContentPosition: tail.maintainVisibleContentPosition }),
  indicators: true,
  scrollerRef,
})

const resumeViewOf = (tail: Tail | undefined, slotted: boolean, lift: number) => ({
  ...(slotted ? { onTouchEnd: () => tail?.resume() } : {}),
  ...raisedOf(lift),
})

/** Hosts the chat. */
export const useChat = (
  family: Family,
  props: Props,
  use: MachineUse,
  tail: Tail | undefined,
): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const turns = (read('turns') as readonly ChatTurnData[] | undefined) ?? []
  const fed = turns.length > 0
  const { all, held, older } = useHeldRows(useRows(turns))
  const rows = held
  const { changed, epoch, report, rows: passed } = useRowOrder<HeardTurn>()
  const opening = useOpening()
  const history = wordsIn(read('history'))
  const failedLabel = wordsIn(read('failedLabel'))
  const me = wordsIn(read('meLabel')) || TURN_WORDS.me
  const sentence = wordsIn(read('messageLabel')) || TURN_WORDS.sentence
  const named = wordsIn(read('turnLabel')) || TURN_WORDS.turn
  const words = useMemo<TurnWords>(() => ({ me, sentence, turn: named }), [me, named, sentence])

  const onHistory = boundTo(use, 'onHistory', 'event')
  const reach = useReach(history, Number(read('threshold') ?? 48), opening, () => {
    if (onHistory !== undefined) {
      tell(family, props, onHistory, {})
    }
  })
  const { moved, listRef, scrollerRef } = useChatBox(tail, fed, all, older, reach)

  const heard = useMemo<readonly HeardTurn[]>(
    () => (fed ? turns.map((turn) => heardOf(turn, words, failedLabel)) : passed),
    [failedLabel, fed, passed, turns, words],
  )
  const lang = locale().read()
  const said = useSaid(
    heard,
    phraseOf(wordsIn(read('arrivalLabel')), wordsIn(read('failedTurnLabel')), lang),
    opening,
  )
  useHistorySaid(history, wordsIn(read('historyText')))
  const { composerRef, height, lift, onLayout } = useLift()
  useFollowing(tail, fed ? rows.length : passed.length, lift)
  const offer = useOffer(family, props, use, { changed, epoch, report, words })
  useChatHandle(props.ref, tail)
  const scheme = useColorScheme()
  const kept = useKept([words.me, failedLabel, scheme].join('|'), props.hooks)
  const typing = wordsIn(read('typing'))
  const typingWords =
    typing === '' ? '' : formatMessage(wordsIn(read('typingLabel')), { author: typing }, lang)
  const loading = given(family, props, 'loading') === true
  const label = wordsIn(read('label'))
  const holds = Children.count(props.children as ReactNode) > 0
  return {
    marks: marksOf(!fed && !holds, history === 'loading', typing !== ''),
    parts: {
      composer: { view: { ref: composerRef, ...raisedOf(lift) } },
      host: {
        lists: { [boundTo(use, 'list', 'state') ?? 'rows']: rows },
        states: statesOf(props, flag, {
          fed,
          history,
          holds,
          label: label || wordsIn(read('fallbackLabel')),
          loading,
          said,
          typing,
          typingWords,
        }),
        view: hostViewOf(onLayout, lift, height),
      },
      log: { view: logViewOf(tail, fed, lift, scrollerRef) },
      message: { copy: messageOf(stylesOf(read('authorStyles')), failedLabel) },
      resume: { view: resumeViewOf(tail, has(props.resume), lift) },
      status: { view: raisedOf(lift) },
      turns: { windowed: drawingOf(tail, moved, rows, listRef, kept, fed) },
    },
    provide: (held: ReactNode): ReactNode => (
      <ChatContext.Provider value={offer}>{held}</ChatContext.Provider>
    ),
  }
}
