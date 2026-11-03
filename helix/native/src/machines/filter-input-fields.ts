/**
 * The filters a field for filters can read, from what the page passed into it:
 * each `FilterField` with its `FilterOperator`s and its `Option`s, inside a
 * `FilterMenu` or directly inside the field, as the web element reads its light
 * DOM.
 */
import {
  contentWords,
  DEFAULT_FILTER_OPERATORS,
  type FilterGrammarField,
  type FilterGrammarOperator,
} from '@fusion.dev/helix-core/filter-text'
import { isValidElement, type ReactElement } from 'react'
import { flat } from '../render/counters'

/** An element's props, as a page passed them. */
type Passed = Readonly<Record<string, unknown>>

/** Whether `node` is an element a component made for `tag` draws, by the tag it carries. */
export const isMade = (node: unknown, tag: string): node is ReactElement<Passed> =>
  isValidElement(node) && (node.type as { readonly tag?: unknown }).tag === tag

/** The elements directly inside `content`, text and gaps left out. */
export const elementsIn = (content: unknown): ReactElement<Passed>[] =>
  flat(content).filter((one): one is ReactElement<Passed> => isValidElement(one))

/** A string prop, or `''`. */
const text = (props: Passed, name: string): string =>
  typeof props[name] === 'string' ? (props[name] as string) : ''

/** One declared comparison, as the grammar reads it. */
const operatorOf = (props: Passed, unwritten: boolean): FilterGrammarOperator => {
  const arity = props.arity
  return {
    arity: arity === 'none' || arity === 'one' ? arity : 'many',
    default: unwritten,
    label: text(props, 'label'),
    name: text(props, 'name'),
  }
}

/** A field's vocabulary, as the web's `FilterField.vocabulary` reads it. */
export const vocabularyOf = (field: ReactElement<Passed>): FilterGrammarField => {
  const inside = elementsIn(field.props.children)
  const declared = inside.filter((one) => isMade(one, 'helix-filter-operator'))
  const marked = declared.find((one) => one.props.default === true)
  const values = inside.filter((one) => isMade(one, 'helix-option'))
  return {
    label: text(field.props, 'label'),
    name: text(field.props, 'name'),
    operators:
      declared.length > 0
        ? declared.map((one) => operatorOf(one.props, one === marked))
        : DEFAULT_FILTER_OPERATORS,
    values: values.map((one) => {
      const value = text(one.props, 'value')
      return { label: contentWords(one.props.children) || text(one.props, 'label') || value, value }
    }),
  }
}

/** The fields passed in, in the order written. */
export const fieldsIn = (content: unknown): FilterGrammarField[] =>
  elementsIn(content)
    .filter((one) => isMade(one, 'helix-filter-field'))
    .map(vocabularyOf)

/** The fields a menu holds, in the order written. */
export const menuFields = (menu: ReactElement<Passed>): FilterGrammarField[] =>
  fieldsIn(menu.props.children)

/**
 * Every field the page declared, the ones in a menu passed into `start` or `end`
 * first, and then the ones directly inside the field, which nothing draws.
 */
export const declaredFields = (
  regions: readonly unknown[],
  children: unknown,
): FilterGrammarField[] => [
  ...regions.flatMap((region) =>
    elementsIn(region)
      .filter((one) => isMade(one, 'helix-filter-menu'))
      .flatMap(menuFields),
  ),
  ...fieldsIn(children),
]
