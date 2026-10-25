/**
 * A text node: words a prop or a computed value holds, drawn in the style
 * the text inherits, as wide as the widest words it may say where its
 * `widest` names them.
 */
import type { ReactNode } from 'react'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'
import { holds } from './announced'
import { wrapped } from './behavior'
import { silent } from './semantics'
import { bound, laid, type Scope } from './styles'
import { ScaledText } from './text'
import { Widest } from './widest'

/**
 * Words a prop holds, drawn as text in the style the text inherits. **With
 * `lines`, they stop after that many lines**, ending in an ellipsis, and a
 * decorative text is drawn and hidden from screen readers.
 */
export const drawText = (scope: Scope, node: Node, text: Style): ReactNode => {
  /* A number is its words, as a copy's place is. */
  const says = bound(scope, node.attributes?.says, node.name)
  const words = typeof says === 'number' ? String(says) : says
  if (typeof words !== 'string' || words === '') {
    return null
  }
  const lines = Number(bound(scope, node.attributes?.lines, node.name))
  const clamped =
    Number.isInteger(lines) && lines > 0
      ? { ...text, ellipsizeMode: 'tail', numberOfLines: lines }
      : text
  /* **A label is said in place of the words**, as a key's chord drawn in
     glyphs is said in words. */
  const label = bound(scope, node.attributes?.label, node.name)
  const said = typeof label === 'string' && label !== '' ? { accessibilityLabel: label } : {}
  const own = holds(scope, node, 'decorative')
    ? { ...silent, style: clamped }
    : { ...said, style: clamped }
  const drawnProps = laid(scope.behavior, node.name, own, scope.item)
  /* **Words that say one of several hold the width of the widest**, as a
     copy button's label stays as wide from Copy to Copied. */
  const alike = widestOf(scope, node)
  return wrapped(
    scope.behavior,
    node.name,
    alike.length > 1 ? (
      <Widest key={node.name} props={drawnProps} words={alike}>
        {words}
      </Widest>
    ) : (
      <ScaledText key={node.name} {...drawnProps}>
        {words}
      </ScaledText>
    ),
    node.name,
  )
}

/** The words a text's `widest` names, as they stand, each said once. */
const widestOf = (scope: Scope, node: Node): string[] => {
  const named = node.attributes?.widest
  if (typeof named !== 'object' || named === null) {
    return []
  }
  const words = Object.values(named).map((value) => bound(scope, value, node.name))
  return [...new Set(words.filter((one): one is string => typeof one === 'string' && one !== ''))]
}
