import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  bracketMatching,
  codeFolding,
  foldable,
  foldEffect,
  foldedRanges,
  foldKeymap,
  foldState,
  indentOnInput,
  indentUnit,
  type LanguageSupport,
  language as languageFacet,
  StreamLanguage,
  syntaxHighlighting,
  syntaxTree,
  unfoldEffect,
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
import {
  Annotation,
  Compartment,
  EditorState,
  type Extension,
  Facet,
  RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  Transaction,
} from '@codemirror/state'
import {
  BlockType,
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  placeholder,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import type {
  CodeEditorDiagnostic,
  CodeEditorEngine,
  CodeEditorEngineListeners,
  CodeEditorEngineState,
  CodeEditorEngineView,
  CodeEditorFindQuery,
  CodeEditorFindResult,
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

/**
 * The editor measured again each time a face finishes loading.
 *
 * **CodeMirror measures its lines once more when `document.fonts.ready`
 * resolves, and that can be before the code face has started loading**: the
 * face is asked for when the editor first draws text in it, after the promise
 * has settled. The lines were then drawn in the code face while CodeMirror kept
 * the heights and positions it measured in the fallback. The line numbers and
 * the fold markers no longer read them, being drawn by the lines themselves,
 * and the cursor, the selection and the heights CodeMirror scrolls by still
 * do. A face that arrives changes the content, and CodeMirror measures again
 * when asked, so it is asked. The Sandbox's editor writes the same plugin: the
 * two share no module that loads CodeMirror's view and still imports on a
 * server.
 */
const remeasureOnFonts: Extension = ViewPlugin.fromClass(
  class {
    private readonly fonts: FontFaceSet | undefined

    private readonly view: EditorView

    constructor(view: EditorView) {
      this.view = view
      this.fonts = view.dom.ownerDocument.fonts
      this.fonts?.addEventListener('loadingdone', this.measure)
    }

    destroy(): void {
      this.fonts?.removeEventListener('loadingdone', this.measure)
    }

    private readonly measure = (): void => {
      this.view.requestMeasure()
    }
  },
)

/** The fold CodeMirror holds on a line, if the reader folded one there. */
const foldOn = (
  state: EditorState,
  from: number,
  to: number,
): { from: number; to: number } | null => {
  let found: { from: number; to: number } | null = null
  foldedRanges(state).between(from, to, (start, end) => {
    if (!found || found.from > start) {
      found = { from: start, to: end }
    }
  })
  return found
}

/** The class that draws a line's fold marker: open, closed, or none. */
const foldClass = (state: EditorState, from: number, to: number): string =>
  foldOn(state, from, to) ? 'cm-helix-folded' : foldable(state, from, to) ? 'cm-helix-foldable' : ''

/**
 * Each line's number and fold marker, as an attribute and a class the theme
 * draws at the start of the line, in the line's own box.
 *
 * **Each number is drawn by its own line.** CodeMirror's gutter is a column of
 * its own, and CodeMirror sets each of its numbers and fold markers to a height
 * it measured or estimated for the line beside it. A height taken before the
 * lines settled stayed until the next measure: pictures of the Button page at
 * 390 caught the Sandbox's numbers above their lines on November 17, 2026, and
 * the Code Editor's gutter is the same column. A number drawn by its line sits
 * at that line's top, in its face and leading, whatever loads late, and nothing
 * is measured to put it there. Only the lines on screen are decorated, rebuilt
 * as they change, and a folded run is one line, numbered by its first, as the
 * gutter numbered it.
 *
 * Pressing a fold marker folds or unfolds its line, as the gutter's did, and
 * the press places no caret.
 */
const numberedLines = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.number(view)
    }

    update(update: ViewUpdate): void {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.startState.facet(languageFacet) !== update.state.facet(languageFacet) ||
        update.startState.field(foldState, false) !== update.state.field(foldState, false) ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = this.number(update.view)
      }
    }

    number(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const { state } = view
      for (const block of view.viewportLineBlocks) {
        /* A block holding block widgets lists its lines inside it. */
        const lines = Array.isArray(block.type)
          ? block.type.filter((inner) => inner.type === BlockType.Text)
          : block.type === BlockType.Text
            ? [block]
            : []
        for (const { from, to } of lines) {
          const folds = foldClass(state, from, to)
          builder.add(
            from,
            from,
            Decoration.line({
              attributes: { 'data-line': String(state.doc.lineAt(from).number) },
              ...(folds ? { class: folds } : {}),
            }),
          )
        }
      }
      return builder.finish()
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    eventHandlers: {
      mousedown(event, view) {
        const line = event.target instanceof Element ? event.target.closest('.cm-line') : null
        if (
          event.button !== 0 ||
          !(line instanceof HTMLElement) ||
          !line.matches('.cm-helix-foldable, .cm-helix-folded')
        ) {
          return false
        }
        /* The marker is no element of its own, so where it stands is read
           from its box: held at the start of the band while the code
           scrolls under it. */
        const marker = getComputedStyle(line, '::after')
        const numbers = parseFloat(getComputedStyle(line, '::before').inlineSize) || 0
        const width = parseFloat(marker.inlineSize) || 0
        const start = Math.max(
          line.getBoundingClientRect().left - width,
          view.scrollDOM.getBoundingClientRect().left + numbers,
        )
        if (event.clientX < start || event.clientX >= start + width) {
          return false
        }
        const at = view.posAtDOM(line, 0)
        const { from, to } = view.state.doc.lineAt(at)
        const folded = foldOn(view.state, from, to)
        const range = folded ?? foldable(view.state, from, to)
        if (!range) {
          return false
        }
        view.dispatch({ effects: (folded ? unfoldEffect : foldEffect).of(range) })
        event.preventDefault()
        return true
      },
    },
  },
)

/**
 * The lengths each line places its number and fold marker by, as CodeMirror's
 * gutter took them: the numbers' room for the last number's digits with `sm`
 * before them and `2xs` after, and never under three characters; the markers'
 * room for a closed marker with a pixel each side and `2xs` beyond. The line's
 * own start is CodeMirror's six pixels, said here so the floats can reach back
 * across it. Each width of text is rounded up to a 64th of a pixel, as a
 * browser rounds up a box sized to its text.
 *
 * **Where the code starts is set by text, and these lengths only place the
 * numbers and markers behind it.** A width in `ch` is the advance a face
 * states, while Linux lays text out in whole pixels, and the Sandbox's band in
 * `ch` was 0.8px wider there than the gutter had been. The band the code
 * starts after is sized from hidden text in the theme, and each marker ends
 * where its line starts.
 *
 * Written on the editor's own style, because the theme cuts each property
 * name at its first underscore.
 */
const LENGTHS = [
  '--_code-editor-line-start: 6px',
  '--_code-editor-numbers: max(round(down, 3ch, 1px / 64), calc(round(up, var(--_code-editor-digits) * 1ch, 1px / 64) + var(--helix-space-sm) + var(--helix-space-2xs)))',
  '--_code-editor-folds: calc(round(up, 1ch + 2px, 1px / 64) + var(--helix-space-2xs) * 2)',
  '--_code-editor-band: calc(var(--_code-editor-numbers) + var(--_code-editor-folds))',
].join('; ')

/**
 * The widest number the file can hold, written as nines, which the theme sets
 * out of sight to size the band the numbers stand in: `9` up to nine lines,
 * `99` up to ninety-nine. CodeMirror's gutter was sized from the same number,
 * so the band is as wide as the gutter was, and a short file's numbers line
 * up with a long one's, as the Sandbox's editor sizes its band.
 */
const widestNumber: Extension = EditorView.editorAttributes.compute(['doc'], (state) => {
  const digits = String(state.doc.lines).length
  return {
    class: 'cm-helix-numbered',
    style: `--_code-editor-digits: ${digits}; --_code-editor-widest: "${'9'.repeat(digits)}"; ${LENGTHS}`,
  }
})

/** The line numbers and fold markers, drawn by the lines. */
const numbering: Extension = [numberedLines, widestNumber]

/** Marks a change the editor made itself, which is not the reader's and goes through no request. */
const given = Annotation.define<boolean>()

/**
 * The wash a changed line takes at its strongest: the info color at 14 percent
 * in light mode and 22 in dark, the wash core's `flashChange` draws, for its
 * reasons. From the theme's tokens, so a theme that moves the info color moves
 * this with it.
 */
const WASH =
  'light-dark(color-mix(in oklab, var(--helix-color-info, oklch(0.48 0.12 245)) 14%, transparent), color-mix(in oklab, var(--helix-color-info, oklch(0.7 0.16 245)) 22%, transparent))'

/** Whether changed lines light up, which `flash-changes` turns on. */
const flashing = Facet.define<boolean, boolean>({ combine: (values) => values.some(Boolean) })

/** Takes the marks of one round of changed lines off once their wash is gone. */
const unflash = StateEffect.define<number>()

/** The lines lit now, and how many rounds of changes have lit any. */
interface Flashed {
  lines: DecorationSet
  round: number
}

/**
 * The start of each line a change touched, in the new text. **A line split
 * or joined at its end is not touched**, so a line added after another lights
 * up alone, and a line taken out lights none. Nothing when every line
 * changed, which is a new file.
 */
const changedLines = (transaction: Transaction): number[] => {
  const doc = transaction.state.doc
  const starts = new Set<number>()
  transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    if (fromB === toB) {
      const removed = transaction.startState.sliceDoc(fromA, toA)
      const line = doc.lineAt(fromB)
      if (
        (removed.endsWith('\n') && line.from === fromB) ||
        (removed.startsWith('\n') && line.to === fromB)
      ) {
        return
      }
    }
    let first = doc.lineAt(fromB)
    let last = doc.lineAt(toB)
    if (toB > fromB && first.to === fromB && first.number < last.number) {
      first = doc.line(first.number + 1)
    }
    if (toB > fromB && last.from === toB && last.number > first.number) {
      last = doc.line(last.number - 1)
    }
    for (let number = first.number; number <= last.number; number += 1) {
      starts.add(doc.line(number).from)
    }
  })
  if (doc.lines > 1 && starts.size === doc.lines) {
    return []
  }
  return [...starts].sort((a, b) => a - b)
}

/**
 * The lines lit by a change that did not come from the reader: one the editor
 * made itself for a new `value`, or one with no user event, such as an edit
 * an extension or an agent dispatched. **A line lit again takes the other of
 * two classes**, which restarts its animation, as CodeMirror's own caret
 * restarts its blink.
 */
const flashedLines = StateField.define<Flashed>({
  create: () => ({ lines: Decoration.none, round: 0 }),
  provide: (field) => EditorView.decorations.from(field, (value) => value.lines),
  update(value, transaction) {
    let lines = value.lines.map(transaction.changes)
    let round = value.round
    for (const effect of transaction.effects) {
      if (effect.is(unflash)) {
        lines = lines.update({ filter: (_from, _to, mark) => mark.spec.round !== effect.value })
      }
    }
    const fromPage =
      transaction.annotation(given) === true ||
      transaction.annotation(Transaction.userEvent) === undefined
    if (!transaction.docChanged || !fromPage || !transaction.state.facet(flashing)) {
      return { lines, round }
    }
    const starts = changedLines(transaction)
    if (starts.length === 0) {
      return { lines, round }
    }
    round += 1
    const again = new Set<number>()
    lines.between(0, transaction.state.doc.length, (from, _to, mark) => {
      if (starts.includes(from) && mark.spec.class === 'cm-helix-changed') {
        again.add(from)
      }
    })
    lines = lines.update({
      add: starts.map((from) =>
        Decoration.line({
          class: again.has(from) ? 'cm-helix-changed-again' : 'cm-helix-changed',
          round,
        }).range(from),
      ),
      filter: (from) => !starts.includes(from),
    })
    return { lines, round }
  },
})

/** A time in milliseconds from a custom property on the editor, or `standing` where it is not set. */
const timeOf = (view: EditorView, name: string, standing: number): number => {
  const written = getComputedStyle(view.dom).getPropertyValue(name).trim()
  const amount = Number.parseFloat(written)
  if (!Number.isFinite(amount)) {
    return standing
  }
  return written.endsWith('ms') || !written.endsWith('s') ? amount : amount * 1000
}

/**
 * Takes each round's marks off once its wash has faded, so a line is lit
 * only while it shows, and a line scrolled out of view does not light up when
 * it comes back.
 */
const unflashLater = ViewPlugin.fromClass(
  class {
    private seen: number

    private readonly timers = new Set<ReturnType<typeof setTimeout>>()

    private readonly view: EditorView

    constructor(view: EditorView) {
      this.view = view
      this.seen = view.state.field(flashedLines).round
    }

    destroy(): void {
      for (const timer of this.timers) {
        clearTimeout(timer)
      }
    }

    update(update: ViewUpdate): void {
      const { round } = update.state.field(flashedLines)
      if (round === this.seen) {
        return
      }
      this.seen = round
      const reduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      const lasts = reduced
        ? 320 + timeOf(this.view, '--helix-duration-fade', 120)
        : timeOf(this.view, '--helix-duration-slow', 320) * 3
      const timer = setTimeout(() => {
        this.timers.delete(timer)
        this.view.dispatch({ effects: unflash.of(round) })
      }, lasts + 50)
      this.timers.add(timer)
    }
  },
)

/**
 * The wash on a changed line: drawn over the line's background and under its
 * text, as an inset shadow, held for `--helix-duration-slow` and faded over
 * twice that. **Under reduced motion it still shows**, since it says what
 * changed: held for 320ms and gone over `--helix-duration-fade`, the
 * crossfade Helix keeps for that setting, because the base layer takes the
 * slow token to almost nothing there.
 */
const flashTheme = EditorView.theme({
  '.cm-line.cm-helix-changed-again': { animationName: 'cm-helix-flash-again' },
  '.cm-line.cm-helix-changed, .cm-line.cm-helix-changed-again': {
    animationDuration: 'calc(var(--helix-duration-slow, 320ms) * 3)',
    animationFillMode: 'both',
    animationName: 'cm-helix-flash',
    animationTimingFunction: 'linear',
  },
  '@keyframes cm-helix-flash': {
    '0%, 33.333%': { boxShadow: `inset 0 0 0 100vmax ${WASH}` },
    '100%': { boxShadow: 'inset 0 0 0 100vmax transparent' },
  },
  '@keyframes cm-helix-flash-again': {
    '0%, 33.333%': { boxShadow: `inset 0 0 0 100vmax ${WASH}` },
    '100%': { boxShadow: 'inset 0 0 0 100vmax transparent' },
  },
  '@keyframes cm-helix-flash-steady': {
    '0%, 72.7%': { boxShadow: `inset 0 0 0 100vmax ${WASH}` },
    '100%': { boxShadow: 'inset 0 0 0 100vmax transparent' },
  },
  '@keyframes cm-helix-flash-steady-again': {
    '0%, 72.7%': { boxShadow: `inset 0 0 0 100vmax ${WASH}` },
    '100%': { boxShadow: 'inset 0 0 0 100vmax transparent' },
  },
  /* A class heavier than the rules below, which sort after this one and would
     otherwise win. */
  '@media (prefers-reduced-motion: reduce)': {
    '.cm-content .cm-line.cm-helix-changed-again': {
      animationName: 'cm-helix-flash-steady-again',
    },
    '.cm-content .cm-line.cm-helix-changed, .cm-content .cm-line.cm-helix-changed-again': {
      animationDuration: 'calc(320ms + var(--helix-duration-fade, 120ms))',
      animationName: 'cm-helix-flash-steady',
    },
  },
})

/** A rule for each numbered line's number and fold marker, under a selector written once for the line. */
const drawn = (line: string): string => `${line}[data-line]::before, ${line}[data-line]::after`

/**
 * CodeMirror's parts in the theme's tokens: the line numbers in the muted ink,
 * the caret and the selection in the primary, the active line in the sunken
 * surface, search and the fold markers as Helix draws its own controls.
 *
 * **The numbers and the fold markers stand in a band before the content, as
 * wide as CodeMirror's gutter was.** Each is drawn by its own line, at the
 * line's top, in its face and leading. Where lines do not wrap, each is a float
 * held at the band while the code scrolls under it, as the gutter was held;
 * where they wrap, nothing scrolls sideways, and each is placed against the
 * whole line, so the active line's wash covers every row of it. Generated text
 * is read, and CodeMirror's gutter was hidden from the accessibility tree, so
 * the empty alternative after the slash leaves each number and marker out of
 * what a line says: behind `@supports`, because a browser without the syntax
 * drops the whole declaration and would draw nothing.
 */
const helixTheme = EditorView.theme({
  [`.cm-activeLine, ${drawn('.cm-activeLine')}`]: {
    backgroundColor: 'color-mix(in oklab, var(--helix-color-foreground) 5%, transparent)',
  },
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
  '&.cm-helix-numbered .cm-line': { paddingInlineStart: 'var(--_code-editor-line-start)' },
  /* The band, before the content in the scroller's row, as the gutter was:
     the widest number with its room, then the markers with theirs. **Both
     markers, one over the other**, since a face without them draws `⌄` from
     another face, a little wider than `›`: the gutter took the wider once an
     open marker was on screen, and moved the code when none was. No height,
     so a short file stands as tall as its lines. */
  '&.cm-helix-numbered .cm-scroller::after': {
    content: '"›\\A⌄"',
    order: '-1',
    paddingInline: 'calc(var(--helix-space-2xs) + 1px)',
    whiteSpace: 'pre',
  },
  '&.cm-helix-numbered .cm-scroller::before': {
    content: 'var(--_code-editor-widest, "9")',
    minInlineSize: '3ch',
    order: '-2',
    paddingInline: 'var(--helix-space-sm) var(--helix-space-2xs)',
    whiteSpace: 'nowrap',
  },
  '&.cm-helix-numbered .cm-scroller::before, &.cm-helix-numbered .cm-scroller::after': {
    blockSize: '0',
    boxSizing: 'border-box',
    flexShrink: '0',
    pointerEvents: 'none',
    userSelect: 'none',
    visibility: 'hidden',
  },
  [drawn('.cm-line')]: {
    boxSizing: 'border-box',
    color: 'var(--helix-color-foreground-muted)',
    float: 'inline-start',
    /* A line's height, which an empty marker's float would not take. */
    minBlockSize: '1lh',
    position: 'sticky',
    textIndent: '0',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  /* The marker's float follows the number's, which takes the band's start.
     Drawn empty on a line with nothing to fold, so the active line's wash
     still crosses the band. */
  '.cm-line[data-line]::after': {
    content: '""',
    inlineSize: 'var(--_code-editor-folds)',
    insetInlineStart: 'var(--_code-editor-numbers)',
    marginInline:
      'calc(-1 * (var(--_code-editor-folds) + var(--_code-editor-line-start))) var(--_code-editor-line-start)',
    paddingInline: 'calc(var(--helix-space-2xs) + 1px)',
  },
  '.cm-line[data-line]::before': {
    content: 'attr(data-line)',
    inlineSize: 'var(--_code-editor-numbers)',
    insetInlineStart: '0',
    marginInline:
      'calc(-1 * (var(--_code-editor-band) + var(--_code-editor-line-start))) calc(var(--_code-editor-folds) + var(--_code-editor-line-start))',
    paddingInline: 'var(--helix-space-sm) var(--helix-space-2xs)',
    pointerEvents: 'none',
    textAlign: 'end',
  },
  /* The press is the plugin's. */
  '.cm-line[data-line].cm-helix-foldable::after': { content: '"⌄"', cursor: 'pointer' },
  '.cm-line[data-line].cm-helix-folded::after': { content: '"›"', cursor: 'pointer' },
  '@supports (content: "1" / "")': {
    '.cm-content .cm-line[data-line]::before': { content: 'attr(data-line) / ""' },
    '.cm-content .cm-line[data-line].cm-helix-foldable::after': { content: '"⌄" / ""' },
    '.cm-content .cm-line[data-line].cm-helix-folded::after': { content: '"›" / ""' },
  },
  [drawn('.cm-line.cm-helix-problem-danger')]: {
    color: 'var(--helix-color-danger)',
    fontWeight: 'var(--helix-weight-semibold)',
  },
  [drawn('.cm-line.cm-helix-problem-info')]: { color: 'var(--helix-color-info)' },
  [drawn('.cm-line.cm-helix-problem-warning')]: {
    color: 'var(--helix-color-warning)',
    fontWeight: 'var(--helix-weight-semibold)',
  },
  [drawn('.cm-lineWrapping > .cm-line')]: {
    float: 'none',
    insetBlock: '0',
    margin: '0',
    position: 'absolute',
  },
  '.cm-lineWrapping > .cm-line[data-line]': { position: 'relative' },
  '.cm-lineWrapping > .cm-line[data-line]::after': {
    insetInlineStart: 'calc(-1 * var(--_code-editor-folds))',
  },
  '.cm-lineWrapping > .cm-line[data-line]::before': {
    insetInlineStart: 'calc(-1 * var(--_code-editor-band))',
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
  [`&:not(.cm-focused) .cm-activeLine, ${drawn('&:not(.cm-focused) .cm-activeLine')}`]: {
    backgroundColor: 'transparent',
  },
  '&.cm-focused': { outline: 'none' },
})

/** One replacement in a text: the span from `from` to `to`, and what goes there. */
interface Replacement {
  from: number
  insert: string
  to: number
}

/** The span between what two texts start with and what they end with, as one replacement. */
const spanBetween = (from: string, to: string, at = 0): Replacement => {
  const shorter = Math.min(from.length, to.length)
  let start = 0
  while (start < shorter && from.charCodeAt(start) === to.charCodeAt(start)) {
    start += 1
  }
  let end = 0
  while (
    end < shorter - start &&
    from.charCodeAt(from.length - 1 - end) === to.charCodeAt(to.length - 1 - end)
  ) {
    end += 1
  }
  return { from: at + start, insert: to.slice(start, to.length - end), to: at + from.length - end }
}

/** Each line of a text with the break that ends it, so the lines join back into the text. */
const linesOf = (text: string): string[] => text.match(/[^\n]*\n|[^\n]+$/g) ?? []

/** The most lines compared one against another, past which the lines that differ are one span. */
const COMPARED = 1_000_000

/**
 * The replacements that turn `from` into `to`, one for each run of lines that
 * differs, each cut down to the characters that differ. **Only those spans are
 * replaced**, so the selection and the lines between keep their places, and
 * only the lines that changed light up: an agent's two edits far apart in a
 * file are two changes and not every line between them.
 */
export const changeBetween = (from: string, to: string): Replacement[] => {
  if (from === to) {
    return []
  }
  const before = linesOf(from)
  const after = linesOf(to)
  let head = 0
  while (head < before.length && head < after.length && before[head] === after[head]) {
    head += 1
  }
  let tail = 0
  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1
  }
  const old = before.slice(head, before.length - tail)
  const now = after.slice(head, after.length - tail)
  const start = before.slice(0, head).join('').length
  if (old.length * now.length > COMPARED) {
    return [spanBetween(old.join(''), now.join(''), start)]
  }
  /* The longest run of lines the two share, as a table of how many each pair
     of tails has in common, walked from the start to pair the lines kept. */
  const shared = Array.from({ length: old.length + 1 }, () =>
    new Array<number>(now.length + 1).fill(0),
  )
  for (let i = old.length - 1; i >= 0; i -= 1) {
    for (let j = now.length - 1; j >= 0; j -= 1) {
      const row = shared[i] as number[]
      row[j] =
        old[i] === now[j]
          ? ((shared[i + 1] as number[])[j + 1] as number) + 1
          : Math.max((shared[i + 1] as number[])[j] as number, row[j + 1] as number)
    }
  }
  const replacements: Replacement[] = []
  let i = 0
  let j = 0
  let at = start
  let runFrom = at
  let removed = ''
  let added = ''
  const close = (): void => {
    if (removed !== '' || added !== '') {
      replacements.push(spanBetween(removed, added, runFrom))
    }
    removed = ''
    added = ''
  }
  while (i < old.length || j < now.length) {
    if (i < old.length && j < now.length && old[i] === now[j]) {
      close()
      at += (old[i] as string).length
      runFrom = at
      i += 1
      j += 1
    } else if (
      j >= now.length ||
      (i < old.length &&
        ((shared[i + 1] as number[])[j] as number) >= ((shared[i] as number[])[j + 1] as number))
    ) {
      removed += old[i] as string
      at += (old[i] as string).length
      i += 1
    } else {
      added += now[j] as string
      j += 1
    }
  }
  close()
  return replacements
}

/** CodeMirror's severity for each tone. */
const SEVERITY = { danger: 'error', info: 'info', warning: 'warning' } as const

/** The editor's diagnostics as CodeMirror's, kept inside the document. */
const lintOf = (state: CodeEditorEngineState, length: number): Diagnostic[] =>
  state.diagnostics.map((one) => ({
    from: Math.min(Math.max(0, one.from), length),
    message: one.message,
    severity: SEVERITY[one.tone ?? 'danger'],
    to: Math.min(Math.max(one.from, one.to), length),
  }))

/** How bad each tone is, so a line with two problems takes the worse one's. */
const RANK = { danger: 2, info: 0, warning: 1 } as const

/**
 * Each line with a problem, its number and fold marker drawn in the worst
 * problem's tone, as a class on the line, found again in each document the
 * reader's edits make.
 */
const problemLines = (diagnostics: readonly CodeEditorDiagnostic[]): Extension =>
  EditorView.decorations.compute(['doc'], (state) => {
    const worst = new Map<number, 'danger' | 'info' | 'warning'>()
    for (const one of diagnostics) {
      const line = state.doc.lineAt(Math.min(Math.max(0, one.from), state.doc.length)).from
      const tone = one.tone ?? 'danger'
      const held = worst.get(line)
      if (!held || RANK[tone] > RANK[held]) {
        worst.set(line, tone)
      }
    }
    return RangeSet.of(
      [...worst]
        .sort(([a], [b]) => a - b)
        .map(([from, tone]) => Decoration.line({ class: `cm-helix-problem-${tone}` }).range(from)),
    )
  })

/** The query as CodeMirror's: literal unless it is a regular expression. */
const queryOf = (query: CodeEditorFindQuery): SearchQuery =>
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
const standing = (state: EditorState, query: SearchQuery): CodeEditorFindResult => {
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
export const codeMirrorEngine = (options: CodeMirrorOptions = {}): CodeEditorEngine => ({
  mount(
    parent: HTMLElement,
    state: CodeEditorEngineState,
    listeners: CodeEditorEngineListeners,
  ): CodeEditorEngineView {
    const root = parent.getRootNode() as Document | ShadowRoot
    adoptSyntax(root)
    const language = new Compartment()
    const numbers = new Compartment()
    const editable = new Compartment()
    const wrapping = new Compartment()
    const words = new Compartment()
    const hint = new Compartment()
    const problems = new Compartment()
    const flashes = new Compartment()
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
          numbers.of(state.lineNumbers ? numbering : []),
          remeasureOnFonts,
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
          problems.of(problemLines(state.diagnostics)),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
          syntaxHighlighting(syntaxHighlighter, { fallback: true }),
          helixTheme,
          flashTheme,
          flashedLines,
          unflashLater,
          flashes.of(flashing.of(state.flashChanges)),
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
    const ask = (query: CodeEditorFindQuery): SearchQuery => {
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
          effects.push(numbers.reconfigure(next.lineNumbers ? numbering : []))
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
        if (next.flashChanges !== current.flashChanges) {
          effects.push(flashes.reconfigure(flashing.of(next.flashChanges)))
        }
        const doc = view.state.doc.toString()
        view.dispatch({
          annotations: given.of(true),
          changes: changeBetween(doc, next.value),
          effects,
        })
        if (next.diagnostics !== current.diagnostics || next.value !== doc) {
          view.dispatch(setDiagnostics(view.state, lintOf(next, view.state.doc.length)))
          view.dispatch({
            effects: problems.reconfigure(problemLines(next.diagnostics)),
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
export const connectCodeEditor = (
  editor: { engine: CodeEditorEngine | undefined },
  options: CodeMirrorOptions = {},
): (() => void) => {
  editor.engine = codeMirrorEngine(options)
  return () => {
    editor.engine = undefined
  }
}
