import {
  auditName,
  customElement,
  drawIcon,
  formatWords,
  HelixElement,
  MIRROR_RULE,
  onApple,
  stopPress,
  words,
} from '@fusion.dev/helix-core'
import {
  arrowClockwise,
  arrowCounterClockwise,
  caretDown,
  check,
  code,
  type HelixIcon,
  link,
  linkBreak,
  listBullets,
  listNumbers,
  magnifyingGlass,
  quotes,
  textB,
  textItalic,
  textStrikethrough,
  x,
} from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import '../../button/index.js'
import '../../divider/index.js'
import '../../find/index.js'
import type {
  FindDirection,
  Finder,
  FindQuery,
  FindResult,
  FindSink,
  HelixHeadlessFind,
} from '../../find/index.js'
import '../../icon-button/index.js'
import '../../menu/index.js'
import '../../toolbar/index.js'

/**
 * Something the editor's toolbar draws and a renderer runs at the selection:
 * a block type, a mark, a list, a quote, a link, or a step through history.
 */
export type EditorTool =
  | 'bold'
  | 'bullet-list'
  | 'code'
  | 'code-block'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'italic'
  | 'link'
  | 'ordered-list'
  | 'paragraph'
  | 'quote'
  | 'redo'
  | 'strike'
  | 'undo'

/** The block types the block menu offers, in its order. */
export const EDITOR_BLOCKS: readonly EditorTool[] = [
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
  'code-block',
]

/** The toolbar's groups, in the order it draws them, and the tools in each. */
const GROUPS = [
  ['history', ['undo', 'redo']],
  ['block', EDITOR_BLOCKS],
  ['marks', ['bold', 'italic', 'strike', 'code']],
  ['link', ['link']],
  ['lists', ['bullet-list', 'ordered-list']],
  ['quote', ['quote']],
] as const satisfies ReadonlyArray<readonly [string, readonly EditorTool[]]>

/** A group of tools that `tools` names: the groups above, and `find`, the button that opens the find bar, which is drawn only where `tools` names it. */
export type EditorToolGroup = (typeof GROUPS)[number][0] | 'find'

/** The groups the toolbar draws while `tools` is absent. */
const RESTING_TOOLS = 'history block marks link lists quote'

/**
 * Each tool's key, as `Kbd` writes a chord, where it has one. The renderer
 * binds them; the frame shows them on the block menu's rows.
 */
const SHORTCUTS: Partial<Record<EditorTool, string>> = {
  'code-block': 'mod+alt+8',
  'heading-1': 'mod+alt+1',
  'heading-2': 'mod+alt+2',
  'heading-3': 'mod+alt+3',
  paragraph: 'mod+alt+0',
}

/** Every tool's button, in the order the toolbar draws them, as a selector. */
const TOOL_PARTS = [
  'undo',
  'redo',
  'block',
  'bold',
  'italic',
  'strike',
  'code',
  'link',
  'bullet-list',
  'ordered-list',
  'quote',
  'find-toggle',
]
  .map((name) => `[part~="${name}"]`)
  .join(', ')

/** What the frame asks of whatever draws the document, as the frame's settings stand. */
export interface EditorSettings {
  /** The document's name, which the renderer gives the element that takes the text. */
  label: string
  /** The words shown in an empty document. */
  placeholder: string
  /** Whether the document cannot be edited. */
  readOnly: boolean
}

/** What the toolbar shows about the selection, which a renderer reports. */
export interface EditorFormats {
  /** The tools whose format holds at the selection, such as `bold` or `bullet-list`. Their buttons are pressed. */
  applied: readonly EditorTool[]
  /** The block type at the selection, one of the block menu's tools, or empty where it is none of them. */
  block: EditorTool | ''
  /** The address of the link at the selection, or empty where there is none. */
  link: string
  /** The tools that cannot apply at the selection, such as `undo` with nothing to undo. Their buttons are disabled. */
  unavailable: readonly EditorTool[]
}

/** What the toolbar shows before a renderer has said anything. */
const NO_FORMATS: EditorFormats = { applied: [], block: '', link: '', unavailable: [] }

/**
 * What draws a document for the frame: `connectEditor` from
 * `@fusion.dev/helix-editor` builds one on ProseMirror, and a page drawing
 * its document some other way hands the frame its own.
 *
 * `run` is the one method it must have. A tool the renderer does not list in
 * `tools` is left off the toolbar.
 */
export interface EditorRenderer {
  /**
   * Finds `query` in the document, marks every match, and selects one by
   * `direction`, for the find bar, and returns where the search stands. The
   * find bar is drawn only for a renderer that has this.
   */
  find?(query: FindQuery, direction: FindDirection): FindResult
  /** Takes the marks a search drew away, as the find bar closes. */
  findEnd?(): void
  /** Puts focus in the document, with the selection where it was. */
  focus?(): void
  /**
   * Replaces the selected match, or every match with `all`, and returns where
   * the search stands after. The find bar offers replacing only to a renderer
   * that has this, and never while `readonly`.
   */
  replace?(query: FindQuery, all: boolean): FindResult
  /**
   * Runs a tool at the selection, and says whether it ran. `value` is a
   * link's address for `link`, where empty takes the link off.
   */
  run(tool: EditorTool, value?: string): boolean
  /** Applies the frame's settings. Called when attached and whenever one changes. */
  settings?(settings: EditorSettings): void
  /** The tools the renderer can run, such as those its schema has the nodes and marks for. Absent is every tool. */
  tools?(): readonly EditorTool[]
}

/** What the frame gives back to whatever it is attached to: how a renderer tells the frame what happened. */
export interface EditorSink {
  /** Detaches the renderer, which the frame stops asking. */
  detach(): void
  /** The selection moved or the document changed what the toolbar shows. */
  formats(formats: EditorFormats): void
  /** The document changed under an open search, which now stands here. */
  found(result: FindResult): void
}

/** Whether a key press is the platform's command chord with a letter, ⌘ on Apple and Control elsewhere. */
const commandWith = (event: KeyboardEvent, key: string): boolean =>
  event.key.toLowerCase() === key &&
  !event.altKey &&
  !event.shiftKey &&
  (onApple() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)

/**
 * @summary A frame around a document that ProseMirror or another editor draws.
 *
 * @description
 * Wraps a document drawn by ProseMirror or another rich text editor. The frame
 * adds a toolbar, an address bar for links, and a box the document is drawn
 * in. `connectEditor` from `@fusion.dev/helix-editor` connects ProseMirror:
 * it gives the document Helix's typed blocks, each with a stable id, and draws
 * them in your theme.
 *
 * The document is the element you write inside the frame, so it stays in the
 * page: the browser's input methods, spellcheck, and right-to-left text work in
 * it as they do in any field. A server can send the document's HTML there, and
 * it reads before any script loads. Mark it `data-prose`, so the base layer
 * draws its headings, lists, and quotes before a renderer connects.
 *
 * The toolbar's groups are named by `tools`, in this order: `history` (Undo
 * and Redo), `block` (a menu of Paragraph, three headings, and Code block),
 * `marks` (Bold, Italic, Strikethrough, and Code), `link`, `lists` (Bulleted
 * and Numbered), and `quote`, which are drawn by default, and `find`, the Find
 * button, which is drawn where `tools` names it. A tool the renderer cannot run
 * is left out once it is connected, and a tool that cannot apply at the
 * selection is disabled. A tool returns focus to the document once it has run.
 * With `readonly`, the document cannot be edited and the toolbar is not drawn.
 *
 * Command+F opens a find bar under the toolbar, a Find that searches the
 * document through the renderer, marks every match, and selects one. It
 * replaces unless the document is `readonly`, which it searches too.
 *
 * **Keyboard.** In the document:
 *
 * - Command+B, Command+I, Command+Shift+X, and Command+E make text bold,
 *   italic, struck through, and code. Use Control in place of Command on
 *   Windows and Linux.
 * - Command+Alt+0 makes a paragraph, Command+Alt+1 to 3 a heading, and
 *   Command+Alt+8 a code block.
 * - Command+Shift+8, Command+Shift+7, and Command+Shift+9 make a bulleted
 *   list, a numbered list, and a quote.
 * - Command+K opens the address bar for a link. Enter applies the address,
 *   and Escape closes the bar.
 * - Command+Z undoes, and Command+Shift+Z redoes.
 * - In a list, Tab nests the item and Shift+Tab lifts it. Escape then Tab
 *   leaves the document from anywhere, so a list never keeps focus.
 * - Alt+F10 moves focus to the toolbar. The arrow keys move between its
 *   tools, and Escape returns to the document.
 * - Command+F opens the find bar. Enter and Shift+Enter move between the
 *   matches, and Escape closes the bar and returns to the document.
 *
 * @since 0.221.0
 * @status experimental
 * @category editors
 * @aliases Rich text editor, WYSIWYG, Document editor, ProseMirror, Block editor
 * @documentation https://fusion.dev/helix/components/editor
 *
 * @slot - The element your renderer draws the document in.
 * @slot actions - Controls of your own at the end of the toolbar, such as Share or Comment.
 * @slot bold-icon - Replaces the glyph inside the Bold button.
 * @slot bullet-list-icon - Replaces the glyph inside the Bulleted list button.
 * @slot code-icon - Replaces the glyph inside the Code button.
 * @slot find-icon - Replaces the glyph inside the Find button.
 * @slot footer - Content under the document, such as a word count or whether it is saved.
 * @slot italic-icon - Replaces the glyph inside the Italic button.
 * @slot link-icon - Replaces the glyph inside the Link button.
 * @slot ordered-list-icon - Replaces the glyph inside the Numbered list button.
 * @slot quote-icon - Replaces the glyph inside the Quote button.
 * @slot redo-icon - Replaces the glyph inside the Redo button.
 * @slot strike-icon - Replaces the glyph inside the Strikethrough button.
 * @slot undo-icon - Replaces the glyph inside the Undo button.
 *
 * @event {HelixFoundEvent} helix-found - The find bar searched or moved among the matches, with `count` and the selected match's `index`, counting from 0, or -1 for none.
 *
 * @csspart actions - The `actions` slot, last in the toolbar.
 * @csspart block - The button that opens the block menu, which names the block type at the selection.
 * @csspart block-button - The block menu button's inner button.
 * @csspart block-live - The block menu button's live region, which speaks while the button is pending.
 * @csspart block-menu - The menu of block types.
 * @csspart block-menu-back - The control that returns from a submenu.
 * @csspart block-menu-back-mark - The glyph on the back control of a submenu.
 * @csspart block-menu-empty - The text shown when the menu has no items.
 * @csspart block-menu-header - The bar above a submenu, holding the way back and its name.
 * @csspart block-menu-live - The block menu's live region, which repeats the empty and loading text for screen readers.
 * @csspart block-menu-loading - The text shown while the items are loading.
 * @csspart block-menu-search-field - The block menu's filter field, drawn with `filterable`.
 * @csspart block-menu-surface - The floating panel the block menu is drawn on.
 * @csspart block-menu-title - The name of the submenu that is showing.
 * @csspart block-name - The name of the block type at the selection, in the block menu's button.
 * @csspart block-option - One block type in the block menu, checked while the selection is in one.
 * @csspart block-option-end - A block type's trailing column, which holds its shortcut.
 * @csspart block-option-item - A block type's row.
 * @csspart block-option-mark - The check beside the block type the selection is in.
 * @csspart block-option-shortcut - A block type's key.
 * @csspart block-option-shortcut-kbd - The key inside it.
 * @csspart block-option-shortcut-key - One key of a block type's chord.
 * @csspart block-option-shortcut-separator - The `+` between two keys of a block type's chord.
 * @csspart block-option-start - A block type's leading column.
 * @csspart block-option-surface - A block type's submenu panel, which a block type does not open.
 * @csspart block-spinner - The ring the block menu button turns while it is pending.
 * @csspart block-text - The box the block menu button's words sit in.
 * @csspart bold - The Bold button. Pressed while the selection is bold.
 * @csspart bold-button - The Bold button's inner button.
 * @csspart bold-live - The Bold button's live region, which speaks while the button is pending.
 * @csspart bold-pressed - The Bold button while the selection is bold, beside `bold`.
 * @csspart bold-spinner - The ring the Bold button turns while it is pending.
 * @csspart bold-text - The box the Bold button's icon sits in.
 * @csspart bullet-list - The Bulleted list button. Pressed while the selection is in a bulleted list.
 * @csspart bullet-list-button - The Bulleted list button's inner button.
 * @csspart bullet-list-live - The Bulleted list button's live region, which speaks while the button is pending.
 * @csspart bullet-list-pressed - The Bulleted list button while the selection is in a bulleted list, beside `bullet-list`.
 * @csspart bullet-list-spinner - The ring the Bulleted list button turns while it is pending.
 * @csspart bullet-list-text - The box the Bulleted list button's icon sits in.
 * @csspart code - The Code button. Pressed while the selection is code.
 * @csspart code-button - The Code button's inner button.
 * @csspart code-live - The Code button's live region, which speaks while the button is pending.
 * @csspart code-pressed - The Code button while the selection is code, beside `code`.
 * @csspart code-spinner - The ring the Code button turns while it is pending.
 * @csspart code-text - The box the Code button's icon sits in.
 * @csspart controls - The toolbar: the tools, then your actions, one tab stop that the arrows move along.
 * @csspart controls-toolbar - The box inside the toolbar that lays its buttons out.
 * @csspart divider - The line between two groups of tools.
 * @csspart divider-content - The content set into a divider, which the editor sets none into.
 * @csspart divider-line - The line itself.
 * @csspart find - The find bar under the toolbar, where the reader searches the document: a Find of its own.
 * @csspart find-actions - The find bar's `actions` slot, which the editor fills with nothing.
 * @csspart find-bar - The find bar's strip: the field, the count, the toolbar, and the replace row while it shows.
 * @csspart find-close - The button that closes the find bar.
 * @csspart find-close-button - The find bar's close button's inner button.
 * @csspart find-close-live - The find bar's close button's live region, which speaks while the button is pending.
 * @csspart find-close-spinner - The ring the find bar's close button turns while it is pending.
 * @csspart find-close-text - The box the find bar's close button's icon sits in.
 * @csspart find-controls - The find bar's toolbar of options and moves.
 * @csspart find-controls-toolbar - The box inside the find bar's toolbar that lays its buttons out.
 * @csspart find-count - Which match is selected, of how many.
 * @csspart find-field - The field the search is typed in.
 * @csspart find-live - The find bar's live region, which says the count as it changes.
 * @csspart find-match-case - The option that finds only the same case. Pressed while it applies.
 * @csspart find-match-case-button - The match case button's inner button.
 * @csspart find-match-case-live - The match case button's live region, which speaks while the button is pending.
 * @csspart find-match-case-pressed - The match case option while it applies, beside `find-match-case`.
 * @csspart find-match-case-spinner - The ring the match case button turns while it is pending.
 * @csspart find-match-case-text - The box the match case button's icon sits in.
 * @csspart find-next - The button that selects the next match.
 * @csspart find-next-button - The next match button's inner button.
 * @csspart find-next-live - The next match button's live region, which speaks while the button is pending.
 * @csspart find-next-spinner - The ring the next match button turns while it is pending.
 * @csspart find-next-text - The box the next match button's icon sits in.
 * @csspart find-previous - The button that selects the previous match.
 * @csspart find-previous-button - The previous match button's inner button.
 * @csspart find-previous-live - The previous match button's live region, which speaks while the button is pending.
 * @csspart find-previous-spinner - The ring the previous match button turns while it is pending.
 * @csspart find-previous-text - The box the previous match button's icon sits in.
 * @csspart find-regex - The option that reads the search as a regular expression. Pressed while it applies.
 * @csspart find-regex-button - The regular expression button's inner button.
 * @csspart find-regex-live - The regular expression button's live region, which speaks while the button is pending.
 * @csspart find-regex-pressed - The regular expression option while it applies, beside `find-regex`.
 * @csspart find-regex-spinner - The ring the regular expression button turns while it is pending.
 * @csspart find-regex-text - The box the regular expression button's icon sits in.
 * @csspart find-replace - The button that replaces the selected match.
 * @csspart find-replace-all - The button that replaces every match.
 * @csspart find-replace-all-button - The Replace all button's inner button.
 * @csspart find-replace-all-live - The Replace all button's live region, which speaks while the button is pending.
 * @csspart find-replace-all-spinner - The ring the Replace all button turns while it is pending.
 * @csspart find-replace-all-text - The box the Replace all button's words sits in.
 * @csspart find-replace-button - The Replace button's inner button.
 * @csspart find-replace-field - The field the replacement is typed in.
 * @csspart find-replace-live - The Replace button's live region, which speaks while the button is pending.
 * @csspart find-replace-spinner - The ring the Replace button turns while it is pending.
 * @csspart find-replace-text - The box the Replace button's words sits in.
 * @csspart find-replace-toggle - The button that shows the replace field under the find field. Expanded while it shows. Not drawn while `readonly`.
 * @csspart find-replace-toggle-button - The find and replace button's inner button.
 * @csspart find-replace-toggle-live - The find and replace button's live region, which speaks while the button is pending.
 * @csspart find-replace-toggle-spinner - The ring the find and replace button turns while it is pending.
 * @csspart find-replace-toggle-text - The box the find and replace button's icon sits in.
 * @csspart find-toggle - The Find button in the toolbar, drawn where `tools` names `find`, which opens and closes the find bar. Expanded while it is open.
 * @csspart find-toggle-button - The Find button's inner button.
 * @csspart find-toggle-live - The Find button's live region, which speaks while the button is pending.
 * @csspart find-toggle-spinner - The ring the Find button turns while it is pending.
 * @csspart find-toggle-text - The box the Find button's icon sits in.
 * @csspart find-whole-word - The option that finds only whole words. Pressed while it applies.
 * @csspart find-whole-word-button - The whole word button's inner button.
 * @csspart find-whole-word-live - The whole word button's live region, which speaks while the button is pending.
 * @csspart find-whole-word-pressed - The whole word option while it applies, beside `find-whole-word`.
 * @csspart find-whole-word-spinner - The ring the whole word button turns while it is pending.
 * @csspart find-whole-word-text - The box the whole word button's icon sits in.
 * @csspart footer - The `footer` slot, under the document.
 * @csspart header - The strip above the document that holds the toolbar, and the address bar under it while it is open.
 * @csspart italic - The Italic button. Pressed while the selection is italic.
 * @csspart italic-button - The Italic button's inner button.
 * @csspart italic-live - The Italic button's live region, which speaks while the button is pending.
 * @csspart italic-pressed - The Italic button while the selection is italic, beside `italic`.
 * @csspart italic-spinner - The ring the Italic button turns while it is pending.
 * @csspart italic-text - The box the Italic button's icon sits in.
 * @csspart link - The Link button, which opens the address bar. Pressed while the selection is in a link, and expanded while the bar is open.
 * @csspart link-apply - The button that applies the address.
 * @csspart link-apply-button - The Apply button's inner button.
 * @csspart link-apply-live - The Apply button's live region, which speaks while the button is pending.
 * @csspart link-apply-spinner - The ring the Apply button turns while it is pending.
 * @csspart link-apply-text - The box the Apply button's icon sits in.
 * @csspart link-bar - The bar under the toolbar where the reader writes a link's address.
 * @csspart link-button - The Link button's inner button.
 * @csspart link-close - The button that closes the address bar.
 * @csspart link-close-button - The close button's inner button.
 * @csspart link-close-live - The close button's live region, which speaks while the button is pending.
 * @csspart link-close-spinner - The ring the close button turns while it is pending.
 * @csspart link-close-text - The box the close button's icon sits in.
 * @csspart link-controls - The toolbar at the end of the address bar: Apply, Remove, and Close.
 * @csspart link-controls-toolbar - The box inside the address bar's toolbar that lays its buttons out.
 * @csspart link-field - The field the address is written in.
 * @csspart link-live - The Link button's live region, which speaks while the button is pending.
 * @csspart link-pressed - The Link button while the selection is in a link, beside `link`.
 * @csspart link-remove - The button that takes the link off. Disabled where the selection is in no link.
 * @csspart link-remove-button - The Remove button's inner button.
 * @csspart link-remove-live - The Remove button's live region, which speaks while the button is pending.
 * @csspart link-remove-spinner - The ring the Remove button turns while it is pending.
 * @csspart link-remove-text - The box the Remove button's icon sits in.
 * @csspart link-spinner - The ring the Link button turns while it is pending.
 * @csspart link-text - The box the Link button's icon sits in.
 * @csspart ordered-list - The Numbered list button. Pressed while the selection is in a numbered list.
 * @csspart ordered-list-button - The Numbered list button's inner button.
 * @csspart ordered-list-live - The Numbered list button's live region, which speaks while the button is pending.
 * @csspart ordered-list-pressed - The Numbered list button while the selection is in a numbered list, beside `ordered-list`.
 * @csspart ordered-list-spinner - The ring the Numbered list button turns while it is pending.
 * @csspart ordered-list-text - The box the Numbered list button's icon sits in.
 * @csspart quote - The Quote button. Pressed while the selection is in a quote.
 * @csspart quote-button - The Quote button's inner button.
 * @csspart quote-live - The Quote button's live region, which speaks while the button is pending.
 * @csspart quote-pressed - The Quote button while the selection is in a quote, beside `quote`.
 * @csspart quote-spinner - The ring the Quote button turns while it is pending.
 * @csspart quote-text - The box the Quote button's icon sits in.
 * @csspart redo - The Redo button. Disabled while there is nothing to redo.
 * @csspart redo-button - The Redo button's inner button.
 * @csspart redo-live - The Redo button's live region, which speaks while the button is pending.
 * @csspart redo-spinner - The ring the Redo button turns while it is pending.
 * @csspart redo-text - The box the Redo button's icon sits in.
 * @csspart region - The frame around the toolbar, the address bar, and the document.
 * @csspart strike - The Strikethrough button. Pressed while the selection is struck through.
 * @csspart strike-button - The Strikethrough button's inner button.
 * @csspart strike-live - The Strikethrough button's live region, which speaks while the button is pending.
 * @csspart strike-pressed - The Strikethrough button while the selection is struck through, beside `strike`.
 * @csspart strike-spinner - The ring the Strikethrough button turns while it is pending.
 * @csspart strike-text - The box the Strikethrough button's icon sits in.
 * @csspart tools - A group of several tools, which a narrow toolbar wraps as one: Undo and Redo, the marks, or the lists and the quote.
 * @csspart undo - The Undo button. Disabled while there is nothing to undo.
 * @csspart undo-button - The Undo button's inner button.
 * @csspart undo-live - The Undo button's live region, which speaks while the button is pending.
 * @csspart undo-spinner - The ring the Undo button turns while it is pending.
 * @csspart undo-text - The box the Undo button's icon sits in.
 * @csspart viewport - The box the document is drawn in.
 *
 * @cssstate connected - A renderer draws the document.
 * @cssstate document-focused - Focus is in the document, where the reader types.
 * @cssstate find-open - The find bar is open.
 * @cssstate link-open - The address bar is open.
 */
@customElement('helix-headless-editor')
export class HelixHeadlessEditor extends HelixElement {
  protected static override markRules = [MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-editor': { boldLabel: 'Fett' } })`.
   */
  static words = 'helix-editor'

  /** The block menu button's name. `{name}` is the block type at the selection. */
  @words
  @property({ attribute: 'block-chosen-label' })
  blockChosenLabel = 'Text style: {name}'

  /** The block menu's name, read by screen readers. */
  @words
  @property({ attribute: 'block-label' })
  blockLabel = 'Text style'

  /** The Bold button's label. */
  @words
  @property({ attribute: 'bold-label' })
  boldLabel = 'Bold'

  /** The Bulleted list button's label. */
  @words
  @property({ attribute: 'bullet-list-label' })
  bulletListLabel = 'Bulleted list'

  /** The Code block row's label in the block menu. */
  @words
  @property({ attribute: 'code-block-label' })
  codeBlockLabel = 'Code block'

  /** The Code button's label. */
  @words
  @property({ attribute: 'code-label' })
  codeLabel = 'Code'

  /** The toolbar's name, read by screen readers. */
  @words
  @property({ attribute: 'controls-label' })
  controlsLabel = 'Formatting'

  /** The document's name where `label` is empty and the host has no `aria-label`. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Editor'

  /** The Find button's label, and the find bar's name. */
  @words
  @property({ attribute: 'find-label' })
  findLabel = 'Find'

  /** A heading's name in the block menu. `{level}` is its level, 1 to 3. */
  @words
  @property({ attribute: 'heading-label' })
  headingLabel = 'Heading {level}'

  /** The Italic button's label. */
  @words
  @property({ attribute: 'italic-label' })
  italicLabel = 'Italic'

  /**
   * The document's name, read by screen readers. Name what it holds, such as
   * "Release notes", so that several editors on one page can be told apart.
   * Required.
   */
  @property()
  label = ''

  /** The Apply button's label in the address bar. */
  @words
  @property({ attribute: 'link-apply-label' })
  linkApplyLabel = 'Apply link'

  /** The close button's label in the address bar. */
  @words
  @property({ attribute: 'link-close-label' })
  linkCloseLabel = 'Close'

  /** The name of the address bar's toolbar, read by screen readers. */
  @words
  @property({ attribute: 'link-controls-label' })
  linkControlsLabel = 'Link controls'

  /** The address field's name, which it also shows while it is empty. */
  @words
  @property({ attribute: 'link-field-label' })
  linkFieldLabel = 'Address'

  /** The Link button's label, and the address bar's name. */
  @words
  @property({ attribute: 'link-label' })
  linkLabel = 'Link'

  /** The Remove button's label in the address bar. */
  @words
  @property({ attribute: 'link-remove-label' })
  linkRemoveLabel = 'Remove link'

  /** The Numbered list button's label. */
  @words
  @property({ attribute: 'ordered-list-label' })
  orderedListLabel = 'Numbered list'

  /** The Paragraph row's label in the block menu. */
  @words
  @property({ attribute: 'paragraph-label' })
  paragraphLabel = 'Paragraph'

  /** The words shown in an empty document, such as "Write the release notes". */
  @property()
  placeholder = ''

  /** The Quote button's label. */
  @words
  @property({ attribute: 'quote-label' })
  quoteLabel = 'Quote'

  /**
   * Shows the document and takes no edits, with no toolbar, for a document
   * someone reads, or one an agent is writing. The attribute is `readonly`,
   * the platform's spelling.
   */
  @property({ attribute: 'readonly', type: Boolean })
  readOnly = false

  /** The Redo button's label. */
  @words
  @property({ attribute: 'redo-label' })
  redoLabel = 'Redo'

  /** The Strikethrough button's label. */
  @words
  @property({ attribute: 'strike-label' })
  strikeLabel = 'Strikethrough'

  /**
   * Which groups of tools the toolbar draws, as a list of `history`, `block`,
   * `marks`, `link`, `lists`, and `quote`, or `none`. They are drawn in that
   * order, whatever order the list is in. Absent is all six.
   */
  @property()
  tools?: string

  /** The Undo button's label. */
  @words
  @property({ attribute: 'undo-label' })
  undoLabel = 'Undo'

  /** What the toolbar shows about the selection, as the renderer last reported it. */
  @state()
  private formats: EditorFormats = NO_FORMATS

  /** What draws the document, while one is attached. */
  @state()
  private renderer: EditorRenderer | undefined = undefined

  /** Whether the address bar is open. */
  @state()
  private linkOpen = false

  /** The address the reader is writing in the address bar. */
  @state()
  private draft = ''

  /** Whether the find bar is open, as it last said. */
  @state()
  private findOpen = false

  /** The find bar drawn now, the renderer it searches, and how a search is reported to it. */
  private find: { element: HelixHeadlessFind; renderer: EditorRenderer; sink: FindSink } | undefined

  /** Whether anything is slotted into `actions`, read before each render. */
  private hasActions = false

  /** Escape was the last key in the document, so Tab leaves it. */
  private escaped = false

  /** A choice in the block menu is waiting for the menu to close before focus goes back to the document. */
  private chosen = false

  /**
   * Hands the frame what draws the document. The frame sends it the settings
   * now and as they change, asks it to run the tools the reader presses, and
   * draws the toolbar from what it reports through the sink it gets back.
   * Attaching another renderer detaches this one.
   */
  attach(renderer: EditorRenderer): EditorSink {
    this.renderer = renderer
    this.formats = NO_FORMATS
    renderer.settings?.(this.settings)
    this.toggleState('connected', true)
    const current = (): boolean => this.renderer === renderer
    return {
      detach: () => {
        if (current()) {
          this.renderer = undefined
          this.formats = NO_FORMATS
          this.linkOpen = false
          this.toggleState('connected', false)
        }
      },
      formats: (formats) => {
        if (current()) {
          this.formats = formats
        }
      },
      found: (result) => {
        if (current()) {
          this.find?.sink.found(result)
        }
      },
    }
  }

  /**
   * Runs a tool at the selection, as its button does, and says whether it
   * ran: a block type, a mark, a list, a quote, a step through history, or a
   * link to `value`, where an empty `value` takes the link off. Nothing runs
   * while no renderer is attached, or while `readonly`.
   */
  run(tool: EditorTool, value?: string): boolean {
    if (!this.renderer || this.readOnly) {
      return false
    }
    return this.renderer.run(tool, value)
  }

  /** Puts focus in the document, with the selection where it was. */
  override focus(options?: FocusOptions): void {
    if (this.renderer?.focus) {
      this.renderer.focus()
      return
    }
    super.focus(options)
  }

  /** What the renderer is told, as the frame's properties stand. */
  private get settings(): EditorSettings {
    return {
      label: this.label || this.getAttribute('aria-label') || this.fallbackLabel,
      placeholder: this.placeholder,
      readOnly: this.readOnly,
    }
  }

  /** The groups `tools` names. */
  private get groups(): Set<string> {
    return new Set((this.tools ?? RESTING_TOOLS).split(/\s+/).filter(Boolean))
  }

  /**
   * Whether a tool is drawn: its group named by `tools`, and, once a renderer
   * is attached, a tool it can run. Drawn by the list alone until then, so a
   * server's toolbar has the buttons a connected one will.
   */
  private draws(tool: EditorTool): boolean {
    const group = GROUPS.find(([, tools]) => (tools as readonly EditorTool[]).includes(tool))
    if (!group || !this.groups.has(group[0])) {
      return false
    }
    const runs = this.renderer?.tools?.()
    return runs === undefined || runs.includes(tool)
  }

  /** Whether the toolbar draws any tool. */
  private get drawsAny(): boolean {
    return (
      !this.readOnly &&
      (this.drawsFind || GROUPS.some(([, tools]) => tools.some((tool) => this.draws(tool))))
    )
  }

  /**
   * Whether the document can be searched: always, until a renderer is
   * attached, and then where it can find. Read-only documents too, with
   * no replacing.
   */
  private get searches(): boolean {
    return this.renderer === undefined || this.renderer.find !== undefined
  }

  /** Whether the toolbar draws the Find button: `find` named by `tools`, and a document that can be searched. */
  private get drawsFind(): boolean {
    return this.groups.has('find') && this.searches
  }

  /** Whether a tool's button cannot be pressed now. */
  private disabled(tool: EditorTool): boolean {
    return !this.renderer || this.formats.unavailable.includes(tool)
  }

  /** A tool's name, on its button or its row. */
  private nameOf(tool: EditorTool): string {
    switch (tool) {
      case 'bold':
        return this.boldLabel
      case 'bullet-list':
        return this.bulletListLabel
      case 'code':
        return this.codeLabel
      case 'code-block':
        return this.codeBlockLabel
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
        return formatWords(this, 'headingLabel', { level: Number(tool.slice(-1)) })
      case 'italic':
        return this.italicLabel
      case 'link':
        return this.linkLabel
      case 'ordered-list':
        return this.orderedListLabel
      case 'paragraph':
        return this.paragraphLabel
      case 'quote':
        return this.quoteLabel
      case 'redo':
        return this.redoLabel
      case 'strike':
        return this.strikeLabel
      case 'undo':
        return this.undoLabel
    }
  }

  /** Puts focus back in the document after a tool has run. */
  private returnFocus(): void {
    this.renderer?.focus?.()
  }

  /** Runs a tool its button pressed, and puts focus back in the document. */
  private press(tool: EditorTool): void {
    if (this.disabled(tool)) {
      return
    }
    this.run(tool)
    this.returnFocus()
  }

  /** Opens the address bar with the address of the link at the selection, and puts focus in its field. */
  openLink(): void {
    if (this.readOnly || !this.renderer || !this.draws('link') || this.disabled('link')) {
      return
    }
    this.draft = this.formats.link
    this.linkOpen = true
    void this.updateComplete.then(() => {
      const field = this.partNamed<HTMLInputElement>('link-field')
      field?.focus()
      field?.select()
    })
  }

  /** Closes the address bar, and puts focus back in the document. */
  private closeLink(): void {
    this.linkOpen = false
    this.returnFocus()
  }

  /** Links the selection to the address in the field, or takes the link off where it is empty. */
  private applyLink(): void {
    this.run('link', this.draft.trim())
    this.closeLink()
  }

  private removeLink(): void {
    this.run('link', '')
    this.closeLink()
  }

  private readonly handleLinkInput = (event: Event): void => {
    this.draft = (event.target as HTMLInputElement).value
  }

  /** Enter applies the address and Escape closes the bar, outside a composition. */
  private readonly handleLinkKeys = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      this.applyLink()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.closeLink()
    }
  }

  /**
   * Moves focus to the toolbar: to the tool that holds its tab stop, or its
   * first enabled tool.
   */
  private focusToolbar(): void {
    const tools = [...this.renderRoot.querySelectorAll<HTMLElement>(TOOL_PARTS)].filter(
      (one) => !one.hasAttribute('disabled'),
    )
    const stop = tools.find((one) => one.shadowRoot?.querySelector('[tabindex="0"]')) ?? tools[0]
    stop?.focus()
  }

  /** Escape in the toolbar returns to the document, unless a menu in it took the key. */
  private readonly handleToolbarKeys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing) {
      event.preventDefault()
      this.returnFocus()
    }
  }

  /**
   * Opens the find bar, with its field focused. The header is drawn first,
   * since a read-only frame draws it only while the bar is open.
   */
  private async openFind(): Promise<void> {
    const find = this.find?.element
    if (!find) {
      return
    }
    this.findOpen = true
    await this.updateComplete
    await find.show()
    this.findOpen = find.open
  }

  /** Hands the find bar drawn now the renderer to search through, again whenever either changes. */
  private attachFind(): void {
    const element = this.partNamed<HelixHeadlessFind>('find') ?? undefined
    const renderer = this.renderer
    if (element === this.find?.element && renderer === this.find?.renderer) {
      return
    }
    this.find?.sink.detach()
    this.find =
      element && renderer
        ? { element, renderer, sink: element.attach(this.finderFor(renderer)) }
        : undefined
  }

  /** A renderer, as the find bar searches through it: replacing where the renderer can. */
  private finderFor(renderer: EditorRenderer): Finder {
    return {
      end: () => renderer.findEnd?.(),
      find: (query, direction) => renderer.find?.(query, direction),
      ...(renderer.replace
        ? { replace: (query: FindQuery, all: boolean) => renderer.replace?.(query, all) }
        : {}),
    }
  }

  /** The find bar opened or closed, which the Find button shows. */
  private readonly handleFindToggle = (event: Event): void => {
    this.findOpen = (event as ToggleEvent).newState === 'open'
  }

  /**
   * Keys pressed in the document, heard on their way to the renderer.
   *
   * **Escape then Tab leaves the document**, because Tab in a list nests the
   * item and would otherwise keep focus there. The Tab is stopped on its way to
   * the renderer and left to the browser, which moves focus. Command+K opens
   * the address bar, and Alt+F10 moves to the toolbar. A key pressed during a
   * composition belongs to the input method, so none of these takes it.
   */
  private readonly handleKeys = (event: KeyboardEvent): void => {
    if (event.isComposing || !this.fromDocument(event)) {
      return
    }
    if (event.key === 'Tab' && this.escaped && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.escaped = false
      event.stopPropagation()
      return
    }
    this.escaped = event.key === 'Escape'
    if (commandWith(event, 'f') && this.searches && this.find) {
      event.preventDefault()
      event.stopPropagation()
      void this.openFind()
    } else if (commandWith(event, 'k') && this.drawsAny && this.draws('link')) {
      event.preventDefault()
      event.stopPropagation()
      this.openLink()
    } else if (
      event.key === 'F10' &&
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      this.drawsAny
    ) {
      event.preventDefault()
      event.stopPropagation()
      this.focusToolbar()
    }
  }

  /** Focus arrived in the frame: in the document, or on one of the frame's own controls. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    this.toggleState('document-focused', this.fromDocument(event))
  }

  /**
   * Whether an event began in the document: inside a child of the frame's own
   * that is in no named slot.
   *
   * **Asked of where the event began, and never of its path.** An event from
   * a slotted child passes through the slot it is in, and so through this
   * shadow root, on its way to the host, so a path naming the shadow root is
   * every event the frame hears.
   */
  private fromDocument(event: Event): boolean {
    const origin = event.composedPath()[0]
    return (
      origin instanceof Node &&
      [...this.children].some((child) => child.slot === '' && child.contains(origin))
    )
  }

  /** Focus left: the next focus in the frame, if any, says where it went. */
  private readonly handleFocusOut = (): void => {
    this.toggleState('document-focused', false)
  }

  /** A control added to `actions` or taken away, which the next render reads. */
  private readonly handleActions = (): void => {
    this.requestUpdate()
  }

  /** Keeps the check on the block type the selection is in: a block type is chosen, never cleared. */
  private readonly keepTick = (event: Event): void => {
    if (event.target === event.currentTarget) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  /** A block type was chosen in the menu. */
  private choose(tool: EditorTool): void {
    this.run(tool)
    this.chosen = true
  }

  /** The block menu closed: focus goes back to the document after a choice. */
  private readonly handleMenuToggle = (event: Event): void => {
    if ((event as ToggleEvent).newState === 'closed' && this.chosen) {
      this.chosen = false
      this.returnFocus()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.handleKeys, { capture: true })
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('focusout', this.handleFocusOut)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeys, { capture: true })
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('focusout', this.handleFocusOut)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
    /* An editor with no name is read as "Editor", which says nothing of what
       it holds. Development builds only. */
    auditName(
      this,
      () => null,
      'editor',
      () => this.label !== '',
    )
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (
      this.renderer &&
      (changed.has('label') ||
        changed.has('placeholder') ||
        changed.has('readOnly') ||
        changed.has('fallbackLabel'))
    ) {
      this.renderer.settings?.(this.settings)
    }
    this.attachFind()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Read from the children before the render, where they can be known: a
       server's root reports its slots before anything listens, so a
       `slotchange` alone left a served page's actions hidden. */
    this.hasActions = this.knownChildren.some((child) => child.getAttribute('slot') === 'actions')
    /* A field that turns read-only shuts its link bar in the same render, before
       the state below reads it, rather than in a second one. */
    if (changed.has('readOnly') && this.readOnly) {
      this.linkOpen = false
    }
    this.toggleState('link-open', this.linkOpen)
    this.toggleState('find-open', this.findOpen)
  }

  /**
   * How the block menu's button is drawn, which the styled tier sets so it
   * sits among the tools: unset here, where no axis is drawn.
   */
  protected get blockEmphasis(): 'ghost' | undefined {
    return undefined
  }

  /** Whether a tool's format holds at the selection, which presses its button. */
  private pressed(tool: EditorTool): boolean {
    return this.formats.applied.includes(tool)
  }

  /**
   * The glyph of a tool that points along the line, Undo's and Redo's, which
   * turns on a right-to-left page with the line.
   */
  private renderPointing(glyph: HelixIcon): TemplateResult {
    return html`<svg aria-hidden="true" data-glyph data-mirror fill="currentColor" viewBox=${glyph.viewBox}>
      ${unsafeSVG(glyph.content)}
    </svg>`
  }

  /** Undo and Redo. */
  protected renderHistory(): TemplateResult | typeof nothing {
    if (!this.draws('undo') && !this.draws('redo')) {
      return nothing
    }
    const button = this.tag('icon-button')
    return html`<div part="tools">${
      this.draws('undo')
        ? html`<${button}
            part="undo"
            exportparts="button: undo-button, live: undo-live, spinner: undo-spinner, text: undo-text"
            ?disabled=${this.disabled('undo')}
            label=${this.undoLabel}
            @click=${() => this.press('undo')}
            @helix-press=${stopPress}
          >
            <slot name="undo-icon">${this.renderPointing(arrowCounterClockwise)}</slot>
          </${button}>`
        : nothing
    }${
      this.draws('redo')
        ? html`<${button}
            part="redo"
            exportparts="button: redo-button, live: redo-live, spinner: redo-spinner, text: redo-text"
            ?disabled=${this.disabled('redo')}
            label=${this.redoLabel}
            @click=${() => this.press('redo')}
            @helix-press=${stopPress}
          >
            <slot name="redo-icon">${this.renderPointing(arrowClockwise)}</slot>
          </${button}>`
        : nothing
    }</div>`
  }

  /** Bold, Italic, Strikethrough, and Code, each pressed while its mark holds. */
  protected renderMarks(): TemplateResult | typeof nothing {
    if (!(['bold', 'italic', 'strike', 'code'] as const).some((tool) => this.draws(tool))) {
      return nothing
    }
    const button = this.tag('icon-button')
    return html`<div part="tools">${
      this.draws('bold')
        ? html`<${button}
            part="bold${this.pressed('bold') ? ' bold-pressed' : ''}"
            exportparts="button: bold-button, live: bold-live, spinner: bold-spinner, text: bold-text"
            aria-pressed=${this.pressed('bold') ? 'true' : 'false'}
            ?disabled=${this.disabled('bold')}
            label=${this.boldLabel}
            @click=${() => this.press('bold')}
            @helix-press=${stopPress}
          >
            <slot name="bold-icon">${drawIcon(textB)}</slot>
          </${button}>`
        : nothing
    }${
      this.draws('italic')
        ? html`<${button}
            part="italic${this.pressed('italic') ? ' italic-pressed' : ''}"
            exportparts="button: italic-button, live: italic-live, spinner: italic-spinner, text: italic-text"
            aria-pressed=${this.pressed('italic') ? 'true' : 'false'}
            ?disabled=${this.disabled('italic')}
            label=${this.italicLabel}
            @click=${() => this.press('italic')}
            @helix-press=${stopPress}
          >
            <slot name="italic-icon">${drawIcon(textItalic)}</slot>
          </${button}>`
        : nothing
    }${
      this.draws('strike')
        ? html`<${button}
            part="strike${this.pressed('strike') ? ' strike-pressed' : ''}"
            exportparts="button: strike-button, live: strike-live, spinner: strike-spinner, text: strike-text"
            aria-pressed=${this.pressed('strike') ? 'true' : 'false'}
            ?disabled=${this.disabled('strike')}
            label=${this.strikeLabel}
            @click=${() => this.press('strike')}
            @helix-press=${stopPress}
          >
            <slot name="strike-icon">${drawIcon(textStrikethrough)}</slot>
          </${button}>`
        : nothing
    }${
      this.draws('code')
        ? html`<${button}
            part="code${this.pressed('code') ? ' code-pressed' : ''}"
            exportparts="button: code-button, live: code-live, spinner: code-spinner, text: code-text"
            aria-pressed=${this.pressed('code') ? 'true' : 'false'}
            ?disabled=${this.disabled('code')}
            label=${this.codeLabel}
            @click=${() => this.press('code')}
            @helix-press=${stopPress}
          >
            <slot name="code-icon">${drawIcon(code)}</slot>
          </${button}>`
        : nothing
    }</div>`
  }

  /**
   * The Link button, which opens the address bar: pressed while the selection
   * is in a link, and expanded while the bar is open.
   */
  protected renderLinkTool(): TemplateResult | typeof nothing {
    if (!this.draws('link')) {
      return nothing
    }
    const button = this.tag('icon-button')
    const linked = this.formats.link !== ''
    return html`<${button}
      part="link${linked ? ' link-pressed' : ''}"
      exportparts="button: link-button, live: link-live, spinner: link-spinner, text: link-text"
      aria-pressed=${linked ? 'true' : 'false'}
      .expanded=${this.linkOpen}
      ?disabled=${this.disabled('link')}
      label=${this.linkLabel}
      @click=${() => (this.linkOpen ? this.closeLink() : this.openLink())}
      @helix-press=${stopPress}
    >
      <slot name="link-icon">${drawIcon(link)}</slot>
    </${button}>`
  }

  /** Bulleted list and Numbered list, each pressed while the selection is in one. */
  protected renderLists(): TemplateResult | typeof nothing {
    if (!this.draws('bullet-list') && !this.draws('ordered-list')) {
      return nothing
    }
    const button = this.tag('icon-button')
    return html`${
      this.draws('bullet-list')
        ? html`<${button}
            part="bullet-list${this.pressed('bullet-list') ? ' bullet-list-pressed' : ''}"
            exportparts="button: bullet-list-button, live: bullet-list-live, spinner: bullet-list-spinner, text: bullet-list-text"
            aria-pressed=${this.pressed('bullet-list') ? 'true' : 'false'}
            ?disabled=${this.disabled('bullet-list')}
            label=${this.bulletListLabel}
            @click=${() => this.press('bullet-list')}
            @helix-press=${stopPress}
          >
            <slot name="bullet-list-icon">${drawIcon(listBullets)}</slot>
          </${button}>`
        : nothing
    }${
      this.draws('ordered-list')
        ? html`<${button}
            part="ordered-list${this.pressed('ordered-list') ? ' ordered-list-pressed' : ''}"
            exportparts="button: ordered-list-button, live: ordered-list-live, spinner: ordered-list-spinner, text: ordered-list-text"
            aria-pressed=${this.pressed('ordered-list') ? 'true' : 'false'}
            ?disabled=${this.disabled('ordered-list')}
            label=${this.orderedListLabel}
            @click=${() => this.press('ordered-list')}
            @helix-press=${stopPress}
          >
            <slot name="ordered-list-icon">${drawIcon(listNumbers)}</slot>
          </${button}>`
        : nothing
    }`
  }

  /**
   * The lists and the quote, one group: each wraps the blocks it holds, so
   * they stand together on the toolbar, and a narrow one wraps them as one.
   */
  protected renderBlocks(): TemplateResult | typeof nothing {
    const lists = this.renderLists()
    const quote = this.renderQuote()
    return lists === nothing && quote === nothing
      ? nothing
      : html`<div part="tools">${lists}${quote}</div>`
  }

  /** Quote, pressed while the selection is in one. */
  protected renderQuote(): TemplateResult | typeof nothing {
    if (!this.draws('quote')) {
      return nothing
    }
    const button = this.tag('icon-button')
    return html`<${button}
      part="quote${this.pressed('quote') ? ' quote-pressed' : ''}"
      exportparts="button: quote-button, live: quote-live, spinner: quote-spinner, text: quote-text"
      aria-pressed=${this.pressed('quote') ? 'true' : 'false'}
      ?disabled=${this.disabled('quote')}
      label=${this.quoteLabel}
      @click=${() => this.press('quote')}
      @helix-press=${stopPress}
    >
      <slot name="quote-icon">${drawIcon(quotes)}</slot>
    </${button}>`
  }

  /**
   * The block menu: a button naming the block type at the selection, and a
   * row for each block type, the selection's checked.
   *
   * **Every name is in the button, one shown**, so it is as wide as the
   * longest in the reader's language and does not move the tools after it as
   * the selection moves between a paragraph and a heading.
   */
  protected renderBlockMenu(): TemplateResult | typeof nothing {
    const blocks = EDITOR_BLOCKS.filter((tool) => this.draws(tool))
    if (blocks.length === 0) {
      return nothing
    }
    const menu = this.tag('menu')
    const item = this.tag('menu-item')
    const button = this.tag('button')
    const current = this.formats.block
    const shown = current === '' ? 'paragraph' : current
    return html`<${menu}
      part="block-menu"
      exportparts="back: block-menu-back, back-mark: block-menu-back-mark, empty: block-menu-empty,
        header: block-menu-header, live: block-menu-live, loading: block-menu-loading,
        search-field: block-menu-search-field, surface: block-menu-surface,
        title: block-menu-title"
      label=${this.blockLabel}
      @toggle=${this.handleMenuToggle}
    >
      <${button}
        part="block"
        exportparts="button: block-button, live: block-live, spinner: block-spinner, text: block-text"
        slot="trigger"
        ?disabled=${!this.renderer || blocks.every((tool) => this.disabled(tool))}
        emphasis=${this.blockEmphasis ?? nothing}
        label=${formatWords(this, 'blockChosenLabel', { name: this.nameOf(shown) })}
        @helix-press=${stopPress}
      >
        <span part="block-name">
          ${blocks.map((tool) => html`<span data-block=${tool} ?hidden=${tool !== shown}>${this.nameOf(tool)}</span>`)}
        </span>
        ${drawIcon(caretDown, { slot: 'end' })}
      </${button}>
      ${blocks.map(
        (tool) => html`<${item}
          part="block-option"
          exportparts="end: block-option-end, item: block-option-item, mark: block-option-mark,
            shortcut: block-option-shortcut, shortcut-kbd: block-option-shortcut-kbd,
            shortcut-key: block-option-shortcut-key, shortcut-separator: block-option-shortcut-separator,
            start: block-option-start, surface: block-option-surface"
          value=${tool}
          checkable
          exclusive
          ?checked=${tool === current}
          ?disabled=${this.disabled(tool)}
          shortcut=${SHORTCUTS[tool] ?? nothing}
          @helix-before-toggle=${this.keepTick}
          @helix-select=${() => this.choose(tool)}
        >
          ${this.nameOf(tool)}
        </${item}>`,
      )}
    </${menu}>`
  }

  /** A line between two groups of tools. */
  protected renderDivider(): TemplateResult {
    const divider = this.tag('divider')
    return html`<${divider}
      part="divider"
      exportparts="content: divider-content, line: divider-line"
      orientation="vertical"
    ></${divider}>`
  }

  /** The Find button, which opens and closes the find bar: expanded while it is open. */
  protected renderFindTool(): TemplateResult | typeof nothing {
    if (!this.drawsFind) {
      return nothing
    }
    const button = this.tag('icon-button')
    return html`<${button}
      part="find-toggle"
      exportparts="button: find-toggle-button, live: find-toggle-live, spinner: find-toggle-spinner, text: find-toggle-text"
      .expanded=${this.findOpen}
      ?disabled=${!this.renderer}
      label=${this.findLabel}
      @click=${() => (this.findOpen ? this.find?.element.hide() : void this.openFind())}
      @helix-press=${stopPress}
    >
      <slot name="find-icon">${drawIcon(magnifyingGlass)}</slot>
    </${button}>`
  }

  /**
   * The find bar, a Find of the frame's own that searches through the
   * renderer, kept in the tree while closed so its field keeps what was typed.
   * The frame takes the find key from the document itself, so the bar takes
   * none. Drawn for any document that can be searched, with or without the
   * Find button.
   */
  protected renderFind(): TemplateResult | typeof nothing {
    if (!this.searches) {
      return nothing
    }
    const find = this.tag('find')
    return html`<${find}
      part="find"
      exportparts="actions: find-actions, bar: find-bar, close: find-close, close-button: find-close-button, close-live: find-close-live, close-spinner: find-close-spinner, close-text: find-close-text, controls: find-controls, controls-toolbar: find-controls-toolbar, count: find-count, field: find-field, live: find-live, match-case: find-match-case, match-case-button: find-match-case-button, match-case-live: find-match-case-live, match-case-pressed: find-match-case-pressed, match-case-spinner: find-match-case-spinner, match-case-text: find-match-case-text, next: find-next, next-button: find-next-button, next-live: find-next-live, next-spinner: find-next-spinner, next-text: find-next-text, previous: find-previous, previous-button: find-previous-button, previous-live: find-previous-live, previous-spinner: find-previous-spinner, previous-text: find-previous-text, regex: find-regex, regex-button: find-regex-button, regex-live: find-regex-live, regex-pressed: find-regex-pressed, regex-spinner: find-regex-spinner, regex-text: find-regex-text, replace: find-replace, replace-all: find-replace-all, replace-all-button: find-replace-all-button, replace-all-live: find-replace-all-live, replace-all-spinner: find-replace-all-spinner, replace-all-text: find-replace-all-text, replace-button: find-replace-button, replace-field: find-replace-field, replace-live: find-replace-live, replace-spinner: find-replace-spinner, replace-text: find-replace-text, replace-toggle: find-replace-toggle, replace-toggle-button: find-replace-toggle-button, replace-toggle-live: find-replace-toggle-live, replace-toggle-spinner: find-replace-toggle-spinner, replace-toggle-text: find-replace-toggle-text, whole-word: find-whole-word, whole-word-button: find-whole-word-button, whole-word-live: find-whole-word-live, whole-word-pressed: find-whole-word-pressed, whole-word-spinner: find-whole-word-spinner, whole-word-text: find-whole-word-text"
      label=${this.findLabel}
      ?readonly=${this.readOnly}
      shortcut=""
      @toggle=${this.handleFindToggle}
    ></${find}>`
  }

  /**
   * The toolbar: each group of tools `tools` names, a line between two, and
   * then the page's `actions`, one tab stop between them.
   *
   * **Always drawn**, empty where nothing is in it, because the `actions` slot
   * is inside it and a slot drawn only once something is slotted is a slot
   * nothing can be slotted into.
   */
  protected renderControls(): TemplateResult {
    const toolbar = this.tag('toolbar')
    const groups = this.readOnly
      ? []
      : [
          this.renderHistory(),
          this.renderBlockMenu(),
          this.renderMarks(),
          this.renderLinkTool(),
          this.renderBlocks(),
          this.renderFindTool(),
        ].filter((group) => group !== nothing)
    return html`<${toolbar} part="controls" exportparts="toolbar: controls-toolbar" label=${this.controlsLabel} @keydown=${this.handleToolbarKeys}>
      ${groups.map((group, at) => (at === 0 ? group : html`${this.renderDivider()}${group}`))}
      <slot name="actions" part="actions" ?hidden=${!this.hasActions} @slotchange=${this.handleActions}></slot>
    </${toolbar}>`
  }

  /**
   * The address bar, kept in the tree while closed so its field keeps what
   * was written. The field stands before the toolbar and outside it, because a
   * toolbar leaves the arrows to a text field.
   */
  protected renderLink(): TemplateResult | typeof nothing {
    if (this.readOnly || !this.draws('link')) {
      return nothing
    }
    const toolbar = this.tag('toolbar')
    const button = this.tag('icon-button')
    return html`<div part="link-bar" role="group" aria-label=${this.linkLabel} ?hidden=${!this.linkOpen}>
      <input
        part="link-field"
        aria-label=${this.linkFieldLabel}
        autocapitalize="off"
        autocomplete="url"
        dir="ltr"
        enterkeyhint="done"
        placeholder=${this.linkFieldLabel}
        spellcheck="false"
        type="url"
        .value=${live(this.draft)}
        @input=${this.handleLinkInput}
        @keydown=${this.handleLinkKeys}
      />
      <${toolbar} part="link-controls" exportparts="toolbar: link-controls-toolbar" label=${this.linkControlsLabel}>
        <${button}
          part="link-apply"
          exportparts="button: link-apply-button, live: link-apply-live, spinner: link-apply-spinner, text: link-apply-text"
          label=${this.linkApplyLabel}
          @click=${() => this.applyLink()}
          @helix-press=${stopPress}
        >
          ${drawIcon(check)}
        </${button}>
        <${button}
          part="link-remove"
          exportparts="button: link-remove-button, live: link-remove-live, spinner: link-remove-spinner, text: link-remove-text"
          ?disabled=${this.formats.link === ''}
          label=${this.linkRemoveLabel}
          @click=${() => this.removeLink()}
          @helix-press=${stopPress}
        >
          ${drawIcon(linkBreak)}
        </${button}>
        <${button}
          part="link-close"
          exportparts="button: link-close-button, live: link-close-live, spinner: link-close-spinner, text: link-close-text"
          label=${this.linkCloseLabel}
          @click=${() => this.closeLink()}
          @helix-press=${stopPress}
        >
          ${drawIcon(x)}
        </${button}>
      </${toolbar}>
    </div>`
  }

  protected override render(): TemplateResult {
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || this.getAttribute('aria-label') || this.fallbackLabel}
    >
      <div part="header" ?hidden=${!this.drawsAny && !this.hasActions && !this.findOpen}>
        ${this.renderControls()} ${this.renderLink()} ${this.renderFind()}
      </div>
      <div part="viewport"><slot></slot></div>
      <slot name="footer" part="footer"></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-editor': HelixHeadlessEditor
  }
}
