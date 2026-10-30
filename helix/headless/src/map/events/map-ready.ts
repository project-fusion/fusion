/**
 * The map has been drawn whole: its style, every tile the view needs, and the
 * ground raised where it has terrain. Sent once each time a map is connected,
 * from the frame, which then matches `:state(ready)`.
 *
 * **What a page waits on to show a map that is finished**, where it would
 * otherwise watch it draw in stages: the streets, then the imagery tile by
 * tile, then the ground rising under the markers about half a second in. The
 * shapes the frame draws are left out of "whole", since a route that animates
 * is redrawn every frame and would never count as drawn.
 */
export class HelixMapReadyEvent extends Event {
  static readonly eventName = 'helix-map-ready'

  constructor() {
    super(HelixMapReadyEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
