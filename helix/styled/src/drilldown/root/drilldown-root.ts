import { customElement, reducedMotion, resizeFrom } from '@fusion.dev/helix-core'
import {
  HelixHeadlessDrilldown,
  HelixHeadlessDrilldownItem,
} from '@fusion.dev/helix-headless/drilldown'
import { type CSSResultGroup, html, type PropertyValues, type TemplateResult } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './drilldown-root.css.js'

/**
 * @summary A stack of pages that shows one at a time, with a back button.
 *
 * @description
 * Pages slide in the direction of travel, so you can tell whether you went
 * deeper or came back. The page leaving slides on out the other way as it
 * fades, so the two pass as one move. Without motion, the panel only shows
 * different text.
 *
 * The slide is a CSS animation, because the arriving page was not in the DOM on
 * the previous frame, so there is nothing to transition from. Under
 * `prefers-reduced-motion` the pages swap instantly, as they do in `Menu`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Panel, Nested list, Drill-in
 * @use Nested lists you step into one level at a time, such as settings on a narrow screen.
 * @instead tree - A hierarchy whose branches open in place.
 * @instead menu - Commands that open from a trigger and close when you are done.
 * @instead listbox - A value you choose from a list.
 * @anatomy page
 * @anatomy item
 * @anatomy mark
 * @practice {navigation} Set `navigation` for a site's navigation. - The host is then a navigation landmark, and each page a list of places to go in place of a menu of commands.
 * @documentation https://fusion.dev/design/components/drilldown
 *
 * @csspart leaving - A copy of the page going away, which slides out and fades as the next one arrives. Empty but during a move, and hidden from assistive technology and the pointer.
 *
 * @cssproperty --drilldown-back-color - Color of the back button's icon.
 * @cssproperty --drilldown-back-hover-background-color - Fill of the back button under the pointer.
 * @cssproperty --drilldown-background-color - Fill behind the pages.
 * @cssproperty --drilldown-duration - How long a page takes to slide in, and the box to grow or shrink to it.
 * @cssproperty --drilldown-header-block-size - Height of the bar above a page.
 * @cssproperty --drilldown-header-border-color - Color of the rule under the bar above a page.
 * @cssproperty --drilldown-inline-size - Width of the region.
 * @cssproperty --drilldown-page-padding-block - Space above and below a page's rows.
 * @cssproperty --drilldown-title-color - Color of the page's name.
 * @cssproperty --drilldown-title-font-size - Size of the page's name.
 * @cssproperty --drilldown-title-font-weight - Weight of the page's name.
 * @cssproperty --drilldown-travel - How far a page slides as it arrives, along the line of text.
 */
@customElement('helix-drilldown')
export class HelixDrilldown extends HelixHeadlessDrilldown {
  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]

  /** The box's height before this update, to grow or shrink from. */
  private heightBefore: number | undefined

  /** The move from one height to the next, ended where it is if another starts. */
  private resizing: Animation | undefined

  /** The rows on the page showing before this update, and where that page sat. */
  private pageBefore: { rows: HelixHeadlessDrilldownItem[]; top: number } | undefined

  /** Which move is the latest, so only its copy is emptied when its slide ends. */
  private turn = 0

  /** The page that showed after the last update, so a move is a change from it. */
  private shownPage: string | undefined

  protected override willUpdate(changed: PropertyValues<this>): void {
    /* Read before the headless tier's own, which can move to a page `page`
       names: the rows still carry the marks of the page they are on until
       `updated` writes the new ones. */
    this.pageBefore = this.hasUpdated ? this.showing() : undefined
    super.willUpdate(changed)
    this.heightBefore = this.hasUpdated ? this.getBoundingClientRect().height : undefined
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    this.resize()
    this.leave()
  }

  /** The page, and after it the `leaving` part, empty but during a move. */
  protected override render(): TemplateResult {
    return html`${super.render()}<div part="leaving" aria-hidden="true" inert></div>`
  }

  /** The rows drawn on the page showing, and how far down the box that page starts. */
  private showing(): { rows: HelixHeadlessDrilldownItem[]; top: number } {
    const rows: HelixHeadlessDrilldownItem[] = []
    const walk = (parent: Element): void => {
      for (const child of parent.children) {
        if (child instanceof HelixHeadlessDrilldownItem) {
          /* Drawn as a row, which a row off the page and the row whose page
             shows are not: they render no `item`. */
          if (child.shadowRoot?.querySelector('[part="item"]')) {
            rows.push(child)
          }
          walk(child)
        }
      }
    }
    walk(this)
    const page = this.renderRoot.querySelector<HTMLElement>('[part="page"]')
    return { rows, top: page?.offsetTop ?? 0 }
  }

  /**
   * **The page leaving slides out the other way as the next slides in**, so
   * the two pass as one move rather than the old page vanishing in a frame.
   * Its rows are the page's own children, which the next page's marks take
   * off the screen, so what leaves is a copy: the rows cloned, as they were,
   * into the `leaving` part laid over the place the page was, which the
   * stylesheet animates by the same `data-direction` the arriving page reads,
   * and which is emptied once its animation ends. Inert and hidden from
   * assistive technology, so nothing in it can be reached.
   */
  private leave(): void {
    const before = this.pageBefore
    this.pageBefore = undefined
    /* **A move is the page changing**, not the rows: each row draws its new
       state in an update of its own, after this one, so here they still
       draw the old page. */
    const moved = this.shownPage !== undefined && this.shownPage !== this.page
    this.shownPage = this.page
    if (
      !moved ||
      before === undefined ||
      before.rows.length === 0 ||
      !this.hasAttribute('data-direction') ||
      typeof document === 'undefined' ||
      reducedMotion()
    ) {
      return
    }
    const copy = this.renderRoot.querySelector<HTMLElement>('[part="leaving"]')
    if (!copy) {
      return
    }
    this.turn += 1
    const turn = this.turn
    copy.style.setProperty('--_drilldown-leaving-top', `${before.top}px`)
    copy.replaceChildren(
      ...before.rows.map((row) => {
        const clone = row.cloneNode(true) as HTMLElement
        clone.removeAttribute('slot')
        clone.removeAttribute('id')
        return clone
      }),
    )
    /* Emptied once its slide ends, or at once where the stylesheet draws
       none, so the copy never stays. Only by this move: an earlier one
       ending as a later one starts leaves the later copy alone. */
    const done = (): void => {
      if (turn === this.turn) {
        copy.replaceChildren()
      }
    }
    /* The style read first: WebKit lists no animation for an element whose
       style it has not recomputed since the copy filled it. */
    const running = getComputedStyle(copy).animationName === 'none' ? [] : copy.getAnimations()
    if (running.length === 0) {
      done()
      return
    }
    void Promise.all(running.map((one) => one.finished)).then(done, done)
  }

  /**
   * **The box grows or shrinks to the page arriving**, over the slide's own
   * time, rather than snapping to its height as the page changes. A height is
   * a keyword here, `fit-content`, which no transition can follow, so the move
   * runs on the two measured heights and leaves the keyword in place after.
   */
  private resize(): void {
    const from = this.heightBefore
    this.heightBefore = undefined
    if (from === undefined) {
      return
    }
    /* **Measured once the page has laid out**, which is a frame's layout after
       this update: the rows of the page arriving are assigned in updates of
       their own, and measured here the box was 32 pixels taller than it came
       to rest at, so it grew past its place and snapped back. `resizeFrom`
       measures after that layout and before the frame is painted. */
    void resizeFrom(this, from, {
      previous: this.resizing,
      timing: () => {
        const style = getComputedStyle(this)
        return {
          duration:
            style.getPropertyValue('--drilldown-duration').trim() ||
            style.getPropertyValue('--helix-duration-normal').trim(),
          easing: style.getPropertyValue('--helix-easing-decelerate'),
        }
      },
    }).then((move) => {
      this.resizing = move
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-drilldown': HelixDrilldown
  }
}
