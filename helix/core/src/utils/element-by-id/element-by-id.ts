/** What `elementById` may do beyond searching the tree it was asked about. */
export interface ElementByIdOptions {
  /**
   * Also search the document, where the tree the node sits in holds no such id.
   *
   * **For a fragment on a real anchor, and for nothing else.** The platform
   * resolves `<a href="#main">` against the document whatever tree the anchor
   * sits in, so a component that calls `preventDefault()` and performs that
   * navigation itself has to land on the element the browser would have.
   * `SkipLink` is the one that does, and it is the whole of its difference from
   * the callers below: inside an app shell's shadow root it would otherwise
   * decline the press, the browser would scroll to the document's `#main` and
   * leave focus behind, and moving focus is the entire reason the component
   * exists.
   *
   * **Off by default, because an id matched across trees is an id matched by
   * coincidence.** Every other caller takes an id as a property, wires the
   * element it names, and has no platform behavior to agree with, so `null` is
   * the honest answer and reaching into the document would point a tooltip, a
   * chart or a command button at whatever else on the page shares the name.
   * `Outline` reads `href`s too and still does not pass this: it intercepts no
   * press, it observes sections in its own tree and marks the link pointing at
   * one.
   */
  orDocument?: boolean
}

/**
 * The element an id names, looked up in the tree the node sits in.
 *
 * **`getRootNode()` rather than `document`, which is what makes a component
 * composable.** An id is unique to a tree and not to a page, so a component
 * inside another component's shadow root names an element in that root. Asking
 * the document finds nothing there, and on a page where the name is taken it
 * finds an element in somebody else's tree.
 *
 * **What `getRootNode()` returns need not be able to answer, and that guard is
 * load-bearing in both environments this library runs in.** Measured 18 Sep
 * 2026, and held by the two specs beside this file. Under Lit SSR's DOM shim
 * `getRootNode()` returns a `Document` carrying no `getElementById` at all, so
 * an unguarded call is a `TypeError` rather than a miss and takes the whole
 * server render down the first time a component resolves `for`. In Chromium and
 * in happy-dom alike an element that is not connected is its own root, and an
 * `HTMLElement` has no lookup either, which is the reading every caller here is
 * one detached element away from.
 *
 * A `DocumentFragment` is not a case, which is worth saying because it looks
 * like the obvious one: `getElementById` comes from `NonElementParentNode`, so a
 * bare fragment and a `<template>`'s content both carry it.
 *
 * **Decoding stays at the call site.** `SkipLink` and `Outline` take an `href`
 * and owe it a `decodeURIComponent`; the callers that take an id property do
 * not, and a utility that decoded would corrupt a literal `%` in one of theirs.
 */
export const elementById = (
  from: Node,
  id: string,
  options?: ElementByIdOptions,
): HTMLElement | null => {
  const root = from.getRootNode() as Partial<Document>
  const found = root.getElementById?.(id) ?? null
  if (found || options?.orDocument !== true) {
    return found
  }
  // The server's `document` is the same shim object with the same nothing on
  // it, and a process with no DOM at all has no `document` to name.
  const page = globalThis.document as Partial<Document> | undefined
  return page?.getElementById?.(id) ?? null
}

/**
 * Whether ids resolve at all in the tree this node sits in.
 *
 * The same platform fact as `elementById`'s guard, asked as a question, for a
 * component that has to tell "no such element" from "no tree to look in".
 * `Heatmap` is the case and its note gives the cost: an empty state served
 * because a server could not resolve `for` is a crawler reading "No readings"
 * over ninety days of them.
 */
export const searchableById = (from: Node): boolean =>
  typeof (from.getRootNode() as Partial<Document>).getElementById === 'function'
