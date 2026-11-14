/**
 * What is passed into a region. Each region is the prop of its name, and the
 * default region is `children`. **A region named `children` cannot be a prop of
 * that name**, as a tree item's nested items are not, so what fills it stands
 * among `children` with `slot="children"`, and the default region holds the rest.
 */
import { Children, isValidElement, type ReactNode } from 'react'
import { camel } from '../machines/props'

/** Whether a child fills the region named `children`. */
const nests = (child: unknown): boolean =>
  isValidElement(child) && (child.props as { slot?: unknown }).slot === 'children'

/** What is passed into the region named `name`, from an element's props. */
export const regionContent = (props: Readonly<Record<string, unknown>>, name: string): unknown => {
  if (name !== 'default' && name !== 'children') {
    return props[camel(name)]
  }
  const all = Children.toArray(props.children as ReactNode)
  if (!all.some(nests)) {
    return name === 'default' ? props.children : undefined
  }
  const kept = all.filter((child) => nests(child) === (name === 'children'))
  return kept.length === 0 ? undefined : kept.length === 1 ? kept[0] : kept
}
