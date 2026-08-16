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
 * Unrecognised commands are left alone rather than swallowed, so a host that
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
