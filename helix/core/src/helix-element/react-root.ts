/*
 * The node React renders into, which two halves of the React bridge ask about.
 *
 * In every build, `untilReactHydrated` waits only for an element under it, and in a
 * development build the audit reports a missing props bag only for one. Its
 * own module so both can read it: `react-bridge.ts` imports the audit, and the
 * audit importing the bridge back would make the two a cycle.
 */

/**
 * The prefix of the mark React leaves on the node it makes a root in.
 *
 * `createRoot` and `hydrateRoot` write it and a random suffix on their
 * container, which is the document itself on a Next.js App Router page and a
 * `<div>` everywhere else. Read from the source of 17.0.2 and 18.2.0 and from
 * react-dom 19.3.1, as the bridge's own two marks were.
 */
const REACT_CONTAINER = '__reactContainer$'

/** Whether a node is in the tree React renders into, its root's container or below it. */
export const insideReact = (host: Node): boolean => {
  for (let node: Node | null = host.parentNode; node !== null; node = node.parentNode) {
    if (Object.keys(node).some((key) => key.startsWith(REACT_CONTAINER))) {
      return true
    }
  }
  return false
}
