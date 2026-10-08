import { addFeature, adoptSheet, type ViewportWay } from '@fusion.dev/helix-core'
import { type CSSResult, html, nothing, type TemplateResult } from 'lit'
import type { HelixHeadlessMap } from '../root/map-root.js'

/** Degrees a rotate button turns the map, as Shift with Left or Right does. */
const ROTATE_STEP = 15

/** The frame as the compass reads it: the members its public API leaves out. */
interface Frame {
  panGlyph(way: ViewportWay): string
  panLabel(way: ViewportWay): string
}

/**
 * The compass, and the pan and rotate buttons around it where `controls`
 * names them.
 *
 * **One control for which way the map faces and where it goes.** The needle
 * turns with the map and points north; pressing it turns the map back. The
 * arrows around it are the way to move and turn the map without dragging,
 * which a pointer otherwise needs.
 */
const renderCompass = (map: HelixHeadlessMap, pan: boolean, rotate: boolean): TemplateResult => {
  const frame = map as unknown as Frame
  return html`<div part="compass">
    ${
      rotate
        ? html`<button part="rotate-left" aria-label=${map.rotateLeftLabel} type="button" @click=${() => map.rotate(-ROTATE_STEP)}>
            <slot name="rotate-left-icon">↺</slot>
          </button>`
        : nothing
    }
    ${
      pan
        ? html`<button part="pan-up" aria-label=${frame.panLabel('up')} type="button" @click=${() => map.pan('up')}>
            <slot name="pan-up-icon">${frame.panGlyph('up')}</slot>
          </button>`
        : nothing
    }
    ${
      rotate
        ? html`<button part="rotate-right" aria-label=${map.rotateRightLabel} type="button" @click=${() => map.rotate(ROTATE_STEP)}>
            <slot name="rotate-right-icon">↻</slot>
          </button>`
        : nothing
    }
    ${
      pan
        ? html`<button part="pan-start" aria-label=${frame.panLabel('start')} type="button" @click=${() => map.pan('start')}>
            <slot name="pan-start-icon">${frame.panGlyph('start')}</slot>
          </button>`
        : nothing
    }
    <button part="face-north" aria-label=${map.faceNorthLabel} type="button" style=${`--map-needle-turn: ${-map.bearing}deg`} @click=${() => map.faceNorth()}>
      <slot name="face-north-icon">
        <svg part="needle" aria-hidden="true" viewBox="0 0 16 16">
          <path data-end="north" d="M8 1.5 10.5 8h-5Z" />
          <path data-end="south" d="M8 14.5 5.5 8h5Z" />
        </svg>
      </slot>
    </button>
    ${
      pan
        ? html`<button part="pan-end" aria-label=${frame.panLabel('end')} type="button" @click=${() => map.pan('end')}>
            <slot name="pan-end-icon">${frame.panGlyph('end')}</slot>
          </button>`
        : nothing
    }
    ${
      pan
        ? html`<button part="pan-down" aria-label=${frame.panLabel('down')} type="button" @click=${() => map.pan('down')}>
            <slot name="pan-down-icon">${frame.panGlyph('down')}</slot>
          </button>`
        : nothing
    }
  </div>`
}

/**
 * Gives every map of a class its compass, drawn where `controls` names
 * `compass`, `pan` or `rotate`, as it does by default. The entries call it for
 * their own tier's class: the headless entry for `HelixHeadlessMap`, and the
 * styled one for `HelixMap`, with the sheet that draws the compass.
 */
export const addCompass = (element: typeof HelixHeadlessMap, sheet?: CSSResult): void => {
  addFeature(element, {
    compass: (map: HelixHeadlessMap, pan: boolean, rotate: boolean) => {
      adoptSheet(map, sheet)
      return renderCompass(map, pan, rotate)
    },
  })
}
