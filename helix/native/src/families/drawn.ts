/*
 * What the families' specs read of a drawing: its nodes, outermost first,
 * and the style each is drawn with.
 */
import { StyleSheet } from 'react-native'

/** One node of what React Native was asked to draw. */
export interface Drawn {
  readonly children: readonly (Drawn | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
  readonly type: string
}

/** What a node is drawn with, flattened. */
export const styleOf = (node: { readonly props: { readonly style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Readonly<Record<string, unknown>>

/** Every node of a drawing, outermost first. */
export const nodes = (drawn: unknown): Drawn[] =>
  drawn === null || drawn === undefined
    ? []
    : (Array.isArray(drawn) ? (drawn as Drawn[]) : [drawn as Drawn]).flatMap((one) => [
        one,
        ...nodes((one.children ?? []).filter((child): child is Drawn => typeof child !== 'string')),
      ])

/** The words a node holds, its own and its children's, in order. */
export const wordsOf = (node: Drawn): string =>
  (node.children ?? [])
    .map((child) => (typeof child === 'string' ? child : wordsOf(child)))
    .join('')
