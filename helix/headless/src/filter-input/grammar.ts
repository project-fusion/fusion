/**
 * Reading a typed filter against what a consumer declared.
 *
 * **Helix owns the punctuation, the consumer owns the words.** `field:a,b` is a
 * filter in every product that has ever had one, and a library that made every
 * consumer write that parse again was charging them for a decision nobody
 * disagrees about. So the shape is here: a key, a colon, a comma separated list,
 * and a leading `-` for the negation. What a key or a value *means* is still
 * never asked, which is the line `FilterField` draws and this does not cross:
 * nothing here compares anything, and what comes out is the same `helix-facet`
 * the picker announces, for the consumer to answer however they answer it.
 *
 * **It reads only what was declared.** A key is a field's `name` or its `label`;
 * a value is an `Option`'s `value` or its text. Anything else is left alone and
 * comes back as text, which is what makes a search box that is also a filter
 * possible: a reader types `refund tuesday disposition:settled` and two thirds
 * of that is still a search.
 *
 * **Where the consumer's vocabulary starts, this stops.** The negation is bound
 * to the operator named `none` and to nothing else, so a field that declares its
 * own comparisons and no `none` has no negation to type: `-created:today` is
 * text, and the picker is where that filter gets built. Guessing which of a
 * consumer's operators a `-` meant is the domain question, and this is the one
 * place it would be tempting to answer.
 *
 * Its own module rather than sitting in the element, because it is string
 * handling with no DOM in it: this is the half worth testing directly.
 */

import type { FacetDetail } from '@fusion.dev/helix-core'

/** One comparison a field supports, as the grammar needs it. */
export interface FilterGrammarOperator {
  /**
   * How many values it takes: `none` is complete on its own, `one` is a scalar,
   * `many` is a set. Undeclared reads as `many`, which `FilterOperator` records.
   */
  arity: 'many' | 'none' | 'one'
  /** Whether this is the one a chip leaves unwritten. */
  default: boolean
  /** What a reader is shown. */
  label: string
  /** What the consumer's model calls it. */
  name: string
}

/** One value a field can be compared to, as the grammar needs it. */
export interface FilterGrammarValue {
  /** What a reader is shown, and one of the two spellings it can be typed as. */
  label: string
  /** What the consumer's model calls it. */
  value: string
}

/** One field and everything declared under it, as the grammar needs it. */
export interface FilterGrammarField {
  /** What a reader is shown. */
  label: string
  /** What the consumer's model calls it. */
  name: string
  /** The comparisons it supports, the field's own or the defaults. */
  operators: readonly FilterGrammarOperator[]
  /** The values it can be compared to, or none where they cannot be listed. */
  values: readonly FilterGrammarValue[]
}

/** One filter read out of the text. */
export interface FilterGrammarTerm {
  /** What the picker would have announced for this, unchanged. */
  facet: FacetDetail
  /** The pieces of text it was read from, so a caller can take exactly them. */
  written: readonly string[]
}

/** What a line of text turned out to say. */
export interface FilterGrammarReading {
  /** What it said, one per field. */
  terms: readonly FilterGrammarTerm[]
  /** What it did not, in the order it was written. */
  text: string
}

/**
 * The comparisons a field has when it declares none.
 *
 * **Two, because two is what the punctuation can say.** `field:a,b` and
 * `-field:a,b` are the whole default grammar, so a third default would be one
 * the picker offered and nobody could type. A field wanting `is after` declares
 * it, and declaring anything replaces these rather than joining them: a set half
 * inherited from a library and half written by hand is one nobody can read off
 * the markup.
 */
export const DEFAULT_FILTER_OPERATORS: readonly FilterGrammarOperator[] = [
  { arity: 'many', default: true, label: 'is any of', name: 'any' },
  { arity: 'many', default: false, label: 'is none of', name: 'none' },
]

/**
 * The operator a leading `-` asks for.
 *
 * By name rather than by position, so a consumer who declares their own `none`
 * with their own words keeps the shorthand, and one who declares neither loses
 * it cleanly.
 *
 * **The name is not the arity, though both spell `none`.** A consumer is free to
 * declare an operator called `none` that takes no values at all, and binding a
 * leading minus to that would read `-status:open` as "status is empty", which is
 * not what anybody typing it meant. So the negation asks for a comparison that
 * can hold what follows the colon, and finds nothing otherwise.
 */
const NEGATION = 'none'

/** Compares two spellings the way a reader typing one of them expects. */
const same = (written: string, declared: string): boolean =>
  declared !== '' && written.toLowerCase() === declared.trim().toLowerCase()

/** Takes the quotes off a value that used them to hold a space. */
const unquote = (piece: string): string =>
  piece.length > 1 && piece.startsWith('"') && piece.endsWith('"') ? piece.slice(1, -1) : piece

/**
 * Splits on a separator, leaving quoted runs alone.
 *
 * A reader filtering by `assignee:"ada lovelace"` is writing one value with a
 * space in it, and a split that did not know about the quotes would hand back
 * two halves of a name. Whitespace is the separator for terms and a comma for
 * the values inside one.
 */
function split(text: string, separator: ',' | ' '): string[] {
  const parts: string[] = []
  let current = ''
  let quoted = false
  for (const char of text) {
    if (char === '"') {
      quoted = !quoted
      current += char
      continue
    }
    if (!quoted && (separator === ' ' ? /\s/.test(char) : char === separator)) {
      if (current !== '') {
        parts.push(current)
      }
      current = ''
      continue
    }
    current += char
  }
  if (current !== '') {
    parts.push(current)
  }
  return parts
}

/** The key and the rest, at the first colon that is not inside quotes. */
function atColon(term: string): [string, string] | null {
  let quoted = false
  for (let at = 0; at < term.length; at += 1) {
    const char = term[at]
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (!quoted && char === ':') {
      return [term.slice(0, at), term.slice(at + 1)]
    }
  }
  return null
}

/** What one written piece asks for, or nothing where it asks for something else. */
function readPiece(
  written: string,
  fields: readonly FilterGrammarField[],
): { field: FilterGrammarField; operator: FilterGrammarOperator; values: string[] } | null {
  const negated = written.startsWith('-')
  const parts = atColon(negated ? written.slice(1) : written)
  if (!parts) {
    return null
  }
  const key = unquote(parts[0])
  const field = fields.find((one) => same(key, one.name) || same(key, one.label))
  if (!field) {
    return null
  }
  const operator = negated
    ? field.operators.find((one) => one.name === NEGATION)
    : (field.operators.find((one) => one.default) ?? field.operators[0])
  /* A comparison that takes no values cannot be written, because the grammar has
     nothing to write: every term here is a key and at least one value, and one
     that is complete on its own has none to put after the colon. Those are built
     in the picker.
   *
     This is also what keeps the minus honest, and no second guard is needed for
     it: a consumer is free to declare an operator called `none` that holds
     nothing, and `-owner:ada` finds it by name and is turned away here. Adding
     the arity to the lookup as well read as the stricter rule and was measured
     to change nothing. */
  if (!operator || operator.arity === 'none') {
    return null
  }

  const values: string[] = []
  for (const raw of split(parts[1], ',').map(unquote)) {
    if (raw === '') {
      continue
    }
    /* No declared values is a field whose values cannot be listed, a free text
       search or an open ended number, and what a reader types is the value. One
       that declares them and is handed something else is a typo, and a chip
       built from a typo is worse than the text staying where it can be fixed. */
    if (field.values.length === 0) {
      values.push(raw)
      continue
    }
    const found = field.values.find((one) => same(raw, one.value) || same(raw, one.label))
    if (!found) {
      return null
    }
    values.push(found.value)
  }
  if (values.length === 0) {
    return null
  }
  /* More than a scalar comparison can hold. Taking the first would drop the rest
     of what somebody typed and spelled correctly, so the term stays in the box
     where they can see it was not read. */
  if (operator.arity === 'one' && values.length > 1) {
    return null
  }
  return { field, operator, values }
}

/** A term while it is still being added to, before the detail is handed out. */
interface Held {
  field: FilterGrammarField
  operator: FilterGrammarOperator
  values: string[]
  written: string[]
}

/**
 * Reads a line of text as filters and whatever was not one.
 *
 * **One comparison per field, and a second is left as text.** `helix-facet`
 * carries a field's whole set, so `disposition:a -disposition:b` has no event
 * shape to arrive in and the picker cannot build it either. Announcing the
 * second over the first would drop a filter the reader wrote and spelled
 * correctly; leaving it in the box shows them it was not taken.
 */
export function readFilterText(
  text: string,
  fields: readonly FilterGrammarField[],
): FilterGrammarReading {
  const order: Held[] = []
  const held = new Map<string, Held>()
  const spare: string[] = []

  for (const written of split(text, ' ')) {
    const read = readPiece(written, fields)
    if (!read) {
      spare.push(written)
      continue
    }
    const standing = held.get(read.field.name)
    if (standing && standing.operator.name !== read.operator.name) {
      spare.push(written)
      continue
    }
    if (standing) {
      for (const value of read.values) {
        if (!standing.values.includes(value)) {
          standing.values.push(value)
        }
      }
      standing.written.push(written)
      continue
    }
    const term: Held = {
      field: read.field,
      operator: read.operator,
      values: [...new Set(read.values)],
      written: [written],
    }
    order.push(term)
    held.set(read.field.name, term)
  }

  return {
    terms: order.map((term) => ({
      facet: {
        arity: term.operator.arity,
        field: term.field.name,
        label: term.field.label,
        operator: term.operator.name,
        /* Empty where it is the field's usual comparison, so a chip drawn from
           this reads as a field and its values and nothing between them. The
           picker decides it the same way, which is what keeps two surfaces
           producing one chip. */
        operatorLabel: term.operator.default ? '' : term.operator.label,
        values: term.values,
      },
      written: term.written,
    })),
    text: spare.join(' '),
  }
}
