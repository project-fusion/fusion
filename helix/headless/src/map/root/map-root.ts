import {
  customElement,
  HelixElement,
  HelixMapPanEvent,
  HelixMapZoomEvent,
  hostAria,
  MixinViewport,
  type ViewportControlsPlacement,
  type ViewportPanDetail,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * What `ViewportControlsPlacement` is called for a map.
 *
 * The corners are the surface's and the name is the family's, so a consumer who
 * imported this before the surface was shared still has it.
 */
export type MapControlsPlacement = ViewportControlsPlacement

/**
 * @summary A frame around somebody else's map.
 *
 * @description
 * **Helix draws no map.** There are no tiles here, no projection and no
 * network, and there should not be: a tile renderer is a library, and what a
 * design system can add to MapLibre or Leaflet is the frame. The consumer slots
 * their map and this owns the box, the name, the controls and the way out,
 * which is the shape `VideoPlaylist` uses for a player it never renders.
 *
 * **The accessibility argument is the reason this exists**, and it was measured
 * rather than assumed: a map embedded the ordinary way is a canvas with no role
 * and no name, and it has *no node at all* in the accessibility tree. A reader
 * using a screen reader does not walk past it so much as never meet it. A named
 * region with controls in it is the whole of the difference.
 *
 * **The controls are buttons, and that is a deliberate choice against arrow
 * keys.** Arrows work here too, but what a screen reader does with them is not
 * ours to decide: macOS passes them through, Windows readers hold them for
 * their own reading mode unless a page takes `role="application"`, which costs
 * the reader their normal way of reading everything else in the frame. A button
 * is findable and operable in every screen reader on every platform without
 * that bargain, so panning and zooming are buttons first and keys second.
 *
 * **Nothing here moves the map.** Both controls ask, through `helix-map-pan`
 * and `helix-map-zoom`, and the consumer answers against whatever they slotted.
 * A frame that moved the map would have to know whose map it was.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Map frame, Map container, Geo
 * @documentation https://fusion.dev/helix/components/map
 *
 * @slot - The map, which is the consumer's own.
 * @slot attribution - Whoever the tiles belong to, which most licenses require you to say.
 * @slot footer - Chrome below the map, such as a legend or a scale.
 * @slot header - Chrome above the map, such as a title or a search field.
 *
 * @event {HelixMapPanEvent} helix-map-pan - The reader asked the map to move. Answer it against your own map.
 * @event {HelixMapZoomEvent} helix-map-zoom - The reader asked the map to zoom, by a direction rather than to a level.
 *
 * @csspart attribution - The strip the credit sits in, under the map.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart footer - The strip below the map, for what a consumer slots there.
 * @csspart fullscreen - The button that fills the screen.
 * @csspart header - The strip above the map, for what a consumer slots there.
 * @csspart pan-down - The button that moves the map down.
 * @csspart pan-end - The button that moves the map the way the text ends, which is right on an English page.
 * @csspart pan-start - The button that moves the map the way the text starts, which is left on an English page.
 * @csspart pan-up - The button that moves the map up.
 * @csspart region - The named region the map is slotted into.
 * @csspart viewport - The box the map is drawn in.
 * @csspart zoom-in - The button that zooms in.
 * @csspart zoom-out - The button that zooms out.
 *
 * @cssstate fullscreen - While the frame fills the screen.
 * @cssstate idle - While the reader has been still long enough to hide the chrome.
 */
@customElement('helix-headless-map')
export class HelixHeadlessMap extends MixinViewport(HelixElement) {
  /**
   * Accessible name for the map, which is the one thing a consumer must write.
   *
   * There is no sensible default. "Map" names the widget rather than the place,
   * and a reader meeting three of them on a page learns nothing from hearing the
   * same word three times.
   *
   * **The region is a tab stop**, so the keys are reachable however the controls
   * are configured: the listener is on the region, and without a stop of its own
   * a frame at `controls="none"` around a map with nothing focusable in it had
   * arrow keys no reader could ever press. `aria-keyshortcuts` says which keys
   * rather than spelling them into the name, which would otherwise be read out
   * at every encounter.
   */
  @property()
  label = ''

  /** The events this family names, the surface naming none of its own. */
  protected override panEvent(detail: ViewportPanDetail): Event {
    return new HelixMapPanEvent(detail)
  }

  protected override zoomEvent(detail: ViewportZoomDetail): Event {
    return new HelixMapZoomEvent(detail)
  }

  /**
   * What the group of controls is called.
   *
   * The surface is shared and this is the half that is a map: a reader meeting
   * the group hears what it drives rather than "view controls", which names the
   * mechanism.
   */
  protected override get controlsLabel(): string {
    return 'Map controls'
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The host carries the name, so a consumer's own `aria-label` is the thing
       that wins rather than fighting an attribute this wrote. */
    hostAria(this.internals, { label: this.label })
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
  }

  /**
   * The frame, with each region in a box of its own.
   *
   * **The boxes are load-bearing rather than tidiness.** A `<slot>` is
   * `display: contents`, so what lands in the grid is whatever a consumer
   * assigned rather than the slot itself: with no header slotted, the viewport
   * took the first row and the attribution took the `1fr`, and the map collapsed
   * to the height of one line of text. Which slots a consumer fills is not
   * something the layout may depend on, so each region is a box that holds its
   * row whether or not anything is in it, and an empty one is a row of no
   * height.
   */
  protected override render(): TemplateResult {
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || 'Map'}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Plus Minus"
      tabindex="0"
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.idle.leave}
      @pointermove=${this.idle.stir}
    >
      <div part="header">
        <slot name="header"></slot>
      </div>
      <div part="viewport">
        <slot></slot>
      </div>
      ${this.renderControls()}
      <div part="footer">
        <slot name="footer"></slot>
      </div>
      <div part="attribution">
        <slot name="attribution"></slot>
      </div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map': HelixHeadlessMap
  }
}
