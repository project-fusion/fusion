import { expect, test } from 'bun:test'
import type {
  EditorFormats as FrameFormats,
  EditorTool as FrameTool,
  HelixHeadlessEditor,
} from '@fusion.dev/helix-headless/editor'
import type { EditorView } from 'prosemirror-view'
import type { EditorFormats, EditorTool } from './tools/tools.js'

/** The connector, by type only: loading it here would evaluate ProseMirror's view before a spec registers the DOM. */
type Connector = typeof import('./index.js')

/* This package names the frame's tools and what the toolbar shows in types of
   its own, so it depends on no tier. These lines hold them to the headless
   tier's: a tool added on one side and not the other fails the typecheck
   here rather than at a page. */
const tools = (one: EditorTool, other: FrameTool): [FrameTool, EditorTool] => [one, other]
const formats = (one: EditorFormats, other: FrameFormats): [FrameFormats, EditorFormats] => [
  one,
  other,
]

/* And the frame itself is what `connectEditor` takes. */
const fits = (connector: Connector) => (frame: HelixHeadlessEditor, view: EditorView) =>
  connector.connectEditor(frame, view)

test('the connector and the frame name the same tools and formats', () => {
  expect([typeof tools, typeof formats, typeof fits]).toEqual(['function', 'function', 'function'])
})
