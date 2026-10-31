import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Code Block. Each one presses by a row: the file tabs, the wrap
 * button, and the folds, in the order they stand. The record says the code drawn,
 * the name on the copy button, what a screen reader hears of each line of a diff,
 * each fold, which tab is chosen, and whether the wrap button is pressed.
 */

const PATCH = `--- a/src/config.ts
+++ b/src/config.ts
@@ -10,8 +10,8 @@
 one
 two
 three
 four
-  timeout: 1000,
+  timeout: 5000,
 five
 six
 seven
 eight
`

const PAIRLESS = `--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
 kept
+added
 last
`

/** A block of `code`, with its props. */
const block = (code: string, props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-code-block', props, [code])

const FILES = el('helix-code-block', { file: 'b.css' }, [
  el('helix-code-block', { label: 'a.ts', language: 'ts' }, ['const a = 1']),
  el('helix-code-block', { label: 'b.css', language: 'css' }, ['a { color: red }']),
  el('helix-code-block', { language: 'html' }, ['<a></a>']),
])

const press = (row: number) => ({ kind: 'press' as const, row })
/** A press past the last row, which changes nothing and reads what stands. */
const READ = { kind: 'press' as const, row: 99 }
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** Code blocks: names, a wrap, a diff and its folds, and files under tabs. */
export const CODE_BLOCK: readonly Scenario[] = [
  {
    family: 'code-block',
    intents: [READ],
    name: 'plain code draws as written, with a copy button of no name',
    setup: block('const a = 1\nconst b = 2'),
  },
  {
    family: 'code-block',
    intents: [READ],
    name: 'a label names the copy button',
    setup: block('a', { label: 'app.ts' }),
  },
  {
    family: 'code-block',
    intents: [READ],
    name: 'a language names the copy button where there is no label',
    setup: block('a', { language: 'ts' }),
  },
  {
    family: 'code-block',
    intents: [READ],
    name: 'no-copy draws no copy button',
    setup: block('a', { label: 'app.ts', 'no-copy': true }),
  },
  {
    family: 'code-block',
    intents: [press(0), press(0)],
    name: 'the wrap button turns wrap on and off, and says so',
    setup: block('a', { wrappable: true }),
  },
  {
    family: 'code-block',
    intents: [refuse('before-check'), press(0)],
    name: 'a refused wrap leaves the lines as they were',
    setup: block('a', { wrappable: true }),
  },
  {
    family: 'code-block',
    intents: [READ],
    name: 'a diff says its lines, each with its mark',
    setup: block(PAIRLESS, { diff: true }),
  },
  {
    family: 'code-block',
    intents: [READ],
    name: 'a diff names its copy button by its file',
    setup: block(PATCH, { diff: true }),
  },
  {
    family: 'code-block',
    intents: [READ],
    name: 'a split says the old lines and then the new',
    setup: block(PAIRLESS, { diff: true, variant: 'split' }),
  },
  {
    family: 'code-block',
    intents: [press(0), press(0)],
    name: 'a fold opens to its unchanged lines and closes',
    setup: block(PATCH, { 'context-lines': 1, diff: true }),
  },
  {
    family: 'code-block',
    intents: [press(1)],
    name: 'the second fold of a hunk opens on its own',
    setup: block(PATCH, { 'context-lines': 1, diff: true }),
  },
  {
    family: 'code-block',
    intents: [READ],
    name: 'several blocks are files under tabs, the one `file` names shown',
    setup: FILES,
  },
  {
    family: 'code-block',
    intents: [press(2), press(0)],
    name: 'a press on a tab shows its file, named by its language without a label',
    setup: FILES,
  },
  {
    family: 'code-block',
    intents: [press(1)],
    name: 'a press on the tab already chosen says nothing',
    setup: FILES,
  },
  {
    family: 'code-block',
    intents: [
      { kind: 'focus', row: 1 },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'the keys move along the tabs and show each file',
    setup: FILES,
  },
  {
    family: 'code-block',
    intents: [refuse('before-change'), press(0)],
    name: 'a refused tab keeps the file shown',
    setup: FILES,
  },
]
