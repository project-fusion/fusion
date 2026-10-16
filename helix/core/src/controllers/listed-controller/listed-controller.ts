import type { ReactiveController, ReactiveControllerHost } from 'lit'
import {
  type ControlKind,
  registerControl,
  unregisterControl,
} from '../../utils/controls/controls.js'

/**
 * Puts a control on the page's list of controls while it is connected, which
 * is where a command palette finds it by its name and a shortcut overlay finds
 * its keys.
 *
 * Joins in `hostConnected`, which a server never calls, so a server render
 * lists nothing. `unlisted` on the control or around it leaves it off the list
 * without taking it out of the registry, so the attribute can be set and
 * cleared at any time.
 */
export class ListedController implements ReactiveController {
  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly kind: ControlKind | (() => ControlKind),
    private readonly keys?: () => string | null | undefined,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    registerControl({
      element: this.host,
      keys: this.keys,
      kind: typeof this.kind === 'function' ? this.kind() : this.kind,
    })
  }

  hostDisconnected(): void {
    unregisterControl(this.host)
  }
}
