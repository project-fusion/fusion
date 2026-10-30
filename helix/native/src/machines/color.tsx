/**
 * The color machine an element that declares `color` runs, as a color picker
 * does: a square a finger drags over and two ramps it composes, keys, text, a
 * number for each channel, presets, and a sample that copies.
 *
 * **Hue, saturation and brightness are held beside the value**, as the web
 * element holds them. Black has neither a hue nor a saturation to read back,
 * so a model read back from the value would turn red into gray after a drag to
 * the foot of the square. A value from anywhere else replaces them.
 *
 * **Each move asks first**, with the color it would leave as `value`, and a
 * refusal leaves the square where the value still is. `input` follows each
 * move that stands, and `change` follows once a drag, a key, typed text, or a
 * preset settles it.
 */
import { clipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  areaAt,
  areaKeyed,
  type ChannelField,
  COLOR_START,
  type Color,
  type ColorFormat,
  type ColorWords,
  channelFields,
  colorName,
  colorPresets,
  formatColor,
  hueAt,
  hueName,
  markAlong,
  nextColorFormat,
  parseColor,
  swatchKeyed,
  toRgb,
  wheelMark,
  wheelSlices,
  writeChannel,
} from '@fusion.dev/helix-core/color-picker'
import { sliderSaid } from '@fusion.dev/helix-core/slider'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  type ComponentType,
  createElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type AccessibilityActionEvent, type LayoutChangeEvent, StyleSheet } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useFocusVisible } from '../capabilities/focus-visible'
import { type Point, usePoint } from '../drivers/point'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import { direction } from '../render/styles'
import { svg } from '../render/vector'
import type { Family } from '../style/form'
import { boundTo, camel, given, type HelixEvent, senderOf, tell } from './props'
import { keyedTo } from './range'

/** The actions a screen reader moves an axis by. */
const ACTIONS = [
  { label: 'increment', name: 'increment' },
  { label: 'decrement', name: 'decrement' },
] as const

/** How long the sample says it copied, in milliseconds, as a copy button does. */
const COPIED_FOR = 1200

/** The words a prop holds. */
const wordsOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/** A color as React Native's color parser takes it. */
export const rnColor = (color: Color): string => {
  const { blue, green, red } = toRgb(color)
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, color.alpha / 100))})`
}

/** The color of a hue at full strength, which the ramp and the square paint. */
const tintOf = (hue: number): string =>
  rnColor({ alpha: 100, brightness: 100, hue, saturation: 100 })

/** What the value and the model stand at, between renders as well. */
interface Held {
  /** The value a page last wrote, which a new one replaces everything from. */
  readonly from: unknown
  /** The color a reader has moved to, while a value from elsewhere has not replaced it. */
  readonly moved: Color | undefined
  /** The text the value holds. */
  readonly value: string
}

/** The ring of hue a phone draws, wedges of a vector, since it has no conic gradient. */
const HueRing = ({ band }: { readonly band: number }): ReactNode => {
  const { Path, Svg } = svg()
  const slices = useMemo(() => wheelSlices(band), [band])
  return createElement(
    Svg as unknown as ComponentType<Record<string, unknown>>,
    {
      height: '100%',
      pointerEvents: 'none',
      style: StyleSheet.absoluteFill,
      viewBox: '0 0 100 100',
      width: '100%',
    },
    slices.map((slice) =>
      createElement(Path as unknown as ComponentType<Record<string, unknown>>, {
        d: slice.d,
        fill: tintOf(slice.hue),
        key: slice.hue,
      }),
    ),
  )
}

/** What a move asks before it stands, saying whether a handler let it. */
const asks = (
  family: Family,
  at: {
    readonly events: { readonly before: string | undefined }
    readonly props: Props
    readonly value: string
  },
  next: string,
): boolean =>
  at.events.before === undefined ||
  tell(family, at.props, at.events.before, { value: next }, senderOf(family, at.value))

/** Whether the text in the field is no color, once the reader has finished typing it. */
const flawOf = (draft: string | undefined, typing: boolean, value: string): boolean =>
  draft === undefined ? value !== '' && parseColor(value) === null : !typing

/** The value and the model an element holds: a written value replaces both, with nothing sent. */
const useHeldColor = (written: unknown, seed: unknown) => {
  const [held, hold] = useState<Held>(() => ({
    from: written,
    moved: undefined,
    value: wordsOf(written ?? seed),
  }))
  let now = held
  if (written !== held.from) {
    now = { from: written, moved: undefined, value: wordsOf(written) }
    hold(now)
  }
  return [now, hold] as const
}

/** The syntax the value is written in: the one the toggle walked to, until a page writes another. */
const useWalkedFormat = (written: ColorFormat | undefined) => {
  const [walked, setWalked] = useState<{
    readonly from: unknown
    readonly format: ColorFormat
  } | null>(null)
  const walk = useCallback((format: ColorFormat) => setWalked({ format, from: written }), [written])
  const format: ColorFormat =
    walked !== null && walked.from === written ? walked.format : (written ?? 'hex')
  return [format, walk] as const
}

/** What the words of the element read: its props, its locale, and a channel's name after its own. */
interface Said {
  readonly named: (channel: string) => string
  readonly where: string
  readonly word: (name: string) => string
  readonly words: Partial<ColorWords>
}

/** The ramps beside the sample: the hue, without a wheel, and the opacity, with `alpha`. */
const channelList = (
  color: Color,
  { named, where, word, words }: Said,
  shows: { readonly alpha: boolean; readonly wheel: boolean },
) => {
  const hue = hueName(
    { alpha: 100, brightness: 100, hue: color.hue, saturation: 100 },
    words,
    where,
  )
  return [
    {
      alphaHidden: true,
      channel: 'hue',
      hueHidden: false,
      key: 'hue',
      label: named(word('hue-label')),
      max: '360',
      said: `{value}, ${hue}`,
      shown: !shows.wheel,
      value: String(color.hue),
    },
    {
      alphaHidden: false,
      channel: 'alpha',
      hueHidden: true,
      key: 'alpha',
      label: named(word('opacity-label')),
      max: '100',
      said: sliderSaid(color.alpha / 100, { style: 'percent' }, where),
      shown: shows.alpha,
      value: String(color.alpha),
    },
  ].filter((one) => one.shown)
}

/** A row for each channel's number field. */
const fieldList = (fields: readonly ChannelField[], { named, word }: Said) =>
  fields.map((field) => {
    const label = word(`${field.channel === 'alpha' ? 'opacity' : field.channel}-label`)
    return {
      channel: field.channel,
      fieldName: named(label),
      inputmode: field.step < 1 ? 'decimal' : 'numeric',
      key: field.channel,
      word: label,
    }
  })

/** A row for each preset, with whether it is the color now. */
const swatchList = (presets: readonly string[], painted: string, { where, words }: Said) =>
  presets.map((preset, at) => {
    const parsed = parseColor(preset) ?? COLOR_START
    return {
      at,
      chosen: rnColor(parsed) === painted,
      color: rnColor(parsed),
      key: `${at}:${preset}`,
      name: colorName(parsed, words, where),
      preset,
    }
  })

/** A length along the square, in points once it is measured and a share of it before. */
const alongSquare = (share: number, length: number, mark: number): string =>
  length > 0 ? `${markAlong(share, length, mark)}px` : `${share * 100}%`

/** What the render reads of the color, each as words, by the field that names it. */
const computedWords = (at: {
  readonly bandShare: number
  readonly color: Color
  readonly copied: boolean
  readonly format: ColorFormat
  readonly laid: {
    readonly band: number
    readonly gap: number
    readonly height: number
    readonly mark: number
    readonly ring: number
    readonly width: number
  }
  readonly painted: string
  readonly said: Said
  readonly value: string
}): Readonly<Record<string, string>> => {
  const { color, format, laid, said, value } = at
  const { where, word, words } = said
  const name = colorName(color, words, where)
  const square = (first: 'brightness' | 'saturation'): string =>
    formatMessage(
      word('square-text'),
      {
        brightness: color.brightness / 100,
        brightnessLabel: word('brightness-label'),
        first,
        name,
        saturation: color.saturation / 100,
        saturationLabel: word('saturation-label'),
      },
      where,
    )
  const mark = wheelMark(color.hue, at.bandShare)
  return {
    brightness: String(color.brightness),
    formatLabel: formatMessage(word('format-label'), { format }, where),
    /* The web sets it in small capitals, which a phone's fonts do not all have. */
    formatWord: format.toUpperCase(),
    hue: String(color.hue),
    markX: alongSquare(color.saturation / 100, laid.width, laid.mark),
    markY: alongSquare(1 - color.brightness / 100, laid.height, laid.mark),
    painted: at.painted,
    reading: value,
    sampleLabel: at.copied
      ? word('copied-label')
      : formatMessage(word('copy-label'), { value }, where).trim(),
    saturation: String(color.saturation),
    square: square('saturation'),
    squareReversed: square('brightness'),
    tint: tintOf(color.hue),
    /* The square's corners keep the gap a ramp keeps from the band. */
    wheelGrid:
      laid.ring > 0 ? `${(laid.ring - laid.band * 2 - laid.gap * 2) * Math.SQRT1_2}px` : '60%',
    wheelX: `${mark.x * 100}%`,
    wheelY: `${mark.y * 100}%`,
  }
}

/** Each entry under the name the form binds its field to, where it binds one. */
const namedBy = <T,>(use: MachineUse, fields: Readonly<Record<string, T>>): Record<string, T> => {
  const out: Record<string, T> = {}
  for (const [field, value] of Object.entries(fields)) {
    const name = boundTo(use, field, 'state')
    if (name !== undefined) {
      out[name] = value
    }
  }
  return out
}

/** What a phone's color machine gives the element's verdict and its drawing. */
export interface Colored {
  readonly behavior: Behavior
  /** Whether the text in the field is no color, once the reader has finished typing it. */
  readonly flawed: boolean
  /** The text the value holds, which the verdict reads as its answer. */
  readonly value: string
}

/**
 * Hosts the color an element holds, as the expansion binds it. **No machine of
 * core's holds it**, as the web element holds its own: core's color picker
 * arithmetic says where each point and key takes it, the same the web reads.
 */
export const useColor = (
  family: Family,
  props: Props,
  use: MachineUse,
  touch: () => void,
): Colored => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const word = (name: string): string => wordsOf(given(family, props, name))
  const valueProp = boundTo(use, 'value', 'prop')
  const written = valueProp === undefined ? undefined : props[camel(valueProp)]
  const [now, hold] = useHeldColor(written, read('seed'))
  const value = now.value
  /* Text that is not a color stays in the field and out of the value, as a
     native number field keeps "12e". Any value at all replaces it. */
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const [typing, setTyping] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [swatchAt, setSwatchAt] = useState<number | undefined>(undefined)
  const [typedField, setTypedField] = useState<
    { readonly channel: string; readonly text: string } | undefined
  >(undefined)
  const writtenFormat = read('format') as ColorFormat | undefined
  const [format, walk] = useWalkedFormat(writtenFormat)
  const alpha = read('alpha') === true
  const disabled = given(family, props, 'disabled') === true
  const readonly = read('readonly') === true
  const where = word('locale') || locale().read()
  const words = (given(family, props, 'color-words') ?? {}) as Partial<ColorWords>

  /* The last value that was a color, so half-typed text leaves the square. */
  const settledText = useRef('')
  if (parseColor(value) !== null) {
    settledText.current = value
  }
  const color: Color =
    now.moved ?? parseColor(value) ?? parseColor(settledText.current) ?? COLOR_START

  const events = {
    before: boundTo(use, 'before', 'event'),
    change: boundTo(use, 'change', 'event'),
    copied: boundTo(use, 'copied', 'event'),
    input: boundTo(use, 'input', 'event'),
  }
  const latest = useRef({
    alpha,
    color,
    disabled,
    events,
    format,
    moved: now.moved,
    props,
    readonly,
    touch,
    value,
  })
  latest.current = {
    alpha,
    color,
    disabled,
    events,
    format,
    moved: now.moved,
    props,
    readonly,
    touch,
    value,
  }
  /** Whether the value has moved since `change` was last sent. */
  const unsettled = useRef(false)

  /** Asks for `next`, with what the model holds once it stands, and takes it, saying whether it did. */
  const request = useCallback(
    (next: string, moved: Color | undefined): boolean => {
      const at = latest.current
      const moves = next !== at.value
      if (at.readonly || (moves && !asks(family, at, next))) {
        return false
      }
      unsettled.current ||= moves
      latest.current = { ...at, color: moved ?? at.color, moved, value: next }
      hold((was) => ({ ...was, moved, value: next }))
      setDraft(undefined)
      if (next !== at.value && at.events.input !== undefined) {
        tell(family, at.props, at.events.input, {}, senderOf(family, next))
      }
      return true
    },
    [family, hold],
  )
  /** Sends `change` for a value that has settled, where it moved. */
  const settle = useCallback(() => {
    if (!unsettled.current) {
      return
    }
    unsettled.current = false
    const at = latest.current
    at.touch()
    if (at.events.change !== undefined) {
      tell(family, at.props, at.events.change, {}, senderOf(family, at.value))
    }
  }, [family])
  /** Moves part of the model and asks for the value that follows, saying whether it stood. */
  const move = useCallback(
    (next: Partial<Color>): boolean => {
      const at = latest.current
      if (at.readonly) {
        return false
      }
      const moved = { ...at.color, ...next }
      return request(formatColor(moved, at.format, at.alpha), moved)
    },
    [request],
  )
  /** Takes a value written out whole, keeping the hue where it is a gray with none to give. */
  const takeWritten = useCallback(
    (next: string): boolean => {
      const parsed = parseColor(next)
      if (parsed === null) {
        return false
      }
      const hueless = parsed.saturation === 0 || parsed.brightness === 0
      return request(next, hueless ? { ...parsed, hue: latest.current.color.hue } : parsed)
    },
    [request],
  )

  /* The nodes that take focus and keys. */
  const saturationNode = useRef<unknown>(null)
  const hueNode = useRef<unknown>(null)
  const listening = useRef<{ hue?: Stop | undefined; saturation?: Stop | undefined }>({})
  const heardOnSquare = useCallback(
    (press: KeyPress): boolean => {
      const at = latest.current
      if (at.disabled || at.readonly) {
        return false
      }
      const next = areaKeyed(at.color, {
        key: press.key,
        rtl: direction() === 'rtl',
        shift: press.shift === true,
      })
      if (next === undefined) {
        return false
      }
      move(next)
      settle()
      return true
    },
    [move, settle],
  )
  const heardOnHue = useCallback(
    (press: KeyPress): boolean => {
      const at = latest.current
      const to = keyedTo(press.key, at.color.hue, { max: 360, min: 0, step: 1 }, 36, false)
      if (to === undefined || at.disabled) {
        return false
      }
      move({ hue: Math.min(360, Math.max(0, to)) })
      settle()
      return true
    },
    [move, settle],
  )
  const saturationRef = useCallback(
    (node: unknown) => {
      listening.current.saturation?.()
      listening.current.saturation = undefined
      saturationNode.current = node
      if (node !== null) {
        listening.current.saturation = keys().listen(node, heardOnSquare)
      }
    },
    [heardOnSquare],
  )
  const hueRef = useCallback(
    (node: unknown) => {
      listening.current.hue?.()
      listening.current.hue = undefined
      hueNode.current = node
      if (node !== null) {
        listening.current.hue = keys().listen(node, heardOnHue)
      }
    },
    [heardOnHue],
  )
  const ringedSquare = useFocusVisible(() => saturationNode.current)
  const ringedHue = useFocusVisible(() => hueNode.current)

  /* What the drawing measures: the square, its mark, the ring, and its band. */
  const [laid, lay] = useState({ band: 0, gap: 0, height: 0, mark: 0, ring: 0, width: 0 })
  const measured = useCallback(
    (name: keyof typeof laid, along: 'height' | 'width') => (event: LayoutChangeEvent) => {
      const length = event.nativeEvent.layout[along]
      lay((was) => (was[name] === length ? was : { ...was, [name]: length }))
    },
    [],
  )
  const onMarkLayout = useMemo(() => measured('mark', 'width'), [measured])
  const onBandLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    lay((was) =>
      was.band === width && was.gap === height ? was : { ...was, band: width, gap: height },
    )
  }, [])

  const moves = !disabled && !readonly
  const rtl = direction() === 'rtl'
  const toSquare = (at: Point) => {
    if (at.width > 0 && at.height > 0) {
      move(areaAt(at.x, at.y, { height: at.height, left: 0, top: 0, width: at.width }, rtl))
    }
  }
  const square = usePoint({
    drag: toSquare,
    enabled: moves,
    press: (at) => {
      setDragging(true)
      if (saturationNode.current !== null) {
        focus().focus(saturationNode.current, false)
      }
      toSquare(at)
    },
    release: () => {
      setDragging(false)
      settle()
    },
  })
  const toRing = (at: Point) => {
    if (at.width > 0 && at.height > 0) {
      move({ hue: hueAt(at.x, at.y, { height: at.height, left: 0, top: 0, width: at.width }) })
    }
  }
  const ring = usePoint({
    /* A press in the square inside the ring is the square's. */
    accepts: (at) =>
      Math.abs(at.x - at.width / 2) > laid.width / 2 ||
      Math.abs(at.y - at.height / 2) > laid.height / 2,
    drag: toRing,
    enabled: moves,
    press: (at) => {
      if (hueNode.current !== null) {
        focus().focus(hueNode.current, false)
      }
      toRing(at)
    },
    release: settle,
  })
  const onSquareLayout = useCallback(
    (event: LayoutChangeEvent) => {
      square.measure(event)
      const { height, width } = event.nativeEvent.layout
      lay((was) => (was.height === height && was.width === width ? was : { ...was, height, width }))
    },
    [square],
  )
  const onRingLayout = useCallback(
    (event: LayoutChangeEvent) => {
      ring.measure(event)
      const { width } = event.nativeEvent.layout
      lay((was) => (was.ring === width ? was : { ...was, ring: width }))
    },
    [ring],
  )

  const onSquareAction = useCallback(
    (axis: 'brightness' | 'saturation') => (event: AccessibilityActionEvent) => {
      const by = event.nativeEvent.actionName === 'increment' ? 1 : -1
      move({ [axis]: Math.min(100, Math.max(0, latest.current.color[axis] + by)) })
      settle()
    },
    [move, settle],
  )
  const onHueAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const by = event.nativeEvent.actionName === 'increment' ? 1 : -1
      move({ hue: Math.min(360, Math.max(0, latest.current.color.hue + by)) })
      settle()
    },
    [move, settle],
  )

  /* The text field. */
  const onChangeValue = useCallback(
    (typed: string) => {
      if (latest.current.readonly) {
        return
      }
      setTyping(true)
      const parsed = parseColor(typed)
      if (parsed === null && typed.trim() !== '') {
        setDraft(typed)
        return
      }
      request(typed, parsed ?? undefined)
    },
    [request],
  )
  const onLeaveValue = useCallback(() => {
    setTyping(false)
    latest.current.touch()
    settle()
  }, [settle])

  /* The sample. */
  const ending = useRef<Stop | undefined>(undefined)
  useEffect(() => () => ending.current?.(), [])
  const onSample = useCallback(async () => {
    const at = latest.current
    if (at.value === '' || !(await clipboard().write(at.value))) {
      return
    }
    if (at.events.copied !== undefined) {
      tell(family, at.props, at.events.copied, { value: at.value })
    }
    ending.current?.()
    setCopied(true)
    ending.current = timers().timeout(COPIED_FOR, () => setCopied(false))
  }, [family])

  /* The syntax toggle, which rewrites the value in the syntax it walks to. */
  const onFormat = useCallback(() => {
    const at = latest.current
    if (at.readonly) {
      return
    }
    const next = nextColorFormat(at.format)
    latest.current = { ...at, format: next }
    walk(next)
    if (at.value !== '') {
      move({})
      settle()
    }
  }, [move, settle, walk])

  /* A preset, written from its own numbers where its syntax has them. */
  const choose = useCallback(
    (preset: string) => {
      const parsed = parseColor(preset)
      if (parsed === null) {
        return
      }
      const at = latest.current
      const fields = channelFields(preset, parsed, at.format, at.alpha)
      const first = fields[0]
      const exact = first && writeChannel(fields, at.format, at.alpha, first.channel, first.value)
      if (exact) {
        takeWritten(exact)
      } else {
        move(parsed)
      }
      settle()
    },
    [move, settle, takeWritten],
  )

  /* The presets' one stop, which the arrows, Home, and End move. */
  const swatchNodes = useRef(new Map<number, unknown>())
  const swatchRefs = useRef(new Map<number, (node: unknown) => void>())
  const swatchStops = useRef(new Map<number, Stop>())
  const presets = colorPresets(wordsOf(read('swatches')))
  const moveSwatch = useRef<(from: number, press: KeyPress) => boolean>(() => false)
  moveSwatch.current = (from, press) => {
    const to = swatchKeyed(press.key, from, presets.length - 1, direction() === 'rtl')
    if (to === undefined) {
      return false
    }
    const node = swatchNodes.current.get(to)
    setSwatchAt(to)
    if (node !== undefined) {
      focus().focus(node, false)
    }
    return true
  }
  const swatchRef = useCallback((at: number) => {
    let made = swatchRefs.current.get(at)
    if (made === undefined) {
      made = (node: unknown) => {
        swatchStops.current.get(at)?.()
        swatchStops.current.delete(at)
        if (node === null) {
          swatchNodes.current.delete(at)
          return
        }
        swatchNodes.current.set(at, node)
        swatchStops.current.set(
          at,
          keys().listen(node, (press: KeyPress) => moveSwatch.current(at, press)),
        )
      }
      swatchRefs.current.set(at, made)
    }
    return made
  }, [])

  /* What the element computes. */
  const owner = wordsOf(given(family, props, 'aria-label')) || word('label')
  const said: Said = {
    named: (channel) => (owner === '' ? channel : `${owner}, ${channel}`),
    where,
    word,
    words,
  }
  const channels = channelList(color, said, {
    alpha,
    wheel: given(family, props, 'wheel') === true,
  })
  const fieldRows = channelFields(value, color, format, alpha)
  const rows = fieldList(fieldRows, said)
  const painted = rnColor(color)
  const swatches = swatchList(presets, painted, said)
  const chosenAt = swatches.findIndex((one) => one.chosen)
  const swatchStop = swatchAt ?? (chosenAt >= 0 ? chosenAt : 0)
  const bandShare = laid.ring > 0 ? (laid.band * 2) / laid.ring : 0

  const fieldsLatest = useRef(fieldRows)
  fieldsLatest.current = fieldRows
  const parts: Record<string, PartBinding> = {}
  const place = (partKey: string, binding: PartBinding) => {
    const part = boundTo(use, `part-${partKey}`, 'part')
    if (part !== undefined) {
      parts[part] = binding
    }
  }
  place('grid', {
    states: { focusVisible: ringedSquare },
    view: { onLayout: onSquareLayout },
    wrap: (drawn) => <GestureDetector gesture={square.gesture}>{drawn}</GestureDetector>,
  })
  place('grid-mark', { view: { onLayout: onMarkLayout } })
  place('grid-saturation', {
    view: {
      accessibilityActions: ACTIONS,
      accessibilityState: { disabled },
      accessible: true,
      focusable: !disabled,
      onAccessibilityAction: onSquareAction('saturation'),
      ref: saturationRef,
    },
  })
  place('grid-brightness', {
    view: {
      accessibilityActions: ACTIONS,
      accessibilityState: { disabled },
      accessible: true,
      focusable: false,
      onAccessibilityAction: onSquareAction('brightness'),
    },
  })
  place('wheel', {
    states: { focusVisible: ringedHue },
    view: { onLayout: onRingLayout },
    wrap: (drawn) => <GestureDetector gesture={ring.gesture}>{drawn}</GestureDetector>,
  })
  place('wheel-hue', {
    view: {
      accessibilityActions: ACTIONS,
      accessibilityState: { disabled },
      accessible: true,
      focusable: !disabled,
      onAccessibilityAction: onHueAction,
      ref: hueRef,
    },
  })
  place('wheel-band', { view: { onLayout: onBandLayout } })
  place('wheel-ring', {
    wrap: () => (bandShare > 0 ? <HueRing band={bandShare} key="ring" /> : null),
  })
  place('sample', { view: { onPress: onSample } })
  place('format', { view: { onPress: onFormat } })
  place('channel', {
    copy: (item: Entry) => ({
      /* The picker's own move answers the ramp's request, so a refusal leaves
         the ramp where the color is. */
      onBeforeChange: (event: HelixEvent<{ value?: string }>) => {
        const channel = item.fields.channel === 'alpha' ? 'alpha' : 'hue'
        if (!move({ [channel]: Number(event.detail.value) })) {
          event.preventDefault()
        }
      },
      onChange: settle,
    }),
  })
  place('value', {
    view: {
      editable: !disabled && !readonly,
      onBlur: onLeaveValue,
      onChangeText: onChangeValue,
      onSubmitEditing: onLeaveValue,
      value: draft ?? value,
    },
  })
  place('field-input', {
    copy: (item: Entry) => {
      const channel = String(item.fields.channel)
      const field = fieldRows.find((one) => one.channel === channel)
      return {
        editable: !disabled && !readonly,
        onBlur: () => {
          setTypedField(undefined)
          settle()
        },
        onChangeText: (typed: string) => {
          setTypedField({ channel, text: typed })
          if (typed.trim() === '' || latest.current.readonly) {
            return
          }
          const at = latest.current
          const next = writeChannel(
            channelFields(at.value, at.color, at.format, at.alpha),
            at.format,
            at.alpha,
            field?.channel ?? 'red',
            Number(typed),
          )
          if (next !== null) {
            takeWritten(next)
          }
        },
        value: typedField?.channel === channel ? typedField.text : String(field?.value ?? ''),
      }
    },
  })
  place('swatch', {
    copy: (item: Entry) => {
      const at = Number(item.fields.at)
      const preset = String(item.fields.preset)
      return {
        accessibilityState: { disabled, selected: item.fields.chosen === true },
        focusable: !disabled && at === swatchStop,
        onPress: () => {
          setSwatchAt(at)
          choose(preset)
        },
        ref: swatchRef(at),
      }
    },
  })
  const computed = computedWords({ bandShare, color, copied, format, laid, painted, said, value })
  const lists = namedBy(use, { channels, fields: rows, presets: swatches })
  const states = namedBy(use, computed)
  parts.host = { lists, states }
  return {
    behavior: {
      marks: Object.entries({ copied, dragging })
        .filter(([, holds]) => holds)
        .map(([mark]) => mark),
      parts,
    },
    flawed: flawOf(draft, typing, value),
    value,
  }
}
