import { type Highlighter, type Tag, tagHighlighter, tags } from '@lezer/highlight'

/** One rule: the tags it colors, the class it gives them, and what the class draws. */
interface SyntaxRule {
  class: string
  style: Record<string, string>
  tag: Tag | readonly Tag[]
}

/**
 * How source is colored, in Helix tokens: the editor's colors, and every
 * Code Block's once `@fusion.dev/helix-sandbox/code-block` is imported.
 *
 * CodeMirror ships `defaultHighlightStyle`, which is a fixed set of hex values
 * and therefore one palette in both color modes: readable on white, wrong on
 * anything else. These are `--helix-color-syntax-*`, which resolve through
 * `light-dark()` like every other color in the system, so the editor follows
 * the page and declares no mode of its own.
 *
 * The palette is GitHub's, which most engineers already read without having to
 * learn it.
 *
 * A tag not named here inherits the foreground. That is deliberate:
 * punctuation, operators and separators are structure a reader skims past, and
 * coloring them competes with the names that carry the meaning.
 *
 * **Plain data and `@lezer/highlight`, and nothing from CodeMirror's editor.**
 * `HighlightStyle` is `@codemirror/language`, which imports `@codemirror/view`,
 * and that reads the DOM as it loads: a server under Lit's DOM shim failed at
 * import, and a page with one Code Block downloaded the editor. A class per rule
 * and the rules as text color the same tokens the same way, because
 * `HighlightStyle` is `tagHighlighter` over the same list.
 */
const RULES: readonly SyntaxRule[] = [
  {
    class: 'helix-syntax-comment',
    style: { color: 'var(--helix-color-syntax-comment)', fontStyle: 'italic' },
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
  },
  {
    class: 'helix-syntax-keyword',
    style: { color: 'var(--helix-color-syntax-keyword)' },
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.operatorKeyword,
      tags.self,
      tags.null,
    ],
  },
  {
    class: 'helix-syntax-string',
    style: { color: 'var(--helix-color-syntax-string)' },
    tag: [tags.string, tags.special(tags.string), tags.regexp, tags.escape],
  },
  {
    class: 'helix-syntax-tag',
    // Element names, and the names of things being introduced. An HTML tag and
    // a class declaration are the same act: naming a thing that then exists.
    style: { color: 'var(--helix-color-syntax-tag)' },
    tag: [tags.tagName, tags.standard(tags.tagName), tags.heading, tags.quote],
  },
  {
    class: 'helix-syntax-name',
    // What a name refers to. Attributes, variables, properties and numbers all
    // read as "a value is being named or given", which is not structure.
    style: { color: 'var(--helix-color-syntax-name)' },
    tag: [
      tags.attributeName,
      tags.variableName,
      tags.propertyName,
      tags.number,
      tags.integer,
      tags.float,
      tags.labelName,
      tags.namespace,
    ],
  },
  {
    class: 'helix-syntax-callable',
    style: { color: 'var(--helix-color-syntax-callable)' },
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.definition(tags.function(tags.variableName)),
      tags.className,
      tags.typeName,
      tags.macroName,
    ],
  },
  {
    class: 'helix-syntax-constant',
    style: { color: 'var(--helix-color-syntax-constant)' },
    tag: [
      tags.atom,
      tags.bool,
      tags.constant(tags.name),
      tags.standard(tags.name),
      tags.unit,
      tags.attributeValue,
      tags.color,
    ],
  },
  {
    class: 'helix-syntax-strong',
    style: { color: 'var(--helix-color-foreground)', fontWeight: 'bold' },
    tag: tags.strong,
  },
  {
    class: 'helix-syntax-emphasis',
    style: { color: 'var(--helix-color-foreground)', fontStyle: 'italic' },
    tag: tags.emphasis,
  },
  {
    class: 'helix-syntax-link',
    style: { color: 'var(--helix-color-syntax-name)', textDecoration: 'underline' },
    tag: tags.link,
  },
  {
    class: 'helix-syntax-strikethrough',
    style: { textDecoration: 'line-through' },
    tag: tags.strikethrough,
  },
  {
    class: 'helix-syntax-invalid',
    style: { color: 'var(--helix-color-syntax-invalid)' },
    tag: tags.invalid,
  },
]

/**
 * Gives each token the class of the rule that colors it, a `helix-syntax-`
 * class such as `helix-syntax-keyword`. Pass it to `highlight`, and put
 * `syntaxRules` where the result is drawn.
 */
export const syntaxHighlighter: Highlighter = tagHighlighter(
  RULES.map((rule) => ({ class: rule.class, tag: rule.tag })),
)

/** The CSS for `syntaxHighlighter`'s classes, which colors them from the `--helix-color-syntax-*` tokens. */
export const syntaxRules: string = RULES.map(
  (rule) =>
    `.${rule.class} { ${Object.entries(rule.style)
      .map(
        ([name, value]) => `${name.replace(/[A-Z]/g, (up) => `-${up.toLowerCase()}`)}: ${value};`,
      )
      .join(' ')} }`,
).join('\n')
