import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  bracketMatching,
  codeFolding,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  type LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language'
import { type Diagnostic, setDiagnostics } from '@codemirror/lint'
import {
  closeSearchPanel,
  highlightSelectionMatches,
  openSearchPanel,
  replaceAll,
  replaceNext,
  SearchQuery,
  search,
  searchPanelOpen,
  setSearchQuery,
} from '@codemirror/search'
import { Annotation, Compartment, EditorState, type Extension, RangeSet } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  GutterMarker,
  gutterLineClass,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import type {
  EditorDiagnostic,
  EditorEngine,
  EditorEngineListeners,
  EditorEngineState,
  EditorEngineView,
  EditorFindQuery,
  EditorFindResult,
} from '@fusion.dev/helix-headless/code-editor'
import { syntaxHighlighter, syntaxRules } from '@fusion.dev/helix-sandbox/highlight'

/** A language's grammar, loaded when an editor first asks for it. */
type Loader = () => Promise<Extension>

/**
 * Each language an editor highlights, by the names a page writes in
 * `language`. Loaded on first use, so a page that edits CSS downloads no
 * Rust grammar.
 */
const LANGUAGES: Record<string, Loader> = {
  css: async () => (await import('@codemirror/lang-css')).css(),
  html: async () => (await import('@codemirror/lang-html')).html(),
  js: async () => (await import('@codemirror/lang-javascript')).javascript(),
  json: async () => (await import('@codemirror/lang-json')).json(),
  jsx: async () => (await import('@codemirror/lang-javascript')).javascript({ jsx: true }),
  md: async () => (await import('@codemirror/lang-markdown')).markdown(),
  py: async () => (await import('@codemirror/lang-python')).python(),
  rs: async () => (await import('@codemirror/lang-rust')).rust(),
  sh: async () =>
    StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell),
  ts: async () => (await import('@codemirror/lang-javascript')).javascript({ typescript: true }),
  tsx: async () =>
    (await import('@codemirror/lang-javascript')).javascript({ jsx: true, typescript: true }),
}

/** The other names a language goes by. */
const ALIASES: Record<string, string> = {
  bash: 'sh',
  cjs: 'js',
  htm: 'html',
  javascript: 'js',
  markdown: 'md',
  mjs: 'js',
  python: 'py',
  rust: 'rs',
  shell: 'sh',
  typescript: 'ts',
  zsh: 'sh',
}

/** The language a name means, or nothing for plain text and a name no grammar answers. */
export const languageName = (name: string): string | undefined => {
  const key = name.trim().toLowerCase()
  const known = ALIASES[key] ?? key
  return known in LANGUAGES ? known : undefined
}

/** Every name `language` takes, its aliases included. */
export const languageNames = (): string[] =>
  [...Object.keys(LANGUAGES), ...Object.keys(ALIASES)].sort()

/** Marks a change the editor made itself, which is not the reader's and goes through no request. */
const given = Annotation.define<boolean>()

/**
 * CodeMirror's parts in the theme's tokens: the gutter in the muted ink, the
 * caret and the selection in the primary, the active line in the sunken
 * surface, search and the fold markers as Helix draws its own controls.
 */
const helixTheme = EditorView.theme({
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in oklab, var(--helix-color-foreground) 5%, transparent)',
  },
  '.cm-content': {
    caretColor: 'var(--helix-color-primary)',
    paddingBlock: 'var(--helix-space-xs)',
  },
  '.cm-cursor': { borderLeftColor: 'var(--helix-color-primary)' },
  '.cm-foldGutter .cm-gutterElement': { paddingInline: 'var(--helix-space-2xs)' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--helix-color-surface-sunken)',
    border: 'none',
    color: 'var(--helix-color-foreground-muted)',
  },
  '.cm-gutterElement.cm-helix-problem-danger': {
    color: 'var(--helix-color-danger)',
    fontWeight: 'var(--helix-weight-semibold)',
  },
  '.cm-gutterElement.cm-helix-problem-info': { color: 'var(--helix-color-info)' },
  '.cm-gutterElement.cm-helix-problem-warning': {
    color: 'var(--helix-color-warning)',
    fontWeight: 'var(--helix-weight-semibold)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--helix-color-foreground-muted)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    minInlineSize: '3ch',
    paddingInline: 'var(--helix-space-sm) var(--helix-space-2xs)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    textDecoration: 'underline wavy var(--helix-color-danger)',
  },
  '.cm-lintRange-info': {
    backgroundImage: 'none',
    textDecoration: 'underline dotted var(--helix-color-foreground-muted)',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'none',
    textDecoration: 'underline wavy var(--helix-color-warning)',
  },
  /* The find bar is the element's, so the panel CodeMirror's search draws its
     marks under is empty, and its strip is never drawn. */
  '.cm-panels:has(> .cm-helix-find:only-child)': { display: 'none' },
  '.cm-placeholder': { color: 'var(--helix-color-foreground-muted)' },
  '.cm-scroller': {
    fontFamily: 'inherit',
    fontVariantLigatures: 'none',
    lineHeight: 'var(--helix-leading-normal)',
    scrollbarColor: 'var(--helix-scrollbar-thumb-color) transparent',
    scrollbarWidth: 'thin',
  },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in oklab, var(--helix-color-warning) 25%, transparent)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in oklab, var(--helix-color-warning) 50%, transparent)',
    outline: 'var(--helix-border-thin) solid var(--helix-color-warning)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--helix-color-primary-subtle)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--helix-color-surface-overlay)',
    border: 'var(--helix-border-thin) solid var(--helix-color-border)',
    borderRadius: 'var(--helix-radii-sm)',
  },
  '&': { blockSize: '100%', color: 'var(--helix-color-foreground)', fontSize: 'inherit' },
  '&:not(.cm-focused) .cm-activeLine, &:not(.cm-focused) .cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '&.cm-focused': { outline: 'none' },
})

/** CodeMirror's severity for each tone. */
const SEVERITY = { danger: 'error', info: 'info', warning: 'warning' } as const

/** The editor's diagnostics as CodeMirror's, kept inside the document. */
const lintOf = (state: EditorEngineState, length: number): Diagnostic[] =>
  state.diagnostics.map((one) => ({
    from: Math.min(Math.max(0, one.from), length),
    message: one.message,
    severity: SEVERITY[one.tone ?? 'danger'],
    to: Math.min(Math.max(one.from, one.to), length),
  }))

/** A line number drawn in a problem's tone. */
class ProblemLine extends GutterMarker {
  constructor(readonly tone: 'danger' | 'info' | 'warning') {
    super()
    this.elementClass = `cm-helix-problem-${tone}`
  }

  override eq(other: ProblemLine): boolean {
    return other.tone === this.tone
  }
}

/** How bad each tone is, so a line with two problems takes the worse one's. */
const RANK = { danger: 2, info: 0, warning: 1 } as const

/** Each line with a problem, its number marked in the worst problem's tone. */
const problemLines = (state: EditorState, diagnostics: readonly EditorDiagnostic[]): Extension => {
  const worst = new Map<number, 'danger' | 'info' | 'warning'>()
  for (const one of diagnostics) {
    const line = state.doc.lineAt(Math.min(Math.max(0, one.from), state.doc.length)).from
    const tone = one.tone ?? 'danger'
    const held = worst.get(line)
    if (!held || RANK[tone] > RANK[held]) {
      worst.set(line, tone)
    }
  }
  const marks = [...worst]
    .sort(([a], [b]) => a - b)
    .map(([from, tone]) => new ProblemLine(tone).range(from))
  return gutterLineClass.of(RangeSet.of(marks))
}

/** The query as CodeMirror's: literal unless it is a regular expression. */
const queryOf = (query: EditorFindQuery): SearchQuery =>
  new SearchQuery({
    caseSensitive: query.caseSensitive,
    literal: !query.regex,
    regexp: query.regex,
    replace: query.replace,
    search: query.search,
    wholeWord: query.wholeWord,
  })

/** The most matches a search counts, so a search for one letter in a large file stays quick. */
const COUNTED = 10_000

/** Every match of a query, as `[from, to]`, up to `COUNTED`. */
const matchesOf = (state: EditorState, query: SearchQuery): Array<[number, number]> => {
  const found: Array<[number, number]> = []
  const cursor = query.getCursor(state)
  for (let next = cursor.next(); !next.done && found.length < COUNTED; next = cursor.next()) {
    if (next.value.to > next.value.from) {
      found.push([next.value.from, next.value.to])
    }
  }
  return found
}

/** Where the selection stands among the matches. */
const standing = (state: EditorState, query: SearchQuery): EditorFindResult => {
  const matches = matchesOf(state, query)
  const { from, to } = state.selection.main
  return {
    count: matches.length,
    index: matches.findIndex(([start, end]) => start === from && end === to),
  }
}

/** Puts the syntax colors' classes in the root the editor draws in, once each root. */
const adoptSyntax = (root: Document | ShadowRoot): void => {
  if (typeof CSSStyleSheet !== 'function' || !('adoptedStyleSheets' in root)) {
    return
  }
  const marked = root as (Document | ShadowRoot) & { helixSyntax?: boolean }
  if (marked.helixSyntax) {
    return
  }
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(syntaxRules)
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
  marked.helixSyntax = true
}

/** What `codeMirrorEngine` takes beyond what the editor sets. */
export interface CodeMirrorOptions {
  /** More CodeMirror extensions, such as completions or a language server client, added after Helix's own. */
  extensions?: Extension[]
}

/**
 * CodeMirror 6, drawing a Helix Editor: highlighting in the theme's syntax
 * colors, line numbers, folding, bracket matching, search (Command+F, or
 * Control+F elsewhere), history, and diagnostics underlined in their tone.
 * Tab indents, and Escape then Tab leaves the editor.
 */
export const codeMirrorEngine = (options: CodeMirrorOptions = {}): EditorEngine => ({
  mount(
    parent: HTMLElement,
    state: EditorEngineState,
    listeners: EditorEngineListeners,
  ): EditorEngineView {
    const root = parent.getRootNode() as Document | ShadowRoot
    adoptSyntax(root)
    const language = new Compartment()
    const numbers = new Compartment()
    const editable = new Compartment()
    const wrapping = new Compartment()
    const words = new Compartment()
    const hint = new Compartment()
    const problems = new Compartment()
    let current = state
    /* The grammar a name asks for, loaded and then put in, unless the name
       changed while it loaded. */
    let asked = ''
    const load = (name: string, view: EditorView): void => {
      asked = name
      const known = languageName(name)
      if (!known) {
        view.dispatch({ effects: language.reconfigure([]) })
        return
      }
      void LANGUAGES[known]?.().then((grammar) => {
        if (asked === name) {
          view.dispatch({ effects: language.reconfigure(grammar as LanguageSupport) })
        }
      })
    }
    const view = new EditorView({
      parent,
      root,
      state: EditorState.create({
        doc: state.value,
        extensions: [
          numbers.of(
            state.lineNumbers ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : [],
          ),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          codeFolding(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          /* The find bar is the element's: CodeMirror's search keeps the query
             and marks the matches, under a panel with nothing in it. */
          search({
            createPanel: () => {
              const dom = document.createElement('div')
              dom.className = 'cm-helix-find'
              return { dom, top: true }
            },
          }),
          problems.of(problemLines(EditorState.create({ doc: state.value }), state.diagnostics)),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
          syntaxHighlighting(syntaxHighlighter, { fallback: true }),
          helixTheme,
          language.of([]),
          editable.of(EditorState.readOnly.of(state.readOnly)),
          wrapping.of(state.wrap ? EditorView.lineWrapping : []),
          words.of(
            EditorView.contentAttributes.of({
              'aria-label': state.label,
              'aria-multiline': 'true',
            }),
          ),
          hint.of(state.placeholder ? placeholder(state.placeholder) : []),
          /* Before the change lands, so a refused one never does: the
             editor's request decides, and an empty list rejects it. */
          EditorState.transactionFilter.of((transaction) => {
            if (!transaction.docChanged || transaction.annotation(given)) {
              return transaction
            }
            return listeners.change(transaction.newDoc.toString()) ? transaction : []
          }),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet || update.docChanged) {
              const { from, to } = update.state.selection.main
              listeners.caret?.(from, to)
            }
          }),
          ...(options.extensions ?? []),
        ],
      }),
    })
    load(state.language, view)
    view.dispatch(setDiagnostics(view.state, lintOf(state, view.state.doc.length)))
    /* The search CodeMirror keeps, opened first so its marks show, since
       opening sets a query of its own from the selection. */
    const ask = (query: EditorFindQuery): SearchQuery => {
      const asked = queryOf(query)
      if (!searchPanelOpen(view.state)) {
        openSearchPanel(view)
      }
      view.dispatch({ effects: setSearchQuery.of(asked) })
      return asked
    }
    return {
      destroy: () => view.destroy(),
      find: (query, direction) => {
        const asked = ask(query)
        if (!asked.valid) {
          return { count: 0, index: -1 }
        }
        const matches = matchesOf(view.state, asked)
        if (matches.length === 0) {
          return { count: 0, index: -1 }
        }
        const { from, to } = view.state.selection.main
        let index =
          direction === 'previous'
            ? matches.findLastIndex(([start]) => start < from)
            : matches.findIndex(([start]) => (direction === 'first' ? start >= from : start >= to))
        if (index === -1) {
          index = direction === 'previous' ? matches.length - 1 : 0
        }
        const [anchor, head] = matches[index] ?? [0, 0]
        view.dispatch({ scrollIntoView: true, selection: { anchor, head } })
        return { count: matches.length, index }
      },
      findEnd: () => {
        closeSearchPanel(view)
      },
      focus: () => view.focus(),
      replace: (query, all) => {
        const asked = ask(query)
        if (!asked.valid) {
          return { count: 0, index: -1 }
        }
        if (all) {
          replaceAll(view)
        } else {
          replaceNext(view)
        }
        return standing(view.state, asked)
      },
      select: (from, to) => {
        const length = view.state.doc.length
        view.dispatch({
          scrollIntoView: true,
          selection: { anchor: Math.min(from, length), head: Math.min(to, length) },
        })
        view.focus()
      },
      update: (next) => {
        const effects = []
        if (next.lineNumbers !== current.lineNumbers) {
          effects.push(
            numbers.reconfigure(
              next.lineNumbers ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : [],
            ),
          )
        }
        if (next.readOnly !== current.readOnly) {
          effects.push(editable.reconfigure(EditorState.readOnly.of(next.readOnly)))
        }
        if (next.wrap !== current.wrap) {
          effects.push(wrapping.reconfigure(next.wrap ? EditorView.lineWrapping : []))
        }
        if (next.label !== current.label) {
          effects.push(
            words.reconfigure(
              EditorView.contentAttributes.of({
                'aria-label': next.label,
                'aria-multiline': 'true',
              }),
            ),
          )
        }
        if (next.placeholder !== current.placeholder) {
          effects.push(hint.reconfigure(next.placeholder ? placeholder(next.placeholder) : []))
        }
        const doc = view.state.doc.toString()
        view.dispatch({
          annotations: given.of(true),
          ...(next.value === doc
            ? {}
            : { changes: { from: 0, insert: next.value, to: doc.length } }),
          effects,
        })
        if (next.diagnostics !== current.diagnostics || next.value !== doc) {
          view.dispatch(setDiagnostics(view.state, lintOf(next, view.state.doc.length)))
          view.dispatch({
            effects: problems.reconfigure(problemLines(view.state, next.diagnostics)),
          })
        }
        if (next.language !== current.language) {
          load(next.language, view)
        }
        current = next
      },
    }
  },
})

/**
 * Connects CodeMirror to an editor, with `codeMirrorEngine(options)`, and
 * returns what takes it away again, leaving the editor a plain text field.
 */
export const connectEditor = (
  editor: { engine: EditorEngine | undefined },
  options: CodeMirrorOptions = {},
): (() => void) => {
  editor.engine = codeMirrorEngine(options)
  return () => {
    editor.engine = undefined
  }
}
