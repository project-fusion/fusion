/*
 * What a web element draws on the server, read from Lit's markup as places,
 * which the structural judge in `structure.ssr.spec.ts` holds to the tree.
 */

/**
 * Where a part or a region is drawn: the nearest part around it, its own part,
 * its role, and whether assistive technology skips it.
 */
export interface Place {
  readonly hidden: boolean
  readonly optional: boolean
  readonly parent: string
  readonly part: string
  readonly role: string
}

/** A part as `part:<name>`, a region as `region:<name>`, with the default region as `region:default`. */
export type Places = Map<string, Place>

/** One element of the server's markup: its tag, its attributes, and what it holds. */
interface Drawn {
  readonly attributes: ReadonlyMap<string, string>
  readonly children: Drawn[]
  readonly tag: string
}

const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*(\/?)>/g
const ATTRIBUTE = /([\w-]+)(?:="([^"]*)")?/g

/**
 * A `<template>` in the markup: the shadow root of an element drawn inside
 * opens a `#shadow` node of it, and its end closes it. Any other is skipped.
 */
const template = (stack: Drawn[], closing: boolean): void => {
  const top = stack.at(-1)
  if (closing && top?.tag === '#shadow') {
    stack.pop()
  } else if (!closing && top?.tag.includes('-') === true) {
    const shadow: Drawn = { attributes: new Map(), children: [], tag: '#shadow' }
    top.children.push(shadow)
    stack.push(shadow)
  }
}

/**
 * The element's own shadow root as a tree. The markup is Lit's server output,
 * whose attribute values never hold `>`, so a tag is one match. **The shadow
 * root of an element drawn inside is a `#shadow` node of it**, apart from the
 * children passed into it.
 */
export const parse = (markup: string): Drawn[] => {
  const root: Drawn = { attributes: new Map(), children: [], tag: '#root' }
  const stack = [root]
  for (const [, closing, tag, attributes, selfClosing] of markup.matchAll(TAG)) {
    if (tag === 'template') {
      template(stack, closing === '/')
      continue
    }
    if (closing === '/') {
      stack.pop()
      continue
    }
    const drawn: Drawn = {
      attributes: new Map(
        [...(attributes ?? '').matchAll(ATTRIBUTE)].map(([, name, value]) => [
          name ?? '',
          value ?? '',
        ]),
      ),
      children: [],
      tag: tag ?? '',
    }
    stack.at(-1)?.children.push(drawn)
    /* An element written closed, as an icon's `<path/>`, holds nothing. */
    if (selfClosing !== '/') {
      stack.push(drawn)
    }
  }
  return root.children
}

/** The place one element of the server's markup draws at. */
const drawnPlace = (node: Drawn, parent: string, hiddenAround: boolean): Place => {
  const hidden = hiddenAround || node.attributes.get('aria-hidden') === 'true'
  const implicit = node.tag === 'button' && !hidden ? 'button' : ''
  return {
    hidden,
    optional: false,
    parent,
    part: node.attributes.get('part')?.split(' ')[0] ?? '',
    role: node.attributes.get('role') ?? implicit,
  }
}

/** The key a drawn element is known by, or `undefined` for one that is no part or region. */
const drawnKey = (node: Drawn, part: string): string | undefined => {
  if (node.tag === 'slot') {
    return `region:${node.attributes.get('name') ?? 'default'}`
  }
  return part === '' ? undefined : `part:${part}`
}

/**
 * What the server draws, as places. `wraps` names the parts that are another
 * element drawn around what this one passes into it, whose light children
 * are this element's.
 */
export const drawnPlaces = (
  nodes: readonly Drawn[],
  parent: string,
  hiddenAround: boolean,
  into: Places,
  wraps: ReadonlySet<string> = new Set(),
): Places => {
  for (const node of nodes) {
    const place = drawnPlace(node, parent, hiddenAround)
    const key = drawnKey(node, place.part)
    if (key !== undefined) {
      into.set(key, place)
    }
    /* Another element drawn inside, as a checkbox group's select-all, holds
       its own tree, which is judged as its own. What is passed into one drawn
       around it is this element's, as a copy button's press in its tooltip. */
    if (!node.tag.includes('-') || wraps.has(place.part)) {
      const passed = node.children.filter((child) => child.tag !== '#shadow')
      drawnPlaces(passed, place.part || parent, place.hidden, into, wraps)
    }
  }
  return into
}
