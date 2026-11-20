/*
 * A prop as an element was given it, by the name its form spells, which every
 * part of the renderer reads.
 */
import { UNFOLDED } from './fold'
import type { Values } from './styles'

/** `pending-label` as React spells a prop, `pendingLabel`. */
export const camel = (name: string): string =>
  name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())

/**
 * A prop as the element was given it, or its default where it was not. The
 * default region is `children`, which a node reads as `default` where it asks
 * whether the region holds something.
 */
export const given = (values: Pick<Values, 'family' | 'props'>, name: string): unknown => {
  const set =
    name === 'default'
      ? ((values.props as Record<symbol, unknown>)[UNFOLDED] ?? values.props.children)
      : values.props[camel(name)]
  return set === undefined
    ? values.family.api?.props.find((prop) => prop.name === name)?.default
    : set
}
