import { baseKeymap, chainCommands, exitCode } from 'prosemirror-commands'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { history } from 'prosemirror-history'
import {
  type InputRule,
  inputRules,
  textblockTypeInputRule,
  undoInputRule,
  wrappingInputRule,
} from 'prosemirror-inputrules'
import { keymap } from 'prosemirror-keymap'
import type { NodeType, Schema } from 'prosemirror-model'
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list'
import type { Command, EditorState, Plugin } from 'prosemirror-state'
import { blockIds } from '../block-ids/block-ids.js'
import { editorFrame } from '../connect-editor/connect-editor.js'
import { type EditorTool, toolCommands } from '../tools/tools.js'

/** What `editorPlugins` takes. */
export interface EditorPluginsOptions {
  /**
   * The commands to run in place of Helix's, by tool, such as undo and redo
   * where y-prosemirror keeps the history: its `undoCommand` and
   * `redoCommand`. The keys run them too.
   */
  commands?: Partial<Record<EditorTool, Command>> | undefined
  /**
   * Whether `prosemirror-history` keeps the undo history. `false` where
   * another plugin keeps it, such as y-prosemirror's `yUndoPlugin`.
   */
  history?: boolean | undefined
  /**
   * Whether Markdown typed at the start of a line makes a block, such as
   * `# ` a heading and `- ` a list. On by default.
   */
  markdown?: boolean | undefined
}

/**
 * Each tool's key, as `prosemirror-keymap` names a chord. The frame shows
 * the same keys on the block menu's rows and in its description, so a key
 * changed here is changed there too.
 */
const KEYS: ReadonlyArray<[string, EditorTool]> = [
  ['Mod-z', 'undo'],
  ['Shift-Mod-z', 'redo'],
  ['Mod-y', 'redo'],
  ['Mod-b', 'bold'],
  ['Mod-i', 'italic'],
  ['Shift-Mod-x', 'strike'],
  ['Mod-e', 'code'],
  ['Mod-Alt-0', 'paragraph'],
  ['Mod-Alt-1', 'heading-1'],
  ['Mod-Alt-2', 'heading-2'],
  ['Mod-Alt-3', 'heading-3'],
  ['Mod-Alt-8', 'code-block'],
  ['Shift-Mod-8', 'bullet-list'],
  ['Shift-Mod-7', 'ordered-list'],
  ['Shift-Mod-9', 'quote'],
]

/** Whether the selection starts in a list item. */
const inList = (state: EditorState, item: NodeType): boolean => {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === item) {
      return true
    }
  }
  return false
}

/**
 * Markdown typed at the start of a line, made into the block it writes.
 *
 * **No typographic replacements**, such as curly quotes for straight ones:
 * which marks are right depends on the language, German opening a quote with
 * „ and French with «, and inside code a straight quote is the one meant.
 */
const markdownRules = (schema: Schema): InputRule[] => {
  const { nodes } = schema
  const rules: InputRule[] = []
  if (nodes.blockquote) {
    rules.push(wrappingInputRule(/^\s*>\s$/, nodes.blockquote))
  }
  if (nodes.ordered_list) {
    rules.push(
      wrappingInputRule(
        /^(\d+)\.\s$/,
        nodes.ordered_list,
        (match) => ({ order: Number(match[1]) }),
        (match, node) => node.childCount + node.attrs.order === Number(match[1]),
      ),
    )
  }
  if (nodes.bullet_list) {
    rules.push(wrappingInputRule(/^\s*([-+*])\s$/, nodes.bullet_list))
  }
  if (nodes.code_block) {
    rules.push(textblockTypeInputRule(/^```$/, nodes.code_block))
  }
  if (nodes.heading) {
    rules.push(
      textblockTypeInputRule(/^(#{1,6})\s$/, nodes.heading, (match) => ({
        level: match[1]?.length ?? 1,
      })),
    )
  }
  return rules
}

/**
 * The plugins a document Helix's toolbar edits takes: the keys for every
 * tool, Enter, Tab, and Shift+Tab in a list, Shift+Enter for a line break,
 * Markdown typed at the start of a line, undo history, the cursors drawn while
 * something is dragged and where no text can stand, `blockIds`, and the
 * plugin `connectEditor` speaks to the frame through.
 *
 * **Tab moves in a list only.** Anywhere else it is the browser's, and leaves
 * the document, so the document is never a place the keyboard cannot leave.
 */
export const editorPlugins = (schema: Schema, options: EditorPluginsOptions = {}): Plugin[] => {
  const commands = toolCommands(schema, options.commands)
  const keys: Record<string, Command> = {}
  for (const [key, tool] of KEYS) {
    const command = commands[tool]
    if (command) {
      keys[key] = command
    }
  }
  const item = schema.nodes.list_item
  if (item) {
    keys.Enter = splitListItem(item)
    /* Taken anywhere in a list, nested or not: an item that cannot nest, the
       first of its list, would otherwise let the Tab through and move focus
       out of the document mid-list. */
    keys.Tab = (state, dispatch) => {
      if (!inList(state, item)) {
        return false
      }
      sinkListItem(item)(state, dispatch)
      return true
    }
    keys['Shift-Tab'] = liftListItem(item)
  }
  const lineBreak = schema.nodes.hard_break
  if (lineBreak) {
    keys['Shift-Enter'] = chainCommands(exitCode, (state, dispatch) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(lineBreak.create()).scrollIntoView())
      }
      return true
    })
  }
  keys.Backspace = undoInputRule
  return [
    ...(options.markdown === false ? [] : [inputRules({ rules: markdownRules(schema) })]),
    keymap(keys),
    keymap(baseKeymap),
    dropCursor({ class: 'helix-editor-drop-cursor', color: false }),
    gapCursor(),
    ...(options.history === false ? [] : [history()]),
    blockIds(),
    editorFrame(),
  ]
}
