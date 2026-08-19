import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * The platform's invoker event, which TypeScript's DOM library does not carry
 * yet. Only the two members this needs are declared: guessing at the rest would
 * be a second, worse copy of a specification that is still moving.
 */
interface CommandLike extends Event {
  /** The command asked for, verbatim. Custom ones are prefixed `--`. */
  readonly command: string
  /** The element that asked. */
  readonly source: Element | null
}

/**
 * Whether the browser implements invoker commands.
 *
 * Feature-detected on the prototype rather than on an instance, so it can be
 * answered before anything has rendered, and guarded for a server, which has no
 * `HTMLButtonElement` at all.
 */
export const supportsInvokers = (): boolean =>
  typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype

/**
 * The `command` event, for a browser that does not send one.
 *
 * Invoker commands are recent: Chrome 135, Firefox 137, Safari 18.4. Before
 * this, a button in an older browser set `commandForElement` on nothing, the
 * wiring silently did not happen, and the control did nothing at all when
 * clicked. No error, no warning, and every `command` in the library dead at
 * once, which is the worst way for a feature to be missing: the markup is
 * right, the component is right, and the button is simply inert.
 *
 * So the button sends this instead where the platform will not. It carries the
 * two members `CommandController` reads and dispatches at the target, which is
 * where the platform dispatches too, so nothing downstream can tell the
 * difference.
 *
 * **The built-in commands are not reproduced.** `show-modal`, `close` and
 * `toggle-popover` are defined against native elements and applied by the
 * browser itself, and writing our own would mean reimplementing part of the
 * platform against elements we do not own. Nothing in this library uses them:
 * a custom element only ever answers a `--` command, which is the platform's
 * marker for "the target decides", and the target is ours.
 */
export class HelixFallbackCommandEvent extends Event {
  /** The command asked for, verbatim. */
  readonly command: string

  /** The element that asked. */
  readonly source: Element | null

  constructor(command: string, source: Element | null) {
    // Matching the platform: fired at the invokee, cancelable, and not
    // bubbling. `CommandController` listens on the target itself, so there is
    // nothing above it that a bubble would reach anyway.
    super('command', { cancelable: true })
    this.command = command
    this.source = source
  }
}

/** What the host answers to, by command name. */
export interface CommandOptions {
  /** Each command the host implements, keyed by the name a trigger writes. */
  commands: Record<string, (source: Element | null) => void>
}

/**
 * Lets a control elsewhere on the page operate this one, declaratively.
 *
 * ```html
 * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
 * <helix-dialog id="confirm">…</helix-dialog>
 * ```
 *
 * **The platform's own invoker, not a convention of ours.** `commandfor` and
 * `command` are attributes the browser understands: it resolves the id, wires
 * the two together, and dispatches a `command` event at the target when the
 * trigger is activated. That is a real event with a real source, so it works
 * for a click, for Enter, for Space, and for anything else the platform decides
 * counts as activation later.
 *
 * The alternative was a `data-` recipe of our own with a delegated listener on
 * the document, and it is worse in every direction: a global listener a
 * consumer cannot see, an id lookup we would write ourselves, activation
 * semantics we would have to guess at, and a convention that is ours to
 * document and theirs to learn.
 *
 * **Only custom commands reach a custom element.** The built-in ones —
 * `show-modal`, `close`, `toggle-popover` — are defined against native elements
 * and the browser applies them itself; pointed at a custom element they do
 * nothing. So the names here start with `--`, which is the platform's marker
 * for "the target decides what this means", and the target deciding is exactly
 * what this is.
 *
 * Unrecognized commands are left alone rather than swallowed, so a host that
 * answers `--show` does not quietly absorb a `--print` meant for something
 * else.
 */
export class CommandController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: CommandOptions

  constructor(host: ReactiveControllerHost & HTMLElement, options: CommandOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  private readonly handle = (event: Event): void => {
    const command = (event as CommandLike).command
    const run = this.options.commands[command]
    if (!run) {
      return
    }
    run((event as CommandLike).source)
  }

  hostConnected(): void {
    this.host.addEventListener('command', this.handle)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('command', this.handle)
  }
}
