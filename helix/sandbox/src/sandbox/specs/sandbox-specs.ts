import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { styles } from './sandbox-specs.css.js'

/** One test, as the harness reported it. */
export interface SpecResult {
  /** How long it took, in milliseconds. */
  duration: number
  /** Why it failed, when it did. */
  error?: string
  /** What the test is called. */
  name: string
  /** Whether it passed. */
  passed: boolean
  /** The describe blocks it sits in, outermost first. */
  suite: string[]
}

/** What the runner frame sends back. */
interface ResultsMessage {
  duration?: number
  error?: string
  family?: string
  results?: SpecResult[]
  type?: string
}

/**
 * @summary Runs a component's own specs and shows how they came out.
 *
 * @description
 * The specs are not rewritten for this. The same `*.dom.spec.ts` files that run
 * in CI are bundled for the browser with `bun:test` and the DOM helpers pointed
 * at a browser harness, so a spec deleted in the morning stops being reported
 * in the afternoon and there is no second suite to keep in step.
 *
 * **A browser is the stricter environment, not the looser one.** The node
 * harness runs against happy-dom, which does not implement `attachInternals` at
 * all and has to be handed an inert stub, reports `:popover-open` as unmatched
 * for a popover that is open, and returns nothing from `assignedNodes({ flatten:
 * true })` where a browser returns the fallback. Each of those has already
 * produced a spec that passed while asserting the opposite of what ships. Here
 * they are the platform's own.
 *
 * They run in a frame of their own rather than the preview's, because `mount`
 * replaces the document body for every test and would take the example with it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Tests, Suite
 * @documentation https://helix.fusion.dev/sandbox/specs
 *
 * @csspart frame - The document the specs run in.
 * @csspart summary - The counts, and how long the run took.
 * @csspart results - The scrolling list.
 * @csspart suite - A describe block's heading.
 * @csspart result - One test.
 * @csspart status - Whether that test passed.
 * @csspart error - Why it failed.
 * @csspart empty - Shown when there is nothing to report.
 *
 * @cssproperty --specs-pass-color - Colour of a passing test.
 * @cssproperty --specs-fail-color - Colour of a failing one.
 */
@customElement('helix-sandbox-specs')
export class HelixSandboxSpecs extends HelixElement {
  /** Which family's specs to run. Changing it runs them. */
  @property()
  family = ''

  /** The document that runs them. Same origin, and it must stay that way. */
  @property()
  src = ''

  /** Accessible name for the results. */
  @property()
  label = 'Spec results'

  @state()
  private results: SpecResult[] = []

  @state()
  private failure = ''

  @state()
  private running = false

  @state()
  private elapsed = 0

  /** Whether the frame has said it is listening. */
  private ready = false

  /** Asked for before the frame was ready, and sent the moment it is. */
  private pending = ''

  private get frame(): HTMLIFrameElement | null {
    return this.renderRoot.querySelector('iframe')
  }

  /**
   * The origin the frame runs at, derived from `src`.
   *
   * Named rather than `*`, so a message meant for the runner cannot be read by
   * a document that happens to be listening.
   */
  private get frameOrigin(): string {
    try {
      return new URL(this.src, window.location.href).origin
    } catch {
      return window.location.origin
    }
  }

  private readonly handleMessage = (event: MessageEvent<ResultsMessage>): void => {
    const frame = this.frame
    if (!frame || event.source !== frame.contentWindow || event.origin !== this.frameOrigin) {
      return
    }

    if (event.data?.type === 'helix-specs-ready') {
      this.ready = true
      if (this.pending !== '') {
        this.request(this.pending)
        this.pending = ''
      }
      return
    }
    // A late answer for a family the reader has already navigated away from is
    // not a result, it is the previous question.
    if (event.data?.family !== this.family) {
      return
    }
    if (event.data?.type === 'helix-specs-results') {
      this.results = event.data.results ?? []
      this.elapsed = event.data.duration ?? 0
      this.failure = ''
      this.running = false
    }
    if (event.data?.type === 'helix-specs-failed') {
      this.failure = event.data.error ?? 'The specs could not be loaded.'
      this.results = []
      this.running = false
    }
  }

  private request(family: string): void {
    this.frame?.contentWindow?.postMessage(
      { family, origin: window.location.origin, type: 'helix-specs-run' },
      this.frameOrigin,
    )
  }

  /** Runs the current family's specs. */
  run(): void {
    if (this.family === '') {
      return
    }
    this.results = []
    this.failure = ''
    this.running = true
    if (this.ready) {
      this.request(this.family)
    } else {
      this.pending = this.family
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('message', this.handleMessage)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('message', this.handleMessage)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('family')) {
      this.run()
    }
  }

  private get failed(): number {
    return this.results.filter((result) => !result.passed).length
  }

  /** The results grouped under the describe block they were written in. */
  private get grouped(): { results: SpecResult[]; suite: string }[] {
    const groups = new Map<string, SpecResult[]>()
    for (const result of this.results) {
      const key = result.suite.join(' › ')
      groups.set(key, [...(groups.get(key) ?? []), result])
    }
    return [...groups].map(([suite, results]) => ({ results, suite }))
  }

  private summary(): TemplateResult | typeof nothing {
    if (this.running) {
      return html`<p part="summary">Running…</p>`
    }
    if (this.failure !== '') {
      return html`<p part="summary" data-state="fail">${this.failure}</p>`
    }
    if (this.results.length === 0) {
      return nothing
    }
    const failed = this.failed
    const passed = this.results.length - failed
    return html`<p part="summary" data-state=${failed > 0 ? 'fail' : 'pass'}>
      ${passed} passed${failed > 0 ? `, ${failed} failed` : ''} in
      ${Math.round(this.elapsed)}ms
    </p>`
  }

  protected override render(): TemplateResult {
    const nothingYet = !this.running && this.failure === '' && this.results.length === 0

    return html`<iframe part="frame" src=${this.src || nothing} title=${this.label} aria-hidden="true"></iframe>
      ${this.summary()}
      <div part="results" role="status" aria-label=${this.label} tabindex="0">
        ${
          nothingYet
            ? html`<p part="empty">No specs have been run.</p>`
            : this.grouped.map(
                (group) => html`<section>
                  ${group.suite === '' ? nothing : html`<h3 part="suite">${group.suite}</h3>`}
                  ${group.results.map(
                    (
                      result,
                    ) => html`<div part="result" data-state=${result.passed ? 'pass' : 'fail'}>
                      <span part="status" aria-hidden="true">${result.passed ? '✓' : '✗'}</span>
                      <span>${result.name}</span>
                      ${
                        result.error === undefined
                          ? nothing
                          : html`<p part="error">${result.error}</p>`
                      }
                    </div>`,
                  )}
                </section>`,
              )
        }
      </div>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-specs': HelixSandboxSpecs
  }
}
