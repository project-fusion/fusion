import type { Node } from 'prosemirror-model'
import { type EditorState, Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'

/**
 * What the frame's find bar asks for. The headless tier's `FindQuery`, held
 * to this by a spec, so this package depends on no tier.
 */
export interface EditorFindQuery {
  /** Whether case has to match, so "Error" does not find "error". */
  caseSensitive: boolean
  /** Whether `search` is a regular expression, in JavaScript's syntax. */
  regex: boolean
  /** What Replace puts in place of a match. */
  replace: string
  /** What the reader typed. */
  search: string
  /** Whether a match has to be a whole word. */
  wholeWord: boolean
}

/** Where a search stands: how many matches, and which is selected, counting from 0, or -1 for none. */
export interface EditorFindResult {
  count: number
  index: number
}

/** Which match a search selects: from the selection, the next one, or the previous one. */
export type EditorFindDirection = 'first' | 'next' | 'previous'

/** One match, as positions in the document. */
interface Match {
  from: number
  to: number
}

/** What the find plugin holds: the search, every match, and the selected one. */
interface Found {
  current: number
  matches: readonly Match[]
  query: EditorFindQuery | undefined
}

const NOTHING_FOUND: Found = { current: -1, matches: [], query: undefined }

/** The key the find plugin is found under. */
export const editorFindKey = new PluginKey<Found>('helix-editor-find')

/** The pattern a query reads as, or nothing for an empty search or a regular expression that cannot be read. */
const patternOf = (query: EditorFindQuery, global: boolean): RegExp | undefined => {
  if (query.search === '') {
    return undefined
  }
  const source = query.regex ? query.search : query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const flags = `${global ? 'g' : ''}${query.caseSensitive ? '' : 'i'}u`
  try {
    return new RegExp(query.wholeWord ? `\\b(?:${source})\\b` : source, flags)
  } catch {
    return undefined
  }
}

/**
 * What stands in the text for an inline node that is not text, such as a
 * hard break. A match never runs across it, and no search can type it.
 */
const BETWEEN = '\u0000'

/**
 * Every match of `query` in the document, block by block, so a match never
 * runs from one block into the next, nor across a hard break.
 */
export const matchesIn = (doc: Node, query: EditorFindQuery): Match[] => {
  const pattern = patternOf(query, true)
  if (!pattern) {
    return []
  }
  const matches: Match[] = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) {
      return true
    }
    let text = ''
    const at: number[] = []
    node.forEach((child, offset) => {
      const start = pos + 1 + offset
      if (child.isText) {
        const words = child.text ?? ''
        for (let index = 0; index < words.length; index += 1) {
          at.push(start + index)
        }
        text += words
      } else {
        at.push(start)
        text += BETWEEN
      }
    })
    for (const match of text.matchAll(pattern)) {
      const found = match[0]
      if (found !== '' && !found.includes(BETWEEN)) {
        const first = at[match.index] ?? 0
        const last = at[match.index + found.length - 1] ?? first
        matches.push({ from: first, to: last + 1 })
      }
    }
    return false
  })
  return matches
}

/**
 * The find bar's search in the document: every match marked, as
 * `helix-find-match`, and the selected one as `helix-find-current`, which the
 * connector's sheet paints as the base layer paints Find's highlights.
 * `editorPlugins` includes it.
 *
 * While a search is open, a change to the document finds again, staying on
 * the match the selected one became.
 */
export const editorFind = (): Plugin<Found> =>
  new Plugin<Found>({
    key: editorFindKey,
    props: {
      decorations: (state) => {
        const found = editorFindKey.getState(state)
        if (!found || found.matches.length === 0) {
          return DecorationSet.empty
        }
        return DecorationSet.create(
          state.doc,
          found.matches.map((match, index) =>
            Decoration.inline(match.from, match.to, {
              class: index === found.current ? 'helix-find-current' : 'helix-find-match',
            }),
          ),
        )
      },
    },
    state: {
      apply: (tr, found, _before, state) => {
        const told = tr.getMeta(editorFindKey) as Found | undefined
        if (told) {
          return told
        }
        if (!found.query || !tr.docChanged) {
          return found
        }
        const matches = matchesIn(state.doc, found.query)
        const was = found.matches[found.current]
        const anchor = was ? tr.mapping.map(was.from) : 0
        const next = matches.findIndex((match) => match.from >= anchor)
        return {
          current: next === -1 ? matches.length - 1 : next,
          matches,
          query: found.query,
        }
      },
      init: () => NOTHING_FOUND,
    },
  })

/** Where the search in a state stands, or nothing while none is open. */
export const findResultOf = (state: EditorState): EditorFindResult | undefined => {
  const found = editorFindKey.getState(state)
  return found?.query ? { count: found.matches.length, index: found.current } : undefined
}

/**
 * Finds `query` in the view's document, marks every match, and selects one:
 * with `first`, the first from the selection's start, which stays on a
 * selected match while the reader types; with `next`, the first from its
 * end; with `previous`, the last before its start. Each wraps around the
 * ends. The selected match is scrolled into view.
 */
export const findIn = (
  view: EditorView,
  query: EditorFindQuery,
  direction: EditorFindDirection,
): EditorFindResult => {
  const { state } = view
  const matches = matchesIn(state.doc, query)
  const { from, to } = state.selection
  let current = -1
  if (matches.length > 0) {
    current =
      direction === 'previous'
        ? matches.findLastIndex((match) => match.from < from)
        : matches.findIndex((match) => match.from >= (direction === 'next' ? to : from))
    if (current === -1) {
      current = direction === 'previous' ? matches.length - 1 : 0
    }
  }
  const tr = state.tr
    .setMeta(editorFindKey, { current, matches, query } satisfies Found)
    .setMeta('addToHistory', false)
  const selected = matches[current]
  if (selected) {
    tr.setSelection(TextSelection.create(tr.doc, selected.from, selected.to)).scrollIntoView()
  }
  view.dispatch(tr)
  return { count: matches.length, index: current }
}

/** Takes the marks a search drew away, and leaves the selection where it is. */
export const endFind = (view: EditorView): void => {
  if (editorFindKey.getState(view.state)?.query) {
    view.dispatch(
      view.state.tr.setMeta(editorFindKey, NOTHING_FOUND).setMeta('addToHistory', false),
    )
  }
}

/**
 * Replaces the selected match, or every match with `all`, in one step of the
 * undo history, and then selects the next match. Where the selection is no
 * match, it selects the next one and replaces nothing. A regular expression's
 * groups reach the replacement as `$1`, as they do in JavaScript.
 */
export const replaceIn = (
  view: EditorView,
  query: EditorFindQuery,
  all: boolean,
): EditorFindResult => {
  const one = patternOf(query, false)
  if (!one || !view.editable) {
    return findIn(view, query, 'first')
  }
  const { state } = view
  const matches = matchesIn(state.doc, query)
  const { from, to } = state.selection
  const chosen = all ? matches : matches.filter((match) => match.from === from && match.to === to)
  if (chosen.length === 0) {
    return findIn(view, query, 'next')
  }
  const tr = state.tr
  for (const match of [...chosen].reverse()) {
    tr.insertText(
      state.doc.textBetween(match.from, match.to).replace(one, query.replace),
      match.from,
      match.to,
    )
  }
  view.dispatch(tr)
  return findIn(view, query, all ? 'first' : 'next')
}
