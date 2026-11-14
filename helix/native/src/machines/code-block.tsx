/**
 * The machine a code block runs on a phone: its code in panes, the words of its
 * lines measured where a phone lays them out, what the wrap button and a fold
 * do, how a cap is told, and the tabs over several files.
 *
 * **The code is the words the block holds, or the Code Blocks it holds, read from
 * its children**, so a phone has no second copy to keep in step. A block held by
 * another asks the block around it whether its file is the one shown.
 */
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import {
  type CodeBlockTokens,
  type CodeRun,
  hearTokens,
  registeredTokens,
} from '@fusion.dev/helix-core/code-block'
import {
  Children,
  createContext,
  createElement,
  isValidElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { type Theme, useTheme } from '../theme/theme'
import {
  filesOf,
  type LaidRow,
  type LineBox,
  lineBoxes,
  type PaneGiven,
  panesOf,
  runsOfCode,
} from './code-block-model'
import { useFileTabs, useFollowed, useRequest } from './file-tabs'
import { boundTo, given } from './props'
import { textOf } from './words'

/** A width no line of code reaches. */
const UNBOUNDED = 1_000_000

/** What a block offers the blocks it holds as its files. */
interface FilesOffer {
  /** The name of the file shown. */
  readonly shown: string
}

const Files = createContext<FilesOffer | undefined>(undefined)

/** A block's name on its tab, as the web reads it. */
const nameOf = (props: Readonly<Record<string, unknown>>): string =>
  String(props.label ?? '') || String(props.language ?? '')

/** The Code Blocks a block holds as its code, each with its name. */
const heldBlocks = (children: unknown, tag: string): readonly string[] =>
  Children.toArray(children as ReactNode).flatMap((child) =>
    isValidElement(child) && (child.type as { tag?: unknown }).tag === tag
      ? [nameOf(child.props as Readonly<Record<string, unknown>>)]
      : [],
  )

/** Whether the page passed something into a region. */
const filled = (value: unknown): boolean => value !== undefined && value !== null && value !== false

/** Hears `registerTokens`, so what a page registers later reaches a block drawn already. */
const useRegisteredTokens = (): CodeBlockTokens | undefined => {
  const [tokens, setTokens] = useState(registeredTokens)
  useEffect(
    () =>
      hearTokens(() => {
        setTokens(() => registeredTokens())
      }),
    [],
  )
  return tokens
}

/** A run's look, as a phone's words take it. */
const runLook = (run: CodeRun, theme: Theme): Readonly<Record<string, unknown>> => {
  const tokens = theme.tokens as Readonly<Record<string, unknown>>
  const dark = theme.mode === 'dark'
  const color =
    run.syntax !== undefined
      ? tokens[`color-syntax-${run.syntax}`]
      : dark
        ? (run.colorDark ?? run.color)
        : run.color
  return {
    ...(color === undefined ? {} : { color }),
    ...(run.background === undefined ? {} : { backgroundColor: run.background }),
    ...(run.bold === true ? { fontWeight: 'bold' } : {}),
    ...(run.italic === true ? { fontStyle: 'italic' } : {}),
    ...(run.underline === true ? { textDecorationLine: 'underline' } : {}),
  }
}

/** The bindings of the parts of a diff's rows. */
const diffParts = (flip: (key: string) => void): Readonly<Record<string, PartBinding>> => {
  const unread = {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  }
  return {
    context: {
      copy: (item) => ({ accessibilityLabel: String(item.fields.said ?? ''), accessible: true }),
    },
    fold: {
      copy: (item) => ({
        ...(item.fields.silent === true ? unread : {}),
        accessibilityState: { expanded: item.fields.open === true },
        onPress: () => flip(String(item.fields.foldKey)),
      }),
    },
    hunk: { copy: (item) => (item.fields.silent === true ? unread : {}) },
    new: { copy: () => unread },
  }
}

/** Reads what a block's props and region say into the pane's arithmetic. */
const readGiven = (family: Family, props: Props, use: MachineUse) => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const words = (name: string): string => String(read(name) ?? '')
  const context = read('contextLines')
  return {
    actions: filled(props.actions),
    addedLines: words('addedLines'),
    codeLabel: words('codeLabel'),
    collapseLabel: words('collapseLabel'),
    contextLines: typeof context === 'number' ? context : undefined,
    copyLabel: words('copyLabel'),
    copyNameLabel: words('copyNameLabel'),
    diff: read('diff') === true,
    expandable: read('expandable') === true,
    expandLabel: words('expandLabel'),
    file: read('file') as string | undefined,
    hideUnchangedLabel: words('hideUnchangedLabel'),
    highlight: read('highlight') as
      | ((code: string, language: string) => string | undefined)
      | undefined,
    label: words('label'),
    labeled: filled(props.label) && typeof props.label !== 'string',
    language: words('language'),
    lineNumbers: read('lineNumbers') === true,
    locale: locale().read(),
    markLines: words('markLines'),
    noCopy: read('noCopy') === true,
    removedLines: words('removedLines'),
    showUnchangedLabel: words('showUnchangedLabel'),
    split: read('layout') === 'split',
    tokens: read('tokens') as CodeBlockTokens | undefined,
    wrap: read('wrap') === true,
    wrappable: read('wrappable') === true,
  }
}

/** Which of the files a block holds is shown, and a request to show another. */
const useFile = (
  request: ReturnType<typeof useRequest>,
  held: readonly string[],
  from: unknown,
) => {
  const [file, setFile] = useFollowed(from as string | undefined)
  const shown = held.find((name) => name === file) ?? held[0] ?? ''
  const choose = (name: string) => {
    if (name !== shown && request('onBeforeChange', 'onChange', { value: name })) {
      setFile(name)
    }
  }
  return { choose, shown }
}

/** Whether the lines wrap, and a request to turn that. */
const useWrap = (request: ReturnType<typeof useRequest>, from: boolean) => {
  const [wrap, setWrap] = useFollowed(from)
  const toggle = () => {
    if (request('onBeforeCheck', 'onCheck', { checked: !wrap })) {
      setWrap(!wrap)
    }
  }
  return { toggle, wrap }
}

/** The folds a reader opened, which go as the code changes, as the web's do. */
const useFolds = (text: string) => {
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(new Set())
  const seen = useRef(text)
  if (seen.current !== text) {
    seen.current = text
    setUnfolded(new Set())
  }
  const flip = useCallback((key: string) => {
    setUnfolded((before) => {
      const next = new Set(before)
      if (!next.delete(key)) {
        next.add(key)
      }
      return next
    })
  }, [])
  return { flip, unfolded }
}

/** Where a phone laid the words out, and how large the box around them stands. */
const useLaidOut = (text: string, wrap: boolean) => {
  const [rows, setRows] = useState<readonly LaidRow[]>([])
  const [frame, setFrame] = useState({ height: 0, width: 0 })
  const boxes: readonly LineBox[] = useMemo(() => lineBoxes(text, rows), [text, rows])
  const widest = rows.reduce((most, row) => Math.max(most, row.width), 0)
  const tallest = rows.reduce((most, row) => Math.max(most, row.y + row.height), 0)
  const parts: Record<string, PartBinding> = {
    code: {
      view: {
        onLayout: (next: { nativeEvent: { layout: { height: number; width: number } } }) => {
          const { height, width } = next.nativeEvent.layout
          setFrame((was) =>
            was.height === height && was.width === width ? was : { height, width },
          )
        },
      },
    },
    'code-text': {
      view: {
        onTextLayout: (next: { nativeEvent: { lines: readonly LaidRow[] } }) => {
          setRows(next.nativeEvent.lines)
        },
        selectable: true,
        /* A scroll view both ways wraps words at its frame, and code only wraps
           when it says so. */
        ...(wrap ? {} : { style: { maxWidth: UNBOUNDED } }),
      },
    },
    mark: {
      copy: (item) => ({
        style: {
          height: Number(item.fields.bottom) - Number(item.fields.top),
          top: Number(item.fields.top),
          width: Math.max(widest, frame.width),
        },
      }),
    },
    number: {
      copy: (item) => {
        const box = wrap ? boxes[item.index] : undefined
        return box === undefined ? {} : { style: { height: box.bottom - box.top } }
      },
    },
  }
  return { boxes, hides: frame.height > 0 && tallest > frame.height + 1, parts }
}

/** The bindings of what a page's icons and a run's look reach. */
const lookParts = (props: Props, theme: Theme): Record<string, PartBinding> => {
  const look = (item: Entry) => ({ style: runLook(item.fields as unknown as CodeRun, theme) })
  return {
    copy: {
      copy: () => ({
        ...(filled(props.copyIcon) ? { children: props.copyIcon } : {}),
        ...(filled(props.copiedIcon) ? { copied: props.copiedIcon } : {}),
      }),
    },
    /* On the words as well, which state the color and weight they inherit. */
    run: { copy: look },
    'run-words': { copy: look },
  }
}

/** What the expand button does and says. */
const useExpand = (
  read: { collapseLabel: string; expandLabel: string; expandable: boolean; diff: boolean },
  hides: boolean,
) => {
  const [expanded, setExpanded] = useState(false)
  const shown = read.expandable && !read.diff && (hides || expanded)
  return {
    binding: {
      view: { accessibilityState: { expanded }, onPress: () => setExpanded((was) => !was) },
    } satisfies PartBinding,
    expanded,
    hidden: !shown,
    words: expanded ? read.collapseLabel : read.expandLabel,
  }
}

/** Whether a block held by another is the file that one shows. */
const hiddenFile = (offer: FilesOffer | undefined, props: Props): boolean =>
  offer !== undefined && nameOf(props) !== offer.shown

/** Hosts a block of code. */
export const useCodeBlock = (family: Family, props: Props, use: MachineUse): Behavior => {
  const theme = useTheme()
  const registered = useRegisteredTokens()
  const read = readGiven(family, props, use)
  const held = useMemo(
    () => heldBlocks(props.children, family.tag ?? ''),
    [family.tag, props.children],
  )
  const offer = useContext(Files)
  const request = useRequest(family, props, use)
  const { choose, shown } = useFile(request, held, read.file)
  const { toggle, wrap } = useWrap(request, read.wrap)
  const text = held.length > 0 ? '' : textOf(props.children)
  const { flip, unfolded } = useFolds(text)
  const laid = useLaidOut(text, wrap)
  const expand = useExpand(read, laid.hides)
  const tabs = useFileTabs(held, shown, choose)

  const tokens = read.tokens ?? registered
  const { diff, highlight, language } = read
  const files = useMemo(() => filesOf(diff, text), [diff, text])
  const runs = useMemo(
    () => (diff ? [] : runsOfCode({ highlight, language, text, tokens })),
    [diff, highlight, language, text, tokens],
  )
  const given: PaneGiven = {
    ...read,
    boxes: laid.boxes,
    tabbed: offer !== undefined,
    text,
    tokens,
    unfolded,
    wrap,
  }
  const panes = held.length > 0 ? [] : panesOf(given, files, runs)
  const list = (name: string): string => boundTo(use, name, 'state') ?? name
  const several = held.length > 1
  const filesOffer = useMemo<FilesOffer>(() => ({ shown }), [shown])
  const gone = hiddenFile(offer, props)

  return {
    marks: [...(expand.expanded ? ['expanded'] : []), ...(offer === undefined ? [] : ['tabbed'])],
    parts: {
      ...diffParts(flip),
      ...laid.parts,
      ...lookParts(props, theme),
      expand: expand.binding,
      'file-tab': tabs,
      host: {
        lists: {
          [list('panes')]: panes,
          [list('tabs')]: held.map((name, at) => ({
            key: `${at}-${name}`,
            name,
            selected: name === shown,
          })),
        },
        states: {
          [list('expandHidden')]: expand.hidden,
          [list('expandWords')]: expand.words,
          [list('several')]: several,
        },
      },
      /* A row of a diff runs past the box and scrolls, as a `<pre>` holds its lines. */
      text: { view: { style: { maxWidth: UNBOUNDED } } },
      'wrap-toggle': {
        view: {
          accessibilityRole: 'togglebutton',
          accessibilityState: { checked: wrap },
          onPress: toggle,
        },
      },
    },
    /* One block held by another stands alone, with no tabs, as the web draws it. */
    provide: (drawn: ReactNode) => {
      if (gone) {
        return null
      }
      return several ? createElement(Files.Provider, { value: filesOffer }, drawn) : drawn
    },
  }
}
