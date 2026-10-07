import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** Where an `UpgradeController` looks for children that have not upgraded. */
export interface UpgradeOptions {
  /**
   * Whether to look through every descendant. Off, it looks at the host's own
   * children. Turn it on for a host that finds its items inside wrappers, as a
   * radio group does.
   */
  subtree?: boolean
}

/**
 * Calls back when a child that had not upgraded is defined.
 *
 * **A host that knows its children by their class does not know a child that
 * has not upgraded.** `instanceof` is false for it and a marker its class sets,
 * such as `isNotification`, is missing. An upgrade changes no child list and no
 * slot assignment, so neither a `MutationObserver` nor `slotchange` reports it,
 * and the host keeps the answer it read before. Measured on the notification
 * feed: a row added while its definition was still loading was drawn nowhere,
 * and the feed showed its empty line over it. A listbox did not select an
 * option its `default-value` named, and a tree gave a late item no level.
 *
 * This happens wherever a child's definition loads after the host's: a page
 * that adds children before its scripts finish, or a bundle that defines the
 * host first.
 *
 * It looks when the host connects and at each child added after, and waits on
 * `customElements.whenDefined` once for each name. `define` upgrades the
 * elements in the document before that promise resolves, so the children have
 * their class by the time the callback runs. The callback is the host's own
 * resync, such as its `slotchange` handler, and is `requestUpdate` unless given
 * something else to do. Watches from connection to disconnection.
 */
export class UpgradeController implements ReactiveController {
  private watcher: MutationObserver | undefined = undefined

  /** The names already waited on, so each is waited on once. */
  private readonly waiting = new Set<string>()

  private readonly subtree: boolean

  constructor(
    private readonly host: ReactiveControllerHost & Element,
    private readonly upgraded: () => void = () => host.requestUpdate(),
    options: UpgradeOptions = {},
  ) {
    this.subtree = options.subtree ?? false
    host.addController(this)
  }

  hostConnected(): void {
    if (typeof MutationObserver === 'undefined' || typeof customElements === 'undefined') {
      return
    }
    this.look(this.host, false)
    this.watcher ??= new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.look(node as Element, true)
          }
        }
      }
    })
    this.watcher.observe(this.host, { childList: true, subtree: this.subtree })
  }

  hostDisconnected(): void {
    this.watcher?.disconnect()
  }

  /** Waits on `element`, where it was added, and on what it holds where the subtree counts. */
  private look(element: Element, added: boolean): void {
    if (added) {
      this.wait(element)
    }
    const inside = this.subtree
      ? element.querySelectorAll('*')
      : element === this.host
        ? element.children
        : []
    for (const child of inside) {
      this.wait(child)
    }
  }

  private wait(element: Element): void {
    const name = element.localName
    if (!name.includes('-') || this.waiting.has(name) || customElements.get(name) !== undefined) {
      return
    }
    this.waiting.add(name)
    void customElements.whenDefined(name).then(() => {
      this.waiting.delete(name)
      this.upgraded()
    })
  }
}
