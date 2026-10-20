import type { Node } from 'prosemirror-model'
import { type EditorState, Plugin, PluginKey, type Transaction } from 'prosemirror-state'

/** The letters an id is drawn from: lowercase, so one reads the same in a URL, a selector, and Markdown. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** How many letters an id has: 36 to the 12th, over 10^18, so two blocks drawing the same is not a case to plan for. */
const LENGTH = 12

/**
 * A new block id: twelve letters and digits, from the platform's random
 * source.
 *
 * **`getRandomValues` and not `randomUUID`**, which a page served over plain
 * HTTP from anywhere but `localhost` does not have.
 */
export const newBlockId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
  let id = ''
  for (const byte of bytes) {
    id += ALPHABET[byte % ALPHABET.length]
  }
  return id
}

/** Whether a node keeps an id: its type declares the attribute. */
const keepsId = (node: Node): boolean => 'id' in (node.type.spec.attrs ?? {})

/**
 * The transaction that gives each block an id where it has none, and the
 * second of two blocks sharing one a new one, or `null` where every id is
 * already its own.
 *
 * **The whole document's blocks and none of their text**: a paste brings an
 * id that may stand anywhere, so a duplicate is found only against every
 * block, and a text block's inline content is skipped, which keeps one pass to
 * the size of the outline.
 */
const fixIds = (state: EditorState, generate: () => string): Transaction | null => {
  const seen = new Set<string>()
  let tr: Transaction | null = null
  state.doc.descendants((node, pos) => {
    if (keepsId(node)) {
      const id = node.attrs.id
      if (typeof id !== 'string' || id === '' || seen.has(id)) {
        let next = generate()
        while (seen.has(next)) {
          next = generate()
        }
        seen.add(next)
        tr ??= state.tr
        tr.setNodeAttribute(pos, 'id', next)
      } else {
        seen.add(id)
      }
    }
    return !node.isTextblock
  })
  return tr
}

/** The key the block id plugin is found under. */
export const blockIdsKey = new PluginKey('helix-block-ids')

/** What `blockIds` takes. */
export interface BlockIdsOptions {
  /** Makes a new id. `newBlockId` by default. */
  generate?: (() => string) | undefined
}

/**
 * Keeps every block's id its own: a block with none is given one, and where
 * a split or a paste leaves two blocks sharing an id, the second is given a
 * new one, so the first, the block that was there, keeps it.
 *
 * Ids are given in the same step as the edit that called for them, so undo
 * takes both back together. A document loaded without ids is given them as
 * the view mounts, outside history, so undo never takes them away.
 *
 * **Under collaboration each writer gives ids for its own edits.** Ids are
 * attributes of the blocks, which a binding such as y-prosemirror merges as it
 * merges the rest, so every copy settles on the same id for a block.
 */
export const blockIds = (options: BlockIdsOptions = {}): Plugin => {
  const generate = options.generate ?? newBlockId
  return new Plugin({
    appendTransaction: (transactions, _before, state) =>
      transactions.some((tr) => tr.docChanged) ? fixIds(state, generate) : null,
    key: blockIdsKey,
    /* A microtask later, because a plugin's view is made while the editor
       view is still being built, and a dispatch from inside its constructor
       updates a view that is not finished. */
    view: (view) => {
      queueMicrotask(() => {
        const tr = view.isDestroyed ? null : fixIds(view.state, generate)
        if (tr) {
          view.dispatch(tr.setMeta('addToHistory', false))
        }
      })
      return {}
    },
  })
}

/** Where a block stands in the document, by its id, or nothing where no block has it. */
export const findBlock = (doc: Node, id: string): { node: Node; pos: number } | undefined => {
  let found: { node: Node; pos: number } | undefined
  doc.descendants((node, pos) => {
    if (found) {
      return false
    }
    if (keepsId(node) && node.attrs.id === id) {
      found = { node, pos }
      return false
    }
    return !node.isTextblock
  })
  return found
}
