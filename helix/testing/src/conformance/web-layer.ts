import type { Intent } from './format.js'
import { deepActive, type Mounted } from './web-left.js'

/*
 * The web half's layer intents: a control of the page that holds focus
 * before a layer opens, and the ways a reader dismisses an open layer, each
 * performed as a browser performs it.
 */

/** The attribute that marks the page's control, which a record reads focus on as `page`. */
export const PAGE = 'data-conformance-page'

/** The page's control a `focus` with `page` puts focus on, made once a scenario asks for it. */
let pageControl: HTMLButtonElement | undefined

/** Puts focus on a control of the page, outside the setup, drawn before it. */
export const focusPage = (mounted: Mounted): void => {
  pageControl ??= document.createElement('button')
  pageControl.textContent = 'Page'
  pageControl.setAttribute(PAGE, '')
  mounted.root.before(pageControl)
  pageControl.focus()
}

/** Takes the page's control away, once a scenario is done. */
export const removePage = (): void => {
  pageControl?.remove()
}

/** Each open modal `<dialog>` in the setup's shadow roots, the last opened last. */
const openDialogs = (root: Element): HTMLDialogElement[] => {
  const found: HTMLDialogElement[] = []
  const walk = (at: Element | ShadowRoot) => {
    for (const child of at.children) {
      if (child instanceof HTMLDialogElement && child.open) {
        found.push(child)
      }
      if (child.shadowRoot !== null) {
        walk(child.shadowRoot)
      }
      walk(child)
    }
  }
  walk(root.shadowRoot ?? root)
  return found
}

/**
 * A close request, as Escape makes one: the key where focus is, and, where
 * nothing took it, the `cancel` a browser sends an open modal dialog, then
 * its close where nothing refused that. A phone's back and a screen reader's
 * escape are this close request on the web.
 */
const closeRequest = (mounted: Mounted): void => {
  const at = deepActive() ?? document.body
  const init = { bubbles: true, cancelable: true, composed: true, key: 'Escape' }
  const down = new KeyboardEvent('keydown', init)
  at.dispatchEvent(down)
  at.dispatchEvent(new KeyboardEvent('keyup', init))
  const dialog = openDialogs(mounted.root).at(-1)
  if (down.defaultPrevented || dialog === undefined) {
    return
  }
  const cancel = new Event('cancel', { cancelable: true })
  if (dialog.dispatchEvent(cancel)) {
    dialog.close()
  }
}

/**
 * A press outside the layer, at the window's top left corner: on a modal
 * dialog's scrim, which the dialog's own box does not cover there, and on the
 * page for any other layer.
 */
const pressOutside = (mounted: Mounted): void => {
  const at = openDialogs(mounted.root).at(-1) ?? document.body
  const base = { bubbles: true, cancelable: true, clientX: 1, clientY: 1, composed: true }
  const pointer = { ...base, isPrimary: true, pointerId: 3, pointerType: 'touch' }
  at.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, buttons: 1 }))
  at.dispatchEvent(new PointerEvent('pointerup', pointer))
  at.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }))
  at.dispatchEvent(new MouseEvent('mouseup', base))
  at.dispatchEvent(new PointerEvent('click', { ...pointer, detail: 1 }))
}

/** Dismisses the setup's open layer as the intent says. */
export const dismiss = (mounted: Mounted, intent: Extract<Intent, { kind: 'dismiss' }>): void => {
  if (intent.by === 'outside') {
    pressOutside(mounted)
  } else {
    closeRequest(mounted)
  }
}
