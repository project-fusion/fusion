# @fusion.dev/helix-editor

Connects Helix's `Code Editor` to CodeMirror 6, themed from your tokens:
highlighting in your theme's syntax colors, line numbers, folding, bracket
matching and history, diagnostics underlined in their tone with their line
numbers drawn in it, and the editor's own find bar finding and replacing in
CodeMirror.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-editor
```

The element is on the [Code Editor reference](https://fusion.dev/helix/components/code-editor).
On its own it is a text field in the code face; connected, CodeMirror draws it.
For a few lines of code in a form, `Code Input` needs no engine.

```js
import '@fusion.dev/helix/code-editor'
import { connectEditor } from '@fusion.dev/helix-editor'

const editor = document.querySelector('helix-code-editor')
const disconnect = connectEditor(editor)

editor.language = 'ts'
editor.diagnostics = [{ from: 79, to: 83, message: 'Cannot find name totl.' }]
editor.addEventListener('input', () => save(editor.value))
```

The value, the form, validation, and the events stay the element's: an edit in
CodeMirror goes through the element's `requestValue`, so a listener refusing
`helix-before-change` refuses the keystroke, and `input` follows each edit.

## Languages

`language` takes `css`, `html`, `js`, `jsx`, `json`, `md`, `py`, `rs`, `sh`,
`ts` and `tsx`, and the names they go by, such as `typescript`, `markdown`,
`python` and `rust`. Each grammar loads the first time an editor asks for it.
Any other name is plain text.

## More of CodeMirror

`connectEditor(editor, { extensions })` adds CodeMirror extensions after
Helix's own, such as completions or a language server client. To connect
CodeMirror under your own control, set the element's `engine` to
`codeMirrorEngine(options)`, or to an engine of your own that answers `mount`.

## Keyboard

Tab indents, and Escape then Tab leaves the editor. Command+F, or Control+F on
Windows and Linux, opens the editor's find bar, and Command+Z undoes.
