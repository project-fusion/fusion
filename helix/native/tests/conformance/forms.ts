import type { ComponentType } from 'react'
import { type Props, STILL, type UseBehavior } from '../../src/render/behavior'
import type { Family } from '../../src/style/form'

/** A component the generated modules made, with the form it draws. */
export interface Drawn {
  readonly Component: ComponentType<Props>
  readonly family: Family
}

/**
 * Every component `element` made, by the web tag of its form. The
 * conformance spec has `element` hand each one here as the generated modules
 * make them, so the harness draws a setup's tags and reads each element's
 * events and detail fields from the same forms the components draw from.
 */
export const DRAWN = new Map<string, Drawn>()

/**
 * The states each element's machines last gave its host, by the web tag of
 * its form: how a picture stands, and whether an element waits out a delay.
 * One element of a tag is drawn at a time.
 */
export const HOST_STATES = new Map<string, Readonly<Record<string, unknown>>>()

/** `useBehavior`, recording the states it gives the host of `family`'s element. */
export const watched =
  (useBehavior: UseBehavior | undefined): UseBehavior =>
  (family, props) => {
    const behavior = (useBehavior ?? (() => STILL))(family, props)
    /* The custom states the element is in, as `:state()` reads them, and the
       states its host's binding gives. */
    const states = {
      ...Object.fromEntries(behavior.marks.map((mark) => [mark, true])),
      ...behavior.parts.host?.states,
      /* And the lists it gives, as a file input's chosen files. */
      ...behavior.parts.host?.lists,
    }
    HOST_STATES.set(family.tag, states)
    /* And by its value, where the setup names it by one, as a tour's stops. */
    if (typeof props.value === 'string') {
      HOST_STATES.set(`${family.tag}#${props.value}`, states)
    }
    return behavior
  }

/** Keeps the component `element` made for `family`, and hands it back. */
export const remember = (family: Family, Component: ComponentType<Props>): ComponentType<Props> => {
  DRAWN.set(family.tag, { Component, family })
  return Component
}

/**
 * Whether a tag is a Helix element, which a generated component draws, and
 * not a plain element a setup passes into one, as a section's `<span>` of
 * words passed into its `summary`.
 */
export const isElement = (tag: string): boolean => tag.startsWith('helix-')

/** The form of the element with this tag. */
export const formOf = (tag: string): Family => {
  const found = DRAWN.get(tag)?.family
  if (found === undefined) {
    throw new Error(`conformance: no generated component draws <${tag}>`)
  }
  return found
}
