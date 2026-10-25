import type { ComponentType } from 'react'
import type { Family, Node } from '../style/form'
import type { Props } from './behavior'

/** A component `element` made, with the form it draws. */
export interface Made {
  readonly Component: ComponentType<Props>
  readonly family: Family
}

/* Every component `element` has made, by its web tag. */
const made = new Map<string, Made>()

/** Keeps the component `element` made for `family`. */
export const keepMade = (family: Family, Component: ComponentType<Props>): void => {
  made.set(family.tag, { Component, family })
}

/**
 * The component made for the element with this tag, which a box that
 * `draws` it draws, as a checkbox group draws a checkbox. The generated
 * module of the family around imports the drawn element's module, which
 * makes it.
 */
export const madeFor = (tag: string): Made | undefined => made.get(tag)

/**
 * Whether the region of `region`'s name names the element with this tag, as
 * a meter's `label` does. **Words passed into such a region are drawn**, as
 * the web draws a slotted element, where words given to the prop of the same
 * name are the element's name alone. A JSX runtime reads this to keep the
 * words of `<span slot="label">` an element.
 */
export const regionNames = (tag: string, region: string): boolean => {
  const named = (nodes: readonly Node[] | undefined): boolean =>
    (nodes ?? []).some(
      (node) =>
        (node.kind === 'region' && node.name === region && node.attributes?.names === true) ||
        named(node.children),
    )
  return named(made.get(tag)?.family.tree)
}

/**
 * The prefix of the hooks of the element with this tag, `qr-code` for
 * `helix-qr-code`, whose custom properties start `--qr-code-`. A JSX runtime
 * reads it to set the hooks a `style` names, as an inline style sets them on
 * the web.
 */
export const hookPrefix = (tag: string): string | undefined => made.get(tag)?.family.name
