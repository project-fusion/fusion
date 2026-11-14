import type { ReactNode } from 'react'
import type { Node } from '../style/form'
import type { GeneratedBox, Style } from '../style/resolved'
import { wrapped } from './behavior'
import { boxSemantics, silent } from './semantics'
import {
  bound,
  type Draw,
  fromText,
  inherit,
  laid,
  resolve,
  type Scope,
  split,
  transformed,
} from './styles'
import { ScaledText } from './text'

/**
 * The words a `::before` or an `::after` draws in a run, nested in the run's
 * words, as a quotation's marks are: a view would stand apart from the line.
 */
const generatedWords = (box: GeneratedBox | undefined, text: Style, key: string): ReactNode => {
  if (box?.words === undefined) {
    return null
  }
  const [frame, words] = split(box.style)
  return (
    <ScaledText
      key={key}
      {...(box.unread ? silent : {})}
      style={{ ...frame, ...inherit(text, words) }}
    >
      {box.words}
    </ScaledText>
  )
}

/**
 * A box that is a run of words: a `Text`, so the words and the runs passed
 * into it flow as one paragraph, and a run nested in other words wraps with
 * them, as a `<code>` or a `<q>` does on the web.
 *
 * **A nested `Text` takes a background, and no padding and no corners**, on
 * iOS and Android both: a run's wash is the width of its words. **With
 * `lines`, the words stop after that many lines**, with an ellipsis, where
 * the count is a whole number above zero.
 */
export const drawRun = (scope: Scope, node: Node, text: Style, draw: Draw): ReactNode => {
  const resolved = resolve(scope, node, fromText(text))
  const [box, words] = split(resolved.style)
  const inherits = inherit(text, words)
  const lines = Number(bound(scope, node.attributes?.lines, node.name))
  const limited =
    Number.isInteger(lines) && lines > 0 ? { ellipsizeMode: 'tail', numberOfLines: lines } : {}
  const { style: given, ...view } = laid(
    scope.behavior,
    node.name,
    boxSemantics(scope, node),
    scope.item,
  )
  return wrapped(
    scope.behavior,
    node.name,
    <ScaledText
      key={node.name}
      {...view}
      style={[{ ...transformed(box), ...inherits, ...limited }, given as Style]}
    >
      {generatedWords(resolved.generated?.before, inherits, `${node.name}-before`)}
      {resolved.before}
      {(node.children ?? []).map((child) => draw(scope, child, inherits, resolved.regions, node))}
      {generatedWords(resolved.generated?.after, inherits, `${node.name}-after`)}
    </ScaledText>,
    node.name,
  )
}
