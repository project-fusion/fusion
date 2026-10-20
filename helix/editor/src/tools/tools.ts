import { setBlockType, toggleMark, wrapIn } from 'prosemirror-commands'
import { redo, undo } from 'prosemirror-history'
import type { MarkType, Node, NodeType, ResolvedPos, Schema } from 'prosemirror-model'
import { liftListItem, wrapInList } from 'prosemirror-schema-list'
import type { Command, EditorState } from 'prosemirror-state'
import { liftTarget } from 'prosemirror-transform'
import { safeHref } from '../schema/schema.js'

/**
 * A tool the Editor frame's toolbar draws, by the name the frame gives it.
 * The frame's own type is the headless tier's, held to this one by a spec.
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

/** What the toolbar shows about the selection, as the frame takes it. */
export interface EditorFormats {
  applied: readonly EditorTool[]
  block: EditorTool | ''
  link: string
  unavailable: readonly EditorTool[]
}

/** Every tool, in the order the toolbar draws them. */
export const EDITOR_TOOLS: readonly EditorTool[] = [
  'undo',
  'redo',
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
  'code-block',
  'bold',
  'italic',
  'strike',
  'code',
  'link',
  'bullet-list',
  'ordered-list',
  'quote',
]

/** The mark each mark tool toggles, by its name in the schema. */
const MARKS = { bold: 'strong', code: 'code', italic: 'em', strike: 'strike' } as const

/** The heading tools and their levels. */
const HEADINGS = { 'heading-1': 1, 'heading-2': 2, 'heading-3': 3 } as const

/** The nearest list around a position, its node and where it starts, or nothing outside a list. */
const listAround = (
  $pos: ResolvedPos,
  types: readonly NodeType[],
): { depth: number; node: Node } | undefined => {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth)
    if (types.includes(node.type)) {
      return { depth, node }
    }
  }
  return undefined
}

/** Whether a position stands inside a node of a type. */
const inside = ($pos: ResolvedPos, type: NodeType): boolean => {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type === type) {
      return true
    }
  }
  return false
}

/**
 * Makes the selection a list of one kind: takes it out of that list where it
 * is in one, turns the list it is in into this kind, and wraps it in a new
 * one anywhere else.
 */
const toggleList =
  (listType: NodeType, item: NodeType, lists: readonly NodeType[]): Command =>
  (state, dispatch) => {
    const around = listAround(state.selection.$from, lists)
    if (around?.node.type === listType) {
      return liftListItem(item)(state, dispatch)
    }
    if (around) {
      if (dispatch) {
        const pos = state.selection.$from.before(around.depth)
        dispatch(
          state.tr.setNodeMarkup(pos, listType, { id: around.node.attrs.id }).scrollIntoView(),
        )
      }
      return true
    }
    return wrapInList(listType)(state, dispatch)
  }

/** Puts the selection in a quote, or takes it out of the quote it is in. */
const toggleQuote =
  (quote: NodeType): Command =>
  (state, dispatch) => {
    const { $from, $to } = state.selection
    if (inside($from, quote)) {
      const range = $from.blockRange($to, (node) => node.type === quote)
      const target = range ? liftTarget(range) : null
      if (!range || target === null) {
        return false
      }
      if (dispatch) {
        dispatch(state.tr.lift(range, target).scrollIntoView())
      }
      return true
    }
    return wrapIn(quote)(state, dispatch)
  }

/**
 * The run of a mark around a position: where the link the caret is in starts
 * and ends, across the text nodes that carry the same mark.
 */
export const markRange = (
  $pos: ResolvedPos,
  type: MarkType,
): { from: number; mark: ReturnType<MarkType['create']>; to: number } | undefined => {
  const parent = $pos.parent
  const start = $pos.start()
  let index = $pos.index()
  let child = parent.maybeChild(index)
  let mark = child ? type.isInSet(child.marks) : undefined
  if (!mark && $pos.textOffset === 0 && index > 0) {
    index -= 1
    child = parent.maybeChild(index)
    mark = child ? type.isInSet(child.marks) : undefined
  }
  if (!(child && mark)) {
    return undefined
  }
  let first = index
  while (first > 0 && mark.isInSet(parent.child(first - 1).marks)) {
    first -= 1
  }
  let last = index
  while (last < parent.childCount - 1 && mark.isInSet(parent.child(last + 1).marks)) {
    last += 1
  }
  let from = start
  for (let at = 0; at < first; at += 1) {
    from += parent.child(at).nodeSize
  }
  let to = from
  for (let at = first; at <= last; at += 1) {
    to += parent.child(at).nodeSize
  }
  return { from, mark, to }
}

/**
 * Links the selection to an address, or with an empty address takes its link
 * off. Refused for an address `safeHref` refuses, where the schema has no
 * link, and where the text there takes no link, such as in a code block.
 *
 * A caret in a link relinks or unlinks the whole link. A caret anywhere else
 * writes the address as linked text.
 */
export const setLink =
  (schema: Schema, href: string): Command =>
  (state, dispatch) => {
    const type = schema.marks.link
    const { $from, empty, from, to } = state.selection
    if (!type || !$from.parent.type.allowsMarkType(type)) {
      return false
    }
    const around = empty ? markRange($from, type) : undefined
    const [start, end] = around ? [around.from, around.to] : [from, to]
    if (href === '') {
      if (!state.doc.rangeHasMark(start, end, type)) {
        return false
      }
      if (dispatch) {
        dispatch(state.tr.removeMark(start, end, type).scrollIntoView())
      }
      return true
    }
    const address = safeHref(href)
    if (address === '') {
      return false
    }
    if (dispatch) {
      const mark = type.create({ href: address })
      const tr =
        empty && !around
          ? state.tr.insertText(address, from).addMark(from, from + address.length, mark)
          : state.tr.removeMark(start, end, type).addMark(start, end, mark)
      dispatch(tr.scrollIntoView())
    }
    return true
  }

/**
 * The command each tool runs, for the tools the schema has the nodes and
 * marks for: a mark toggled, a block type set, a list or a quote put on or
 * taken off, and undo and redo through `prosemirror-history`. `overrides`
 * replaces any of them, such as undo and redo where y-prosemirror keeps the
 * history. A link takes an address, so `setLink` runs it, and it is not here.
 */
export const toolCommands = (
  schema: Schema,
  overrides: Partial<Record<EditorTool, Command>> = {},
): Partial<Record<EditorTool, Command>> => {
  const { nodes, marks } = schema
  const commands: Partial<Record<EditorTool, Command>> = { redo, undo }
  for (const [tool, name] of Object.entries(MARKS) as Array<[keyof typeof MARKS, string]>) {
    const mark = marks[name]
    if (mark) {
      commands[tool] = toggleMark(mark)
    }
  }
  if (nodes.paragraph) {
    commands.paragraph = setBlockType(nodes.paragraph)
  }
  const heading = nodes.heading
  if (heading) {
    for (const [tool, level] of Object.entries(HEADINGS) as Array<
      [keyof typeof HEADINGS, number]
    >) {
      commands[tool] = setBlockType(heading, { level })
    }
  }
  if (nodes.code_block) {
    commands['code-block'] = setBlockType(nodes.code_block)
  }
  const item = nodes.list_item
  const lists = [nodes.bullet_list, nodes.ordered_list].filter(
    (type): type is NodeType => type !== undefined,
  )
  if (item && nodes.bullet_list) {
    commands['bullet-list'] = toggleList(nodes.bullet_list, item, lists)
  }
  if (item && nodes.ordered_list) {
    commands['ordered-list'] = toggleList(nodes.ordered_list, item, lists)
  }
  if (nodes.blockquote) {
    commands.quote = toggleQuote(nodes.blockquote)
  }
  return { ...commands, ...overrides }
}

/** The block type a position is in, as the block menu names it. */
const blockOf = ($pos: ResolvedPos): EditorTool | '' => {
  const node = $pos.parent
  switch (node.type.name) {
    case 'paragraph':
      return 'paragraph'
    case 'code_block':
      return 'code-block'
    case 'heading': {
      const level = node.attrs.level
      return level === 1 ? 'heading-1' : level === 2 ? 'heading-2' : level === 3 ? 'heading-3' : ''
    }
    default:
      return ''
  }
}

/** Whether a mark holds at the selection: on the caret's stored or inherited marks, or anywhere in a range. */
const markHolds = (state: EditorState, type: MarkType): boolean => {
  const { $from, empty, from, to } = state.selection
  return empty
    ? type.isInSet(state.storedMarks ?? $from.marks()) !== undefined
    : state.doc.rangeHasMark(from, to, type)
}

/** The address of the link at the selection, or empty. */
const linkAt = (state: EditorState, type: MarkType | undefined): string => {
  if (!type) {
    return ''
  }
  const { $from, empty, from, to } = state.selection
  if (empty) {
    return (markRange($from, type)?.mark.attrs.href as string | undefined) ?? ''
  }
  let href = ''
  state.doc.nodesBetween(from, to, (node) => {
    const mark = href === '' ? type.isInSet(node.marks) : undefined
    if (mark) {
      href = mark.attrs.href as string
    }
    return href === ''
  })
  return href
}

/**
 * What the toolbar shows for a state: the tools whose format holds at the
 * selection, its block type, the address of its link, and the tools that
 * cannot apply there.
 *
 * **A tool cannot apply where its command, asked without being run, refuses.**
 * The block type the selection is already in is the exception: setting a
 * paragraph to a paragraph changes nothing and is refused, and the menu still
 * offers it, checked.
 */
export const formatsOf = (
  state: EditorState,
  commands: Partial<Record<EditorTool, Command>>,
): EditorFormats => {
  const { schema } = state
  const { $from } = state.selection
  const applied: EditorTool[] = []
  for (const [tool, name] of Object.entries(MARKS) as Array<[keyof typeof MARKS, string]>) {
    const mark = schema.marks[name]
    if (mark && markHolds(state, mark)) {
      applied.push(tool)
    }
  }
  const lists = [schema.nodes.bullet_list, schema.nodes.ordered_list].filter(
    (type): type is NodeType => type !== undefined,
  )
  const list = listAround($from, lists)
  if (list?.node.type.name === 'bullet_list') {
    applied.push('bullet-list')
  } else if (list?.node.type.name === 'ordered_list') {
    applied.push('ordered-list')
  }
  const quote = schema.nodes.blockquote
  if (quote && inside($from, quote)) {
    applied.push('quote')
  }
  const block = blockOf($from)
  const link = linkAt(state, schema.marks.link)
  const unavailable = EDITOR_TOOLS.filter((tool) => {
    if (tool === block) {
      return false
    }
    if (tool === 'link') {
      const type = schema.marks.link
      return !(type && $from.parent.type.allowsMarkType(type))
    }
    const command = commands[tool]
    return !command?.(state)
  })
  return { applied, block, link, unavailable }
}
