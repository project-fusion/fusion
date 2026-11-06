/**
 * A family whose host says the color scheme it draws in, as a lightbox says
 * `color-scheme: dark` and is a dark room on a light page.
 *
 * **The whole element draws in that scheme**, its own parts as well as what
 * is passed in, as `color-scheme` on a host reaches every `light-dark()` in
 * its shadow tree and the elements slotted into it on the web. A part's own
 * `color-scheme` still redraws only what the part holds, as a QR code's logo
 * plate does, since the part's own box reads the scheme around it.
 *
 * **Only a scheme the host always says**, a rule on the host with no
 * condition, is read before the element draws: a scheme that a state or a
 * prop chooses would need the host's rules resolved first, in the scheme
 * they choose.
 */
import { type ComponentType, createElement } from 'react'
import type { Family } from '../style/form'
import { HelixTheme, type Mode } from '../theme/helix-theme'
import type { Props } from './behavior'

/** The scheme every rule on `family`'s host says, where one says it with no condition. */
export const hostScheme = (family: Family): Mode | undefined => {
  let said: Mode | undefined
  for (const item of family.rules ?? []) {
    if (
      item.kind !== 'rule' ||
      item.target !== 'host' ||
      item.slotted !== undefined ||
      item.region !== undefined ||
      item.when.length > 0 ||
      item.webOnly
    ) {
      continue
    }
    for (const [property, value] of item.set) {
      const text = (value as { readonly text?: unknown }).text
      if (property === 'color-scheme' && (text === 'dark' || text === 'light')) {
        said = text
      }
    }
  }
  return said
}

/**
 * `drawing`, drawn inside a theme in the scheme `family`'s host says, or
 * `drawing` itself where it says none.
 */
export const inHostScheme = (
  family: Family,
  drawing: ComponentType<Props>,
): ComponentType<Props> => {
  const mode = hostScheme(family)
  if (mode === undefined) {
    return drawing
  }
  return (given: Props) => <HelixTheme mode={mode}>{createElement(drawing, given)}</HelixTheme>
}
