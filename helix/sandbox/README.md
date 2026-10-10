# @fusion.dev/helix-sandbox

A source editor for the Helix sandbox, and a code highlighter for Code Block.
The editor is CodeMirror in a custom element. The highlighter is Lezer's
grammars with no editor, so it also runs on a server.

```sh
npm install @fusion.dev/helix @fusion.dev/helix-styles @fusion.dev/helix-sandbox
```

| Entry | What it does |
|---|---|
| `@fusion.dev/helix-sandbox` | Exports what `/highlight` exports, and the editor's types. Registers nothing |
| `@fusion.dev/helix-sandbox/code-block` | Colors every Code Block on the page |
| `@fusion.dev/helix-sandbox/editor` | Registers `helix-sandbox-editor` |
| `@fusion.dev/helix-sandbox/highlight` | Turns a snippet into highlighted HTML |

The editor and the highlighter color code from the `--helix-color-syntax-*`
tokens, which `@fusion.dev/helix-styles` defines, so load its `helix.css` on
the page.

## The editor

`helix-sandbox-editor` is a source pane for the sandbox in
`@fusion.dev/helix/sandbox`. Put it in the sandbox's `source` slot and name the
source it holds, `html` or `css`, as you would a `helix-sandbox-source`:

```html
<helix-sandbox>
  <helix-sandbox-editor
    language="html"
    name="html"
    slot="source"
    value="<p>Hello</p>"
  ></helix-sandbox-editor>
  <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
</helix-sandbox>
```

```js
import '@fusion.dev/helix/sandbox'
import '@fusion.dev/helix-sandbox/editor'
```

- `language` is `css`, `html`, `js`, `jsx`, `mjs`, `sh`, `ts`, or `tsx`. A
  name the editor does not read draws the source plain, and the console says
  so once.
- `value` is the source. Setting it replaces the source and sends no edit
  event.
- `readonly` stops typing. A reader can still select and scroll.
- `field-label` names the editable region for a screen reader.

Each edit is `helix-before-edit` first, which you can cancel to refuse it, and
`helix-edit` once the editor holds it. `helix-caret` reports the line and
column for the sandbox's status bar. The editor is `:state(modified)` while it
holds an edit, and `reset()` puts back the source it was given.

Tab indents by two spaces. Escape, then Tab, moves focus out of the editor.

The [Sandbox reference](https://fusion.dev/helix/components/sandbox#helix-sandbox-editor)
lists every property, event, method, and state of the editor.

## The highlighter

`highlight` turns a snippet into HTML with a span for each token. It runs
anywhere, on a server included, so a static page can ship colored code with no
script:

```js
import { highlight, syntaxHighlighter, syntaxRules } from '@fusion.dev/helix-sandbox/highlight'

const markup = highlight('const total = 1', 'ts', syntaxHighlighter)
```

It reads `css`, `html`, `js`, `sh`, `ts`, and `tsx`, and `languageOf` reads the
names a page writes for them, such as `TypeScript`, `jsx`, or `bash`. Each span
carries Lezer's `tok-` classes unless you pass a highlighter of your own.
`syntaxHighlighter` gives the editor's classes, and `syntaxRules` is the CSS
that colors them.

To color every Code Block on the page, import the `code-block` entry beside
the block's:

```js
import '@fusion.dev/helix/code-block'
import '@fusion.dev/helix-sandbox/code-block'
```

A block reads its `language` by any name `languageOf` reads, and a language it
does not read is drawn plain. A block's own `highlight` wins.

## With the sandbox

The sandbox shell, its preview, and `helix-sandbox-source` are in
`@fusion.dev/helix/sandbox`, and they work without this package. The preview
runs each example in a frame of its own. The
[sandbox guide](https://fusion.dev/helix/docs/sandbox) says how to give it a
frame that loads your components.

## Working on it

```sh
bunx turbo run build --filter @fusion.dev/helix-sandbox   # styles, analyze, tsc
bun run --filter @fusion.dev/helix-sandbox test           # dom, then ssr
```

`helix/CONVENTIONS.md` applies here, and `helix component` holds the editor to
it. The spec runner and `jsxToHtml`, which the sandbox page on fusion.dev
uses, are in `helix/workbench`.
