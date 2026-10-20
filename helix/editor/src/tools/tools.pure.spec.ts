import { describe, expect, test } from 'bun:test'
import { type Node, Schema } from 'prosemirror-model'
import { type Command, EditorState, TextSelection } from 'prosemirror-state'
import { editorSchema, safeHref } from '../schema/schema.js'
import { formatsOf, setLink, toolCommands } from './tools.js'

const schema = editorSchema()
const commands = toolCommands(schema)

/** A value the schema is sure to have, or a failure naming what was missing. */
const sure = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`The schema has no ${what}.`)
  }
  return value
}

const link = sure(schema.marks.link, 'link mark')

const text = (words: string, marks: string[] = []) =>
  schema.text(
    words,
    marks.map((name) => schema.marks[name]?.create() ?? link.create({ href: name })),
  )

/** A state over some blocks with the caret, or a range, where the spec says. */
const at = (blocks: Node[], from: number, to = from): EditorState => {
  const doc = schema.node('doc', null, blocks)
  return EditorState.create({ doc, selection: TextSelection.create(doc, from, to) })
}

/** Runs a command and hands back the state it leaves, or the same state where it refused. */
const ran = (state: EditorState, command: Command | undefined): EditorState => {
  let next = state
  command?.(state, (tr) => {
    next = state.apply(tr)
  })
  return next
}

const paragraph = (...content: Node[]) => schema.node('paragraph', null, content)

describe('formatsOf', () => {
  test('presses a mark the caret is in, and a mark the whole range holds', () => {
    const blocks = [paragraph(text('plain '), text('bold', ['strong']))]
    expect(formatsOf(at(blocks, 9), commands).applied).toEqual(['bold'])
    expect(formatsOf(at(blocks, 2), commands).applied).toEqual([])
    expect(formatsOf(at(blocks, 8, 11), commands).applied).toEqual(['bold'])
  })

  test('names the block type the selection is in', () => {
    const heading = schema.node('heading', { level: 2 }, [text('Title')])
    expect(formatsOf(at([heading], 2), commands).block).toBe('heading-2')
    expect(formatsOf(at([paragraph(text('Body'))], 2), commands).block).toBe('paragraph')
    const deep = schema.node('heading', { level: 5 }, [text('Deep')])
    expect(formatsOf(at([deep], 2), commands).block).toBe('')
  })

  test('presses the list and the quote the selection is in', () => {
    const list = schema.node('ordered_list', null, [
      schema.node('list_item', null, [paragraph(text('One'))]),
    ])
    expect(formatsOf(at([list], 3), commands).applied).toEqual(['ordered-list'])
    const quote = schema.node('blockquote', null, [paragraph(text('Said'))])
    expect(formatsOf(at([quote], 2), commands).applied).toEqual(['quote'])
  })

  test('gives the address of the link the caret is in', () => {
    const blocks = [paragraph(text('see '), text('docs', ['https://fusion.dev']), text(' here'))]
    expect(formatsOf(at(blocks, 7), commands).link).toBe('https://fusion.dev')
    expect(formatsOf(at(blocks, 2), commands).link).toBe('')
  })

  test('a code block takes no marks and no link, and its own block type stays offered', () => {
    const code = schema.node('code_block', null, [schema.text('let a = 1')])
    const formats = formatsOf(at([code], 2), commands)
    expect(formats.block).toBe('code-block')
    expect(formats.unavailable).toContain('bold')
    expect(formats.unavailable).toContain('link')
    expect(formats.unavailable).not.toContain('code-block')
    expect(formats.unavailable).not.toContain('paragraph')
  })

  test('undo and redo cannot apply with no history', () => {
    const formats = formatsOf(at([paragraph(text('One'))], 2), commands)
    expect(formats.unavailable).toContain('undo')
    expect(formats.unavailable).toContain('redo')
  })
})

describe('the tools', () => {
  test('a mark tool toggles its mark over the range', () => {
    const state = at([paragraph(text('Hello'))], 1, 6)
    const bold = ran(state, commands.bold)
    expect(formatsOf(bold, commands).applied).toEqual(['bold'])
    expect(formatsOf(ran(bold, commands.bold), commands).applied).toEqual([])
  })

  test('a list tool wraps, changes the kind of list, and lifts out of its own', () => {
    const state = at([paragraph(text('Item'))], 2)
    const bulleted = ran(state, commands['bullet-list'])
    expect(bulleted.doc.firstChild?.type.name).toBe('bullet_list')
    const numbered = ran(bulleted, commands['ordered-list'])
    expect(numbered.doc.firstChild?.type.name).toBe('ordered_list')
    const lifted = ran(numbered, commands['ordered-list'])
    expect(lifted.doc.firstChild?.type.name).toBe('paragraph')
  })

  test('the quote tool wraps a paragraph and takes it out again', () => {
    const state = at([paragraph(text('Said'))], 2)
    const quoted = ran(state, commands.quote)
    expect(quoted.doc.firstChild?.type.name).toBe('blockquote')
    expect(ran(quoted, commands.quote).doc.firstChild?.type.name).toBe('paragraph')
  })

  test('a heading tool sets the level, and the paragraph tool sets it back', () => {
    const state = at([paragraph(text('Title'))], 2)
    const heading = ran(state, commands['heading-3'])
    expect(heading.doc.firstChild?.type.name).toBe('heading')
    expect(heading.doc.firstChild?.attrs.level).toBe(3)
    expect(ran(heading, commands.paragraph).doc.firstChild?.type.name).toBe('paragraph')
  })

  test('a schema without a node or a mark has no tool for it', () => {
    const without = new Schema({
      marks: { em: sure(schema.spec.marks.get('em'), 'em mark') },
      nodes: schema.spec.nodes.remove('code_block').remove('blockquote'),
    })
    const some = toolCommands(without)
    expect(some.italic).toBeDefined()
    expect(some.bold).toBeUndefined()
    expect(some['code-block']).toBeUndefined()
    expect(some.quote).toBeUndefined()
  })
})

describe('setLink', () => {
  test('links a range to an address', () => {
    const state = at([paragraph(text('docs'))], 1, 5)
    const linked = ran(state, setLink(schema, 'fusion.dev/helix'))
    expect(formatsOf(at([sure(linked.doc.firstChild, 'first block')], 2), commands).link).toBe(
      'https://fusion.dev/helix',
    )
  })

  test('a caret in a link relinks or unlinks the whole link', () => {
    const blocks = [paragraph(text('see '), text('docs', ['https://old.dev']))]
    const relinked = ran(at(blocks, 7), setLink(schema, 'https://new.dev'))
    expect(formatsOf(at([sure(relinked.doc.firstChild, 'first block')], 6), commands).link).toBe(
      'https://new.dev',
    )
    const unlinked = ran(at(blocks, 7), setLink(schema, ''))
    expect(unlinked.doc.rangeHasMark(0, unlinked.doc.content.size, link)).toBe(false)
  })

  test('a caret outside a link writes the address as linked text', () => {
    const state = at([paragraph(text('see '))], 5)
    const written = ran(state, setLink(schema, 'https://fusion.dev'))
    expect(written.doc.textContent).toBe('see https://fusion.dev')
  })

  test('refuses an address that could run something', () => {
    const state = at([paragraph(text('docs'))], 1, 5)
    expect(setLink(schema, 'javascript:alert(1)')(state)).toBe(false)
    expect(setLink(schema, 'data:text/html,hi')(state)).toBe(false)
  })
})

describe('safeHref', () => {
  test('keeps web, mail, phone and same-site addresses, and refuses other schemes', () => {
    expect(safeHref('https://fusion.dev')).toBe('https://fusion.dev')
    expect(safeHref('mailto:ross@fusion.dev')).toBe('mailto:ross@fusion.dev')
    expect(safeHref('/helix/components')).toBe('/helix/components')
    expect(safeHref('#usage')).toBe('#usage')
    expect(safeHref('fusion.dev')).toBe('https://fusion.dev')
    expect(safeHref('  ')).toBe('')
    expect(safeHref('JavaScript:alert(1)')).toBe('')
    expect(safeHref('vbscript:x')).toBe('')
  })
})
