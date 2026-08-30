import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * How source is colored, in Helix tokens.
 *
 * CodeMirror ships `defaultHighlightStyle`, which is a fixed set of hex values
 * and therefore one palette in both color modes: readable on white, wrong on
 * anything else. These are `--helix-color-syntax-*`, which resolve through
 * `light-dark()` like every other color in the system, so the editor follows
 * the page rather than declaring its own mode.
 *
 * The palette is GitHub's, which most engineers already read without having to
 * learn it.
 *
 * A tag not named here inherits the editor's foreground. That is deliberate:
 * punctuation, operators and separators are structure a reader skims past, and
 * coloring them competes with the names that carry the meaning.
 */
export const highlightStyle: HighlightStyle = HighlightStyle.define([
  {
    color: 'var(--helix-color-syntax-comment)',
    fontStyle: 'italic',
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
  },
  {
    color: 'var(--helix-color-syntax-keyword)',
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
    color: 'var(--helix-color-syntax-string)',
    tag: [tags.string, tags.special(tags.string), tags.regexp, tags.escape],
  },
  {
    color: 'var(--helix-color-syntax-tag)',
    // Element names, and the names of things being introduced. An HTML tag and
    // a class declaration are the same act: naming a thing that then exists.
    tag: [tags.tagName, tags.standard(tags.tagName), tags.heading, tags.quote],
  },
  {
    color: 'var(--helix-color-syntax-name)',
    // What a name refers to. Attributes, variables, properties and numbers all
    // read as "a value is being named or given" rather than as structure.
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
    color: 'var(--helix-color-syntax-callable)',
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
    color: 'var(--helix-color-syntax-constant)',
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
  { color: 'var(--helix-color-foreground)', fontWeight: 'bold', tag: tags.strong },
  { color: 'var(--helix-color-foreground)', fontStyle: 'italic', tag: tags.emphasis },
  { color: 'var(--helix-color-syntax-name)', tag: tags.link, textDecoration: 'underline' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { color: 'var(--helix-color-syntax-invalid)', tag: tags.invalid },
])
