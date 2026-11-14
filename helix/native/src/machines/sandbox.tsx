/**
 * A sandbox on a phone, read only: its panes stacked as the web stacks them in
 * a narrow window, the file tabs over its source panes, each pane's source in
 * the highlighter's colors, the console's lines, and the status bar's readouts.
 *
 * **One choice for the four elements that compute anything**, told apart by
 * the family's name, as Map's places are. The preview is the web's alone: a
 * phone's sandbox draws what its preview region holds.
 */
import type { LogLine } from '@fusion.dev/helix-core/log'
import {
  CONSOLE_HEARD,
  CONSOLE_LIMIT,
  type ConsoleLevel,
  caretWords,
  languageName,
  linesOfRuns,
  type SandboxTokenizer,
  sourceRuns,
} from '@fusion.dev/helix-core/sandbox'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { isValidElement, type ReactElement, type Ref, useImperativeHandle, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { kebab, numberIn, wordsIn } from './date-picker-read'
import { useFileTabs, useFollowed, useRequest } from './file-tabs'
import { boundTo, given } from './props'

type Read = (name: string) => unknown

/** The states a machine gives the host, each by the name the source binds. */
const statesOf = (
  use: MachineUse,
  values: Readonly<Record<string, boolean | string>>,
): Record<string, boolean | string> =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [boundTo(use, name, 'state') ?? name, value]),
  )

/** The lists a machine gives the host, each by the name the source binds. */
const listsOf = (
  use: MachineUse,
  values: Readonly<Record<string, readonly object[]>>,
): Record<string, readonly object[]> =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [boundTo(use, name, 'state') ?? name, value]),
  )

/** The source panes a sandbox holds, in the order the page wrote them. */
const panesIn = (held: unknown): ReactElement<Props>[] =>
  (Array.isArray(held) ? held : [held]).filter((one): one is ReactElement<Props> =>
    isValidElement(one),
  )

/** The `name` a pane goes by, which `file` holds, `html` where it sets none. */
const nameOf = (pane: ReactElement<Props>): string => wordsIn(pane.props.name) || 'html'

/** The words on a pane's tab: its `label`, or its `name`. */
const tabOf = (pane: ReactElement<Props>): string => wordsIn(pane.props.label) || nameOf(pane)

/** Hosts a sandbox: its file tabs, the pane shown, and which pane comes first. */
const useRoot = (family: Family, props: Props, use: MachineUse, read: Read): Behavior => {
  const panes = panesIn(props.source)
  const names = panes.map(nameOf)
  const request = useRequest(family, props, use)
  const [file, setFile] = useFollowed(read('file') as string | undefined)
  const shown = names.find((name) => name === file) ?? names[0] ?? ''
  const choose = (name: string) => {
    if (name !== shown && request('onBeforeChange', 'onChange', { value: name })) {
      setFile(name)
    }
  }
  const tabs = useFileTabs(names, shown, choose)
  const several = panes.length > 1
  return {
    marks: [],
    parts: {
      file: tabs,
      host: {
        lists: listsOf(use, {
          files: panes.map((pane, at) => ({
            key: `${at}-${nameOf(pane)}`,
            modified: false,
            name: nameOf(pane),
            selected: nameOf(pane) === shown,
            words: tabOf(pane),
          })),
        }),
        states: statesOf(use, { previewLeads: read('lead') === 'preview', several }),
      },
    },
    ...(several ? { regions: { source: panes[names.indexOf(shown)] } } : {}),
  }
}

/** The text nothing selects or reads, which holds an empty line's height. */
const EMPTY_LINE = ' '

/** Hosts a source pane: its lines of runs and the name it is read by. */
const useSource = (use: MachineUse, read: Read): Behavior => {
  const value = wordsIn(read('value'))
  const tokenize = read('tokenize') as SandboxTokenizer | undefined
  const lines = linesOfRuns(sourceRuns(value, wordsIn(read('name')) || 'html', tokenize))
  const digits = String(lines.length).length
  const label = wordsIn(read('label'))
  const field = wordsIn(read('field-label'))
  const named =
    label === ''
      ? field
      : formatMessage(wordsIn(read('field-name-label')), { field, name: label }, '')
  return {
    marks: [],
    parts: {
      host: {
        lists: listsOf(use, {
          lines: lines.map((line, at) => ({
            digits,
            key: String(at),
            number: String(at + 1),
            runs: (line.length === 0 ? [{ kind: undefined, text: EMPTY_LINE }] : line).map(
              (run, index) => ({ key: String(index), kind: run.kind ?? '', text: run.text }),
            ),
          })),
        }),
        states: statesOf(use, { named }),
      },
      source: { view: { accessibilityValue: { text: value }, accessible: true } },
      words: { view: { selectable: true } },
    },
  }
}

/** What a console's ref answers, its web element's two methods. */
export interface SandboxConsoleHandle {
  /** Empties the log. */
  readonly clear: () => void
  /** Writes one line, as a preview's `console` event carries it. */
  readonly write: (detail: { readonly level: ConsoleLevel; readonly text: string }) => void
}

/** What a console keeps: its lines, and the newest a screen reader heard. */
interface Kept {
  readonly heard: readonly string[]
  readonly lines: readonly LogLine[]
}

const NONE: Kept = { heard: [], lines: [] }

/** The words a level's line is said after, from `spoken-words`. */
const spokenOf = (read: Read, level: ConsoleLevel): string => {
  const words = read('spoken-words')
  const own = typeof words === 'object' && words !== null ? (words as Record<string, unknown>) : {}
  const fallback: Readonly<Record<string, string>> = {
    error: 'Error:',
    info: 'Info:',
    warn: 'Warning:',
  }
  return wordsIn(own[level] ?? fallback[level])
}

/** Hosts a console: the lines `write` gives it, `clear`, and what a reader hears. */
const useConsole = (props: Props, use: MachineUse, read: Read): Behavior => {
  const [kept, setKept] = useState<Kept>(NONE)
  useImperativeHandle(
    props.ref as Ref<SandboxConsoleHandle> | undefined,
    (): SandboxConsoleHandle => ({
      clear: () => setKept(NONE),
      write: ({ level, text }) =>
        setKept((was) => {
          const last = was.lines.at(-1)
          const repeat = last?.level === level && last.text === text
          const before = spokenOf(read, level)
          return {
            heard: repeat
              ? was.heard
              : [...was.heard, before ? `${before} ${text}` : text].slice(-CONSOLE_HEARD),
            lines: [...was.lines, { level, text }].slice(-CONSOLE_LIMIT),
          }
        }),
    }),
  )
  const named = wordsIn(read('label')) || wordsIn(read('fallback-label'))
  const said = wordsIn(read('empty-label')) || wordsIn(read('empty-text'))
  return {
    marks: [],
    parts: {
      clear: { view: { onPress: () => setKept(NONE) } },
      host: { states: statesOf(use, { heard: kept.heard.at(-1) ?? '', named, said }) },
      output: { view: { lines: kept.lines } },
    },
  }
}

/** Hosts a status bar: where the caret is and the language, in words. */
const useStatusBar = (use: MachineUse, read: Read): Behavior => {
  const language = wordsIn(read('language'))
  const position = caretWords(
    wordsIn(read('position-label')),
    numberIn(read('line')),
    numberIn(read('column')),
  )
  return {
    marks: [],
    parts: {
      host: {
        states: statesOf(use, {
          language: language === '' ? '' : languageName(language),
          position: position ?? '',
        }),
      },
    },
  }
}

/** What a sandbox element's machine is: its host hook, given the family, the props, and the use. */
type SandboxHook = (family: Family, props: Props, use: MachineUse) => Behavior

/** The reader a hook reads its props through. */
const reader =
  (family: Family, props: Props): Read =>
  (name) =>
    given(family, props, kebab(name))

/**
 * The hook a sandbox element runs, by the family's name, chosen once outside
 * the binder so each element calls the same hooks on every render.
 */
export const sandboxHook = (family: Family): SandboxHook => {
  switch (family.name) {
    case 'sandbox-source':
      return (_, props, use) => useSource(use, reader(family, props))
    case 'sandbox-console':
      return (_, props, use) => useConsole(props, use, reader(family, props))
    case 'sandbox-status-bar':
      return (_, props, use) => useStatusBar(use, reader(family, props))
    default:
      return (_, props, use) => useRoot(family, props, use, reader(family, props))
  }
}
