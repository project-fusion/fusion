import {
  createContext,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { type LayoutChangeEvent, StyleSheet, Text, type TextProps } from 'react-native'

/**
 * The width words wrap at inside a part that scrolls both ways: the part's
 * own frame. React Native lays out a scroll view across with no width to
 * wrap at, so a long line stood on one line there. The web wraps a paragraph
 * at the scroll box's width, and a phone does the same with this.
 */
export const WrapWidth = createContext<number | undefined>(undefined)

/**
 * The width words wrap at inside a part that scrolls both ways, where they
 * stand in one, for words a renderer of its own draws, as the JSX runtime's
 * `span` is.
 */
export const useWrapWidth = (): number | undefined => useContext(WrapWidth)

/** Whether the words are drawn inside other words, which lay them out. */
const InText = createContext(false)

/**
 * Whether words held to one line run past their box as the web draws them:
 * one line with nothing to end it, no box that clips it, and no width of
 * their own.
 */
const spills = (
  children: unknown,
  numberOfLines: unknown,
  ellipsizeMode: unknown,
  drawn: Readonly<Record<string, unknown>>,
): boolean =>
  (typeof children === 'string' || typeof children === 'number') &&
  numberOfLines === 1 &&
  ellipsizeMode === undefined &&
  drawn.overflow !== 'hidden' &&
  ['width', 'minWidth', 'maxWidth', 'flexBasis'].every((key) => drawn[key] === undefined)

/**
 * Words held to one line, at least as wide as the line, measured once by a
 * copy no one sees or hears, laid out where nothing bounds its width.
 *
 * **React Native lays words out no wider than the view around them** and
 * clips the rest, where the web draws a line that `white-space: nowrap`
 * keeps whole past its box: a button's label at the largest text size in a
 * narrow announcement ran past its button on the web and was cut short on a
 * phone. The words take the width of their whole line as their least, so
 * they run past the view around them as the web's do, from where the view
 * places them. **The copy is drawn only once the words are laid out on a
 * device**, which a test renderer never does, and goes once it is measured.
 */
const OneLine = ({
  children,
  props,
  style,
}: {
  readonly children: ReactNode
  readonly props: TextProps
  readonly style: Readonly<Record<string, unknown>>
}) => {
  const [natural, setNatural] = useState<{ readonly key: string; readonly width: number }>()
  const key = JSON.stringify([
    children,
    style.fontFamily,
    style.fontSize,
    style.fontWeight,
    style.letterSpacing,
  ])
  const least = natural?.key === key ? natural.width : undefined
  const [laid, setLaid] = useState(false)
  const own = useRef<unknown>(null)
  const given = (props as { readonly ref?: Ref<unknown> }).ref
  const held = useCallback(
    (node: unknown) => {
      own.current = node
      if (typeof given === 'function') {
        given(node)
      } else if (given !== null && given !== undefined) {
        ;(given as { current: unknown }).current = node
      }
    },
    [given],
  )
  /* A device's view can say where it stands, and a test renderer's cannot. */
  useLayoutEffect(() => {
    const node = own.current as { readonly getBoundingClientRect?: unknown } | null
    if (typeof node?.getBoundingClientRect === 'function') {
      setLaid(true)
    }
  }, [])
  const drawn = (
    <Text
      {...props}
      allowFontScaling={false}
      ref={held as never}
      style={(least === undefined ? style : { ...style, minWidth: least }) as TextProps['style']}
    >
      {children}
    </Text>
  )
  if (least !== undefined || !laid) {
    return drawn
  }
  const measured = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout
    setNatural({ key, width: Math.ceil(width) })
  }
  return (
    <>
      {drawn}
      <Text
        accessibilityElementsHidden
        allowFontScaling={false}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        numberOfLines={1}
        onLayout={measured}
        pointerEvents="none"
        style={
          { ...style, left: 0, opacity: 0, position: 'absolute', top: 0 } as TextProps['style']
        }
      >
        {children}
      </Text>
    </>
  )
}

/**
 * Words as the renderer draws them, at the sizes the theme has already scaled
 * to the reader's text size.
 *
 * **Helix scales its own text, and React Native does not scale it again.** The
 * theme draws a rem at 16 points times the reader's text size, and a font
 * size, a line height, and every other length written in rems resolve against
 * it, so words and the box around them grow by one factor, as they do under a
 * browser's font size on the web. React Native multiplies a font size by the
 * same setting unless `allowFontScaling` is off, which would scale it twice:
 * iOS scales the line height with it and leaves the letter spacing, and
 * Android 14 and later scales a large size by less than a small one. Every
 * `Text` the renderer draws is this one.
 *
 * **A line limit and a line breaking arrive in the style**, as `white-space:
 * nowrap`, `text-overflow`, `line-clamp`, and `text-wrap` resolve, and are
 * passed as the props `Text` takes: `numberOfLines`, `ellipsizeMode`,
 * `textBreakStrategy` on Android, and `lineBreakStrategyIOS` on iOS. A line
 * limit of 0 is none.
 *
 * **Inside a part that scrolls both ways, the words wrap at its width**,
 * which `WrapWidth` gives, unless their own style sets a `maxWidth`.
 *
 * **Words held to one line with nothing to end them keep the whole line**,
 * as `OneLine` says, where they stand in no other words.
 */
export const ScaledText = ({ style, ...props }: TextProps) => {
  const { ellipsizeMode, lineBreakStrategyIOS, numberOfLines, textBreakStrategy, ...drawn } =
    (StyleSheet.flatten(style) ?? {}) as Readonly<Record<string, unknown>>
  const lines: Partial<TextProps> = {
    ...(typeof numberOfLines === 'number' && numberOfLines > 0 ? { numberOfLines } : {}),
    /* A line limit clips, as CSS does, unless `text-overflow` asks for an
       ellipsis. */
    ...(typeof ellipsizeMode === 'string'
      ? { ellipsizeMode: ellipsizeMode as TextProps['ellipsizeMode'] }
      : typeof numberOfLines === 'number' && numberOfLines > 0
        ? { ellipsizeMode: 'clip' as const }
        : {}),
    ...(typeof textBreakStrategy === 'string'
      ? { textBreakStrategy: textBreakStrategy as TextProps['textBreakStrategy'] }
      : {}),
    ...(typeof lineBreakStrategyIOS === 'string'
      ? { lineBreakStrategyIOS: lineBreakStrategyIOS as TextProps['lineBreakStrategyIOS'] }
      : {}),
  }
  const wrap = useContext(WrapWidth)
  const nested = useContext(InText)
  const capped = wrap === undefined ? drawn : { maxWidth: wrap, ...drawn }
  const { children, ...rest } = props
  const whole = !nested && spills(children, numberOfLines, ellipsizeMode, capped)
  return (
    <InText.Provider value={true}>
      {whole ? (
        <OneLine props={{ ...lines, ...rest }} style={capped}>
          {children}
        </OneLine>
      ) : (
        <Text {...lines} {...props} allowFontScaling={false} style={capped as TextProps['style']} />
      )}
    </InText.Provider>
  )
}
