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
import { type Diagnostic, lintGutter, setDiagnostics } from '@codemirror/lint'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { Annotation, Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import type {
  EditorEngine,
  EditorEngineListeners,
  EditorEngineState,
  EditorEngineView,
} from '@fusion.dev/helix-headless/editor'
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
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--helix-color-surface-sunken)' },
  '.cm-content': {
    caretColor: 'var(--helix-color-primary)',
    paddingBlock: 'var(--helix-space-xs)',
  },
  '.cm-cursor': { borderLeftColor: 'var(--helix-color-primary)' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--helix-color-surface-sunken)',
    border: 'none',
    color: 'var(--helix-color-foreground-muted)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--helix-color-foreground-muted)',
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
  '.cm-panels': {
    backgroundColor: 'var(--helix-color-surface)',
    color: 'var(--helix-color-foreground)',
  },
  '.cm-panels-bottom': { borderTop: 'var(--helix-border-thin) solid var(--helix-color-border)' },
  '.cm-placeholder': { color: 'var(--helix-color-foreground-muted)' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: 'var(--helix-leading-normal)' },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in oklab, var(--helix-color-warning) 25%, transparent)',
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
          search({ top: false }),
          lintGutter(),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            ...foldKeymap,
            indentWithTab,
          ]),
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
    return {
      destroy: () => view.destroy(),
      focus: () => view.focus(),
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
