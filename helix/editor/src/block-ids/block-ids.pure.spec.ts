import { describe, expect, test } from 'bun:test'
import { Fragment, type Node, Slice } from 'prosemirror-model'
import { EditorState, TextSelection } from 'prosemirror-state'
import { editorSchema } from '../schema/schema.js'
import { blockIds, findBlock } from './block-ids.js'

const schema = editorSchema()

/** Ids drawn in order, so a spec can say which block took which. */
const counter = (): (() => string) => {
  let next = 0
  return () => {
    next += 1
    return `id${next}`
  }
}

/** Every block's id, in document order. */
const ids = (doc: Node): unknown[] => {
  const found: unknown[] = []
  doc.descendants((node) => {
    if ('id' in (node.type.spec.attrs ?? {})) {
      found.push(node.attrs.id)
    }
    return !node.isTextblock
  })
  return found
}

const paragraph = (text: string, id: string | null = null): Node =>
  schema.node('paragraph', { id }, text ? [schema.text(text)] : [])

const state = (blocks: Node[]): EditorState =>
  EditorState.create({
    doc: schema.node('doc', null, blocks),
    plugins: [blockIds({ generate: counter() })],
  })

describe('blockIds', () => {
  test('gives an id to every block an edit leaves without one', () => {
    const before = state([paragraph('One'), paragraph('Two', 'kept')])
    const after = before.applyTransaction(before.tr.insertText('!', 4)).state
    expect(ids(after.doc)).toEqual(['id1', 'kept'])
  })

  test('a split gives the new block an id, and the block that was there keeps its own', () => {
    const before = state([paragraph('Hello world', 'first')])
    const after = before.applyTransaction(before.tr.split(6)).state
    expect(ids(after.doc)).toEqual(['first', 'id1'])
    expect(after.doc.child(0).textContent).toBe('Hello')
  })

  test('a pasted copy of a block gives the copy a new id', () => {
    const before = state([paragraph('Original', 'same')])
    const copy = new Slice(Fragment.from(paragraph('Copy', 'same')), 0, 0)
    const end = before.doc.content.size
    const after = before.applyTransaction(before.tr.replace(end, end, copy)).state
    expect(ids(after.doc)).toEqual(['same', 'id1'])
  })

  test('the ids in a list, a quote, and their items are kept unique too', () => {
    const item = (text: string, id: string) =>
      schema.node('list_item', { id }, [paragraph(text, `${id}-p`)])
    const before = state([
      schema.node('bullet_list', { id: 'list' }, [item('A', 'a'), item('B', 'a')]),
      schema.node('blockquote', { id: 'quote' }, [paragraph('Q', 'q')]),
    ])
    const after = before.applyTransaction(before.tr.insertText('!', 3)).state
    const all = ids(after.doc)
    expect(new Set(all).size).toBe(all.length)
    expect(all).toContain('list')
    expect(all).toContain('quote')
  })

  test('the id fix is part of the edit, so one undo step takes back both', () => {
    const before = state([paragraph('Hello world', 'first')])
    const result = before.applyTransaction(
      before.tr.setSelection(TextSelection.create(before.doc, 6)).split(6),
    )
    expect(result.transactions).toHaveLength(2)
    expect(result.transactions[1]?.getMeta('appendedTransaction')).toBe(result.transactions[0])
  })

  test('an edit that changes no block leaves the ids alone', () => {
    const before = state([paragraph('One', 'a')])
    const result = before.applyTransaction(
      before.tr.setSelection(TextSelection.create(before.doc, 2)),
    )
    expect(result.transactions).toHaveLength(1)
  })
})

describe('findBlock', () => {
  test('finds a block by its id, and nothing for an id no block has', () => {
    const doc = schema.node('doc', null, [paragraph('One', 'a'), paragraph('Two', 'b')])
    expect(findBlock(doc, 'b')?.pos).toBe(5)
    expect(findBlock(doc, 'b')?.node.textContent).toBe('Two')
    expect(findBlock(doc, 'missing')).toBeUndefined()
  })
})
