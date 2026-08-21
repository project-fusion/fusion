/** What the util needs of a scroller and the thing it is bringing into it. */
export interface ScrollItemOptions {
  /** Space left between the item and the edge it came in at. */
  padding?: number
  /** The scrolling box. Defaults to the nearest ancestor that scrolls. */
  scroller?: HTMLElement
  /** Whether to animate. Ignored where the reader asked for less motion. */
  smooth?: boolean
}

/*
 * Brings an item into view inside its own scroller, and moves nothing else.
 *
 * **Not `Element.scrollIntoView`, and the difference is the whole reason this
 * exists.** That method walks every scrollable ancestor and scrolls all of
 * them, so bringing the current item into a tree also scrolls the page the tree
 * sits on, and on a phone it takes the address bar with it. A reader who
 * pressed Down in a sidebar did not ask the document to move.
 *
 * It also does nothing when the item is already visible, where `scrollIntoView`
 * with `block: 'nearest'` still nudges. Nudging on every keypress is what makes
 * a long list feel like it is fighting the reader.
 *
 * Both axes, because the components that need this do not agree on one: a
 * carousel scrolls sideways and a tree scrolls down, and a menu that has run
 * out of room does both.
 *
 * `smooth` is a request rather than an instruction. Animating a scroll the
 * reader triggered by pressing a key means the list is still moving when the
 * next press arrives, so this follows `prefers-reduced-motion` and is off by
 * default for exactly that case.
 */
/**
 * The nearest ancestor that actually scrolls, crossing shadow boundaries.
 *
 * This was `item.offsetParent`, which is the nearest *positioned* ancestor and
 * has nothing whatever to do with overflow. The two coincide often enough to
 * look right, because a scroller frequently is positioned, and they come apart
 * exactly where it matters: put anything `position: relative` between the item
 * and the box that scrolls, and the util scrolled the thing in between, which
 * does not scroll, and reported nothing. `Tree` passes no scroller at all, so
 * it had the default on every keypress.
 *
 * The walk crosses shadow boundaries through the host, because the item is
 * almost always in one and `parentElement` is null at the root. Without that
 * step, a component whose scroller is its own `[part]` would find nothing.
 *
 * It stops before the document. Scrolling the page is the one thing this whole
 * util exists not to do, so finding nothing inside the component and returning
 * null is the honest answer: the caller no-ops rather than taking the address
 * bar with it.
 */
const scrollingAncestor = (item: HTMLElement): HTMLElement | null => {
  const stop = item.ownerDocument.body
  let node: HTMLElement | null = climb(item)
  while (node && node !== stop) {
    const style = getComputedStyle(node)
    /* Both axes, since the caller may need either, and `overlay` because a
       scroller styled with it scrolls exactly as `auto` does. `clip` and
       `hidden` are deliberately not here: they cut the content off and are not
       something a reader can move. */
    if (/\b(auto|scroll|overlay)\b/.test(`${style.overflowX} ${style.overflowY}`)) {
      return node
    }
    node = climb(node)
  }
  return null
}

/** Up one, through a shadow root where that is what is above. */
const climb = (node: HTMLElement): HTMLElement | null => {
  if (node.parentElement) {
    return node.parentElement
  }
  const root = node.getRootNode()
  return root instanceof ShadowRoot ? (root.host as HTMLElement) : null
}

export const scrollItemIntoView = (item: HTMLElement, options: ScrollItemOptions = {}): void => {
  const { padding = 0, smooth = false } = options
  const scroller = options.scroller ?? scrollingAncestor(item)
  if (!scroller) {
    return
  }

  /* Measured from the boxes rather than from `offsetLeft`, which is relative to
     the offset parent and is only the scroller when nothing between them is
     positioned. The rectangles are relative to the viewport, so the difference
     between them is the distance regardless of what sits in between. */
  const box = item.getBoundingClientRect()
  const view = scroller.getBoundingClientRect()

  const before = { block: view.top - box.top + padding, inline: view.left - box.left + padding }
  const after = {
    block: box.bottom - view.bottom + padding,
    inline: box.right - view.right + padding,
  }

  /* Whichever edge it is past, and nothing when it is past neither. A scroll of
     zero still fires a `scroll` event and still cancels a smooth one already
     running, so the early return is behavior rather than an optimisation. */
  const inline = before.inline > 0 ? -before.inline : after.inline > 0 ? after.inline : 0
  const block = before.block > 0 ? -before.block : after.block > 0 ? after.block : 0
  if (inline === 0 && block === 0) {
    return
  }

  const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  scroller.scrollBy({
    behavior: smooth && !still ? 'smooth' : 'instant',
    left: inline,
    top: block,
  })
}
