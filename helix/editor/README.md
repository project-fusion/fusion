# @fusion.dev/helix-editor

Connects the Helix `Editor` frame to ProseMirror: a schema whose blocks each
keep an id, the editing plugins, and a document drawn in your tokens.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-editor prosemirror-model prosemirror-state prosemirror-view
```

The element is on the [Editor reference](https://fusion.dev/helix/components/editor),
with its toolbar, its keys, and its parts.

```html
<helix-editor label="Release notes" placeholder="Write the release notes">
  <div><h2>0.217</h2><p>Write documents in your theme.</p></div>
</helix-editor>
```

```js
import '@fusion.dev/helix/editor'
import { connectEditor, editorPlugins, editorSchema } from '@fusion.dev/helix-editor'
import { DOMParser } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

const frame = document.querySelector('helix-editor')
const content = frame.querySelector('div')
const schema = editorSchema()

const view = new EditorView(
  { mount: content },
  {
    state: EditorState.create({
      doc: DOMParser.fromSchema(schema).parse(content),
      plugins: editorPlugins(schema),
    }),
  },
)
const connection = connectEditor(frame, view)

// Later, when the editor goes away:
connection.disconnect()
view.destroy()
```

**The document is your element, inside the frame.** ProseMirror draws in it,
so the browser's input methods, spellcheck, and right-to-left text work as they
do in any field, and a server can send the document's HTML there to be read
before any script loads. `connectEditor` adds the rules ProseMirror needs to
the page, so you load no stylesheet of ProseMirror's.

**ProseMirror is a peer dependency.** ProseMirror's packages check each
other's classes, so a page has one copy of `prosemirror-model`,
`prosemirror-state`, `prosemirror-transform`, and `prosemirror-view`, and this
package uses yours.

## What it exports

| Export | What |
|---|---|
| `connectEditor(frame, view, options)` | Connects a frame to a view, and returns a connection with `disconnect()` |
| `editorSchema(options)` | The schema: Helix's blocks and marks, with your own added through `nodes` and `marks` |
| `editorPlugins(schema, options)` | The keys, Markdown typed at the start of a line, history, the drop and gap cursors, `blockIds`, and `editorFrame` |
| `blockIds(options)` | Keeps every block's id its own |
| `findBlock(doc, id)` | Where a block stands, by its id |
| `withBlockId(spec)` | A block of your own that keeps an id as Helix's do |
| `toolCommands(schema, overrides)` | The command each toolbar tool runs |
| `formatsOf(state, commands)` | What the toolbar shows for a state |
| `setLink(schema, href)` | Links the selection, or with an empty address takes its link off |
| `safeHref(href)` | The address a link may have, or an empty string for one that could run something |
| `editorFrame()` | The plugin the frame speaks to the view through, which `editorPlugins` includes |
| `editorNodes`, `editorMarks` | Helix's node and mark specs |
| `EDITOR_CSS`, `adoptEditorSheet(root)` | The rules `connectEditor` adds to the page |

| Option | Of | What it does |
|---|---|---|
| `commands` | `connectEditor`, `editorPlugins` | Runs your commands in place of Helix's, by tool, such as undo and redo from y-prosemirror |
| `history` | `editorPlugins` | `false` leaves the undo history to another plugin |
| `markdown` | `editorPlugins` | `false` turns off `# `, `- `, `1. `, `> `, and three backticks at the start of a line |
| `marks`, `nodes` | `editorSchema` | Marks and nodes of your own, or one of Helix's replaced by its name |
| `generate` | `blockIds` | Makes a new id. Twelve letters and digits by default |

## Blocks and their ids

The schema keeps ProseMirror's own names: `paragraph`, `heading`,
`blockquote`, `code_block`, `horizontal_rule`, `bullet_list`, `ordered_list`,
`list_item`, and `hard_break`, with the marks `link`, `em`, `strong`, `strike`,
and `code`. Markdown reads into it and writes out of it through
`prosemirror-markdown` as it is.

Every block carries an `id`, written to `data-block-id` in HTML. `blockIds`
gives an id to a block that has none, and the second of two blocks sharing one
a new one, as a split or a paste leaves them. `findBlock(doc, id)` finds a
block again, for a comment anchored to it or an edit an agent makes to it.

A paragraph and a heading are drawn with `dir="auto"`, so each runs in the
direction of its own first letters, and a code block left to right.

## Collaboration

The page makes the editor's state, so a binding such as y-prosemirror is
plugins the page adds. Its own history replaces ProseMirror's:

```js
import { redoCommand, undoCommand, yCursorPlugin, ySyncPlugin, yUndoPlugin } from 'y-prosemirror'

const commands = { redo: redoCommand, undo: undoCommand }
const state = EditorState.create({
  schema,
  plugins: [
    ySyncPlugin(fragment),
    yCursorPlugin(awareness),
    yUndoPlugin(),
    ...editorPlugins(schema, { commands, history: false }),
  ],
})
connectEditor(frame, new EditorView({ mount: content }, { state }), { commands })
```

**A command is also asked without `dispatch`**, after every change, to know
whether its button can be pressed, so it has to change nothing then. That is
why the example takes y-prosemirror's `undoCommand` and `redoCommand`: its
`undo` and `redo` undo whenever they are called.

Block ids are attributes of the blocks, so the binding merges them with the
rest of the document.

## Working on it

```sh
bun run --filter @fusion.dev/helix-editor build
bun run --filter @fusion.dev/helix-editor test
```

The specs run ProseMirror's own view, under `bun test` and in a browser with
`bun run specs:browser editor`, where an input method's composition reaches it.

MIT
