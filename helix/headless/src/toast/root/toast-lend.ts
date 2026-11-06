import { deepContains, scrollHolders } from '@fusion.dev/helix-core'

/*
 * How a toast's stack stays pressable above a modal.
 *
 * **The browser makes everything outside an open modal dialog inert**, the
 * top layer included: a popover shown above the dialog is drawn there and
 * takes no press and no focus, in Chromium and in WebKit alike, and
 * `interactivity: auto` does not lift it. What stays live is the dialog and
 * what is inside it. So while a modal is open, the region moves into that
 * modal's `<dialog>` and shows its stack again above it, and moves back once
 * the modal closes.
 */

/** Whether `dialog` stands open as a modal, asked where `:modal` may not parse. */
const isModal = (dialog: Element): boolean => {
  try {
    return dialog.matches(':modal')
  } catch {
    return dialog.hasAttribute('open')
  }
}

/**
 * The `<dialog>` of the modal that opened last and stands open, which `home`
 * is not inside: a modal Dialog, Drawer or Lightbox, whose dialog is in its
 * shadow root, or a modal `<dialog>` in the page itself.
 */
export const topModal = (home: Node): HTMLDialogElement | undefined => {
  const found: HTMLDialogElement[] = []
  for (const holder of scrollHolders()) {
    const dialog = holder.shadowRoot?.querySelector('dialog')
    if (dialog && isModal(dialog) && !deepContains(holder, home)) {
      found.push(dialog)
    }
  }
  for (const dialog of document.querySelectorAll('dialog')) {
    if (isModal(dialog) && !deepContains(dialog, home)) {
      found.push(dialog)
    }
  }
  return found.at(-1)
}

/** What the parent's child-list methods were before a lend took them over. */
type ChildList = Pick<Node, 'insertBefore' | 'removeChild' | 'replaceChild'>

/**
 * Moves `node` to the end of `into`, and returns the marker that holds its
 * place and what moves it back.
 *
 * **A marker holds its place**, and the parent's own `insertBefore`,
 * `removeChild` and `replaceChild` read the marker for `node` while it is
 * away, because a framework that rendered `node` still holds it as the
 * parent's child: React inserts before it and removes it from that parent,
 * and either throws where it has moved. A node the parent removes while it is
 * away is removed from where it is, and does not come back.
 *
 * `moveBefore()` keeps focus and running animations where the browser has
 * it, and an append moves the node elsewhere.
 */
export const lend = (node: ChildNode, into: Element): Lent | undefined => {
  const parent = node.parentNode
  if (!parent) {
    return undefined
  }
  const marker = document.createComment('')
  parent.insertBefore(marker, node)
  move(into, node)
  let gone = false
  const own = parent as unknown as { -readonly [Key in keyof ChildList]?: ChildList[Key] }
  const borrowed: ChildList = {
    insertBefore: parent.insertBefore,
    removeChild: parent.removeChild,
    replaceChild: parent.replaceChild,
  }
  own.insertBefore = function <T extends Node>(this: Node, child: T, before: Node | null): T {
    return borrowed.insertBefore.call(this, child, before === node ? marker : before) as T
  }
  own.removeChild = function <T extends Node>(this: Node, child: T): T {
    if ((child as Node) !== node) {
      return borrowed.removeChild.call(this, child) as T
    }
    gone = true
    node.remove()
    marker.remove()
    return child
  }
  own.replaceChild = function <T extends Node>(this: Node, child: Node, old: T): T {
    if ((old as Node) !== node) {
      return borrowed.replaceChild.call(this, child, old) as T
    }
    gone = true
    marker.replaceWith(child)
    node.remove()
    return old
  }
  const back = (): void => {
    delete own.insertBefore
    delete own.removeChild
    delete own.replaceChild
    if (gone) {
      return
    }
    if (marker.parentNode) {
      move(marker.parentNode, node, marker)
      marker.remove()
    } else {
      /* The place it came from has left the page with its parent, and it
         goes with it. */
      node.remove()
    }
  }
  return { back, home: marker }
}

/** A node lent to another place: the marker where it came from, and what moves it back. */
export interface Lent {
  readonly back: () => void
  readonly home: Comment
}

/** Moves `node` into `parent` before `before`, keeping its state where the browser can. */
const move = (parent: Node, node: ChildNode, before: Node | null = null): void => {
  const mover = parent as Node & { moveBefore?: (node: Node, before: Node | null) => void }
  if (typeof mover.moveBefore === 'function' && node.isConnected && parent.isConnected) {
    try {
      mover.moveBefore(node, before)
      return
    } catch {
      // A move the browser refuses, across documents, is an insertion.
    }
  }
  parent.insertBefore(node, before)
}
