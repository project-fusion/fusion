/**
 * A playlist on a phone, and the menu of its entries a player's bar holds:
 * which entry is current and how a reader moves between them, the player it
 * drives, and what a screen reader hears.
 *
 * **The entries are what is passed in**, each a `VideoPlaylistItem`, told
 * whether it is current and heard as it asks to play. **The player is what is
 * passed into `player`**, told the current entry's `src`, `poster`, name and
 * title as it draws, and played through its handle once a reader chose an
 * entry, as the web's playlist sets the player's properties and calls `play`.
 *
 * **The current entry moves** on a press, on the player's previous and next,
 * and at the end of a clip, through core's `queue`, each move asked of
 * `before-activate` with its `cause`, then sent as `activate`, and said in the
 * words of `playing-label`.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import {
  type Queue,
  type QueueMove,
  queueEnded,
  queueStep,
  type Repeat,
} from '@fusion.dev/helix-core/queue'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { kebab } from './date-picker-read'
import { boundTo, given, type HelixEvent, tell } from './props'

/** The tag a playlist entry's component carries. */
const ENTRY = 'helix-video-playlist-item'

const words = (value: unknown): string => (typeof value === 'string' ? value : '')

/** An entry passed in, with what the player and the menu read of it. */
interface Clip {
  readonly disabled: boolean
  readonly element: ReactElement<Readonly<Record<string, unknown>>>
  readonly poster: string
  readonly src: string
  readonly text: string
  readonly value: string
}

/** The words a node holds, its strings and its children's, as the web's `text` reads them. */
const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((one) =>
      typeof one === 'string' || typeof one === 'number'
        ? String(one)
        : isValidElement<{ children?: ReactNode; slot?: string }>(one) &&
            one.props.slot === undefined
          ? textOf(one.props.children)
          : '',
    )
    .join('')
    .trim()

/** Whether `child` is a playlist entry. */
const isClip = (child: ReactNode): child is ReactElement<Readonly<Record<string, unknown>>> =>
  isValidElement(child) && (child.type as { readonly tag?: unknown }).tag === ENTRY

/** The entries passed in that have a value, in the order written. */
const clipsOf = (children: unknown): readonly Clip[] =>
  Children.toArray(children as ReactNode)
    .filter(isClip)
    .map((element) => ({
      disabled: element.props.disabled === true,
      element,
      poster: words(element.props.poster),
      src: words(element.props.src),
      text: textOf(element.props.children as ReactNode),
      value: words(element.props.value),
    }))
    .filter((clip) => clip.value !== '')

/** What a playlist offers the menu of its entries in a player's bar. */
export interface PlaylistOffer {
  readonly choose: (value: string) => void
  readonly clips: readonly Clip[]
  readonly current: string | undefined
}

/** The playlist around a menu of its entries. */
export const PlaylistContext = createContext<PlaylistOffer | undefined>(undefined)

/** The entry held current, where the page does not hold it. */
const useActive = (asked: unknown, start: string) => {
  const [own, setOwn] = useState<string | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  return [own ?? (typeof asked === 'string' && asked !== '' ? asked : start), setOwn] as const
}

/** A player's handle, as Video's ref gives it. */
interface Handle {
  readonly play?: () => Promise<void> | void
  readonly seek?: (seconds: number) => void
}

/** The moves a playlist makes, made once for the playlist's life. */
const useMoves = (family: Family, props: Props, use: MachineUse, clips: readonly Clip[]) => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const enabled = clips.filter((clip) => !clip.disabled)
  const [active, setActive] = useActive(props.active, words(read('defaultActive')))
  const current = enabled.find((clip) => clip.value === active) ?? enabled[0]
  const [ended, setEnded] = useState(false)
  const dealt = useRef<readonly string[] | undefined>(undefined)
  const chased = useRef(false)
  const player = useRef<Handle | null>(null)
  const now = useRef({ current, enabled, props, read })
  now.current = { current, enabled, props, read }
  const queue = (): Queue => {
    const repeat = now.current.read('repeat')
    return {
      current: now.current.current?.value,
      dealt: dealt.current,
      repeat: repeat === 'all' || repeat === 'one' ? (repeat as Repeat) : undefined,
      shuffle: now.current.read('shuffle') === true,
      values: now.current.enabled.map((clip) => clip.value),
    }
  }
  const request = (to: string, cause: string): boolean => {
    const latest = now.current
    const before = boundTo(use, 'onBeforeActivate', 'event')
    if (before !== undefined && !tell(family, latest.props, before, { cause, value: to })) {
      return false
    }
    chased.current = true
    setActive(to)
    setEnded(false)
    const after = boundTo(use, 'onActivate', 'event')
    if (after !== undefined) {
      tell(family, latest.props, after, { previous: latest.current?.value ?? '', value: to })
    }
    return true
  }
  const apply = (move: QueueMove, cause: string) => {
    if (move.kind === 'replay') {
      player.current?.seek?.(0)
      void player.current?.play?.()
    } else if (move.kind === 'end') {
      setEnded(true)
      const end = boundTo(use, 'onEnd', 'event')
      if (end !== undefined) {
        tell(family, now.current.props, end, {})
      }
    } else if (move.kind === 'play') {
      request(move.to, cause)
    }
  }
  return {
    advances: () => now.current.read('noAdvance') !== true,
    apply,
    chased,
    current,
    dealt,
    ended,
    player,
    queue,
    request,
  }
}

/** Plays the entry a reader chose, once the player has drawn it, and says it. */
const usePlayChosen = (moves: ReturnType<typeof useMoves>, said: string) => {
  const value = moves.current?.value
  useEffect(() => {
    if (!moves.chased.current || value === undefined) {
      return
    }
    moves.chased.current = false
    if (said !== '') {
      announce().say(said, 'polite')
    }
    void moves.player.current?.play?.()
  }, [moves, said, value])
}

/** The player passed in, told what to play and heard as it ends or asks to move. */
const drawPlayer = (player: unknown, moves: ReturnType<typeof useMoves>): ReactNode => {
  if (!isValidElement<Readonly<Record<string, unknown>>>(player)) {
    return player as ReactNode
  }
  const { current } = moves
  const step = (by: number) => {
    const { dealt, move } = queueStep(moves.queue(), by)
    moves.dealt.current = dealt
    moves.apply(move, by > 0 ? 'next' : 'previous')
  }
  return cloneElement(player, {
    ...(current === undefined
      ? {}
      : {
          mediaTitle: current.text,
          poster: current.poster,
          src: current.src,
          ...(words(player.props.label) === '' ? { label: current.text } : {}),
        }),
    onEnded: () => {
      const { dealt, move } = queueEnded(moves.queue(), moves.advances())
      moves.dealt.current = dealt
      moves.apply(move, 'ended')
    },
    onNext: () => step(1),
    onPrevious: () => step(-1),
    ref: (handle: Handle | null) => {
      moves.player.current = handle
    },
  })
}

/** Hosts a playlist. */
export const useVideoPlaylist = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const lang = locale().read()
  const clips = clipsOf(props.children)
  const moves = useMoves(family, props, use, clips)
  const { current } = moves
  const said =
    current === undefined
      ? ''
      : formatMessage(words(read('playingLabel')), { title: current.text }, lang)
  usePlayChosen(moves, said)
  const choose = (value: string) => {
    if (value === current?.value) {
      void moves.player.current?.play?.()
    } else {
      moves.request(value, 'press')
    }
  }
  const drawnClip = (clip: Clip) =>
    cloneElement(clip.element, {
      current: clip.value === current?.value,
      key: clip.element.key ?? clip.value,
      onBeforeSelect: (event: HelixEvent<{ value?: string }>) => {
        const own = clip.element.props.onBeforeSelect
        if (typeof own === 'function') {
          own(event)
        }
        if (!event.defaultPrevented) {
          choose(clip.value)
        }
      },
    })
  /* The entries told which plays, and what else is passed in kept in its place, as a menu of them. */
  const entries = Children.toArray(props.children as ReactNode).map((child) => {
    const clip = isValidElement(child)
      ? clips.find((one) => one.element.key === child.key)
      : undefined
    return clip === undefined ? child : drawnClip(clip)
  })
  const offer: PlaylistOffer = { choose, clips, current: current?.value }
  return {
    marks: moves.ended ? ['ended'] : [],
    parts: {
      host: {
        states: {
          [flag('empty')]: clips.length === 0,
          [flag('emptyWords')]: words(read('emptyLabel')) || words(read('emptyText')),
          [flag('named')]: words(read('label')) || words(read('fallbackLabel')),
        },
      },
    },
    provide: (drawn) => <PlaylistContext.Provider value={offer}>{drawn}</PlaylistContext.Provider>,
    regions: { default: entries, player: drawPlayer(props.player, moves) },
  }
}

/** Hosts the menu of a playlist's entries. */
export const useVideoPlaylistMenu = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, kebab(name))
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const offer = useContext(PlaylistContext)
  const rows = (offer?.clips ?? []).map((clip) => ({
    checked: clip.value === offer?.current,
    disabled: clip.disabled,
    label: clip.text,
    poster: clip.poster,
    value: clip.value,
  }))
  const before = boundTo(use, 'onBeforeSelect', 'event')
  return {
    marks: [],
    parts: {
      entry: {
        copy: (item: Entry) => ({
          onBeforeSelect: () => {
            const value = String(item.fields.value ?? '')
            if (before === undefined || tell(family, props, before, { value })) {
              offer?.choose(value)
            }
          },
        }),
      },
      host: {
        lists: { [flag('rows')]: rows },
        states: { [flag('named')]: words(read('label')) || words(read('fallbackLabel')) },
      },
    },
  }
}
