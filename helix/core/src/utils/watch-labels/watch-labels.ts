/** One observer per tree, and the callbacks it runs when a label in it changes. */
const trees = new Map<Node, { observer: MutationObserver; heard: Set<() => void> }>()

/** Whether a node is a `<label>` or holds one. */
const holdsLabel = (node: Node): boolean =>
  node instanceof Element && (node.localName === 'label' || node.querySelector('label') !== null)

/** Whether a node is inside a `<label>`, for words typed into one. */
const inLabel = (node: Node): boolean =>
  (node instanceof Element ? node : node.parentElement)?.closest('label') != null

/** Whether a change touched a label: one added or taken out, its `for`, or its words. */
const touchesLabel = (record: MutationRecord): boolean => {
  if (record.type === 'attributes') {
    return (record.target as Element).localName === 'label'
  }
  if (record.type === 'characterData') {
    return inLabel(record.target)
  }
  return (
    inLabel(record.target) ||
    [...record.addedNodes, ...record.removedNodes].some((node) => holdsLabel(node))
  )
}

/**
 * Calls `heard` whenever a `<label>` changes in the tree `host` is in: one is
 * added or taken out, its `for` changes, or its words do.
 *
 * **For a label that arrives after the control renders**, which a framework
 * does freely and which no attribute on the host reports: the platform adds the
 * label to the host's `labels` and says nothing. `AriaForwardController` reads
 * `labels` again when this calls, so the control inside is named as the label
 * appears, where it used to wait for focus.
 *
 * **One observer per tree, whatever the number of controls in it**, so a form
 * of forty fields watches the page once, and a change that touches no label
 * costs one check per record. The returned function stops the watch, and the
 * observer goes when its last control does.
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
    if (watched.heard.size === 0) {
      watched.observer.disconnect()
      trees.delete(root)
    }
  }
}
