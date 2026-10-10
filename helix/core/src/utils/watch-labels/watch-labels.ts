/** One observer per tree, and the callbacks it runs when a label in it changes. */
const trees = new Map<Node, { heard: Set<() => void>; observer: MutationObserver }>()

/** Whether a change touched a `<label>`: one added or taken out, its `for`, or its words. */
const touchesLabel = ({ addedNodes, removedNodes, target }: MutationRecord): boolean =>
  [target, ...addedNodes, ...removedNodes].some(
    (node) =>
      (node instanceof Element ? node : node.parentElement)?.closest('label') != null ||
      (node instanceof Element && node.querySelector('label') !== null),
  )

/**
 * Calls `heard` whenever a `<label>` changes in the tree `host` is in: one is
 * added or taken out, its `for` changes, or its words do.
 *
 * **For a label that arrives after the control renders**, which a framework
 * does freely and which no attribute on the host reports: the platform adds the
 * label to the host's `labels` and says nothing. `HelixFormElement` updates
 * when this calls, so `AriaForwardController` names the control inside as the
 * label appears, where it used to wait for focus.
 *
 * **One observer per tree, whatever the number of controls in it**, so a form
 * of forty fields watches the page once, and a change that touches no label
 * costs one check per record. The returned function stops the watch, and the
 * observer goes with the last control in its tree. A tree can be another
 * element's shadow root, which changes no more once that element is removed,
 * so an observer left for a later change to stop would keep the root forever.
 */
export const watchLabels = (host: Node, heard: () => void): (() => void) => {
  const root = host.getRootNode()
  let tree = trees.get(root)
  if (!tree) {
    const callbacks = new Set<() => void>()
    const observer = new MutationObserver((records) => {
      if (records.some(touchesLabel)) {
        for (const callback of [...callbacks]) {
          callback()
        }
      }
    })
    observer.observe(root, {
      attributeFilter: ['for'],
      characterData: true,
      childList: true,
      subtree: true,
    })
    tree = { heard: callbacks, observer }
    trees.set(root, tree)
  }
  tree.heard.add(heard)
  const watched = tree
  return () => {
    watched.heard.delete(heard)
    if (watched.heard.size === 0 && trees.get(root) === watched) {
      watched.observer.disconnect()
      trees.delete(root)
    }
  }
}
