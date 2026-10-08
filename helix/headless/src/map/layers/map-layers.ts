import {
  HelixBeforeChangeEvent,
  HelixBeforeToggleEvent,
  HelixMapPartChangeEvent,
  HelixToggleEvent,
  requestChange,
} from '@fusion.dev/helix-core'
import {
  buildings,
  cloudRain,
  dotsNine,
  type HelixIcon,
  leaf,
  mountains,
  path,
  polygon,
  stack,
  target,
} from '@fusion.dev/helix-icons'
import { html, nothing, type ReactiveController, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import type { HelixHeadlessMap, MapLayer, MapType } from '../root/map-root.js'

/** The map types, in the order the menu offers them. */
const MAP_TYPES: readonly MapType[] = ['standard', 'hybrid', 'satellite']

/**
 * A layer's picture in the layers menu, by what it draws: a path for a route,
 * a shape for an area, dots for points, buildings, mountains for terrain,
 * rings for contour lines, a leaf for land cover, and a rain cloud for tiles
 * over the map, such as weather. Imagery of the ground
 * is a map type, with a card of its own.
 */
const iconOf = (layer: MapLayer | undefined): HelixIcon => {
  switch (layer?.layerKind) {
    case 'route':
      return path
    case 'area':
      return polygon
    case 'points':
      return dotsNine
    case 'buildings':
      return buildings
    case 'terrain':
      return mountains
    case 'contours':
      return target
    case 'landcover':
      return leaf
    case 'raster':
      return cloudRain
    default:
      return stack
  }
}

/** The frame as the menu reads it: the members its public API leaves out. */
interface Frame {
  layersOpen: boolean
  readonly layers: MapLayer[]
  renderLayersIcon(): TemplateResult
}

/**
 * What opens and closes the layers menu of one map, which the map holds as
 * its `layersOpen` state.
 *
 * Made the first time the map draws the menu, so a map whose `controls` never
 * names `layers` makes none.
 */
class LayersMenu implements ReactiveController {
  private readonly map: HelixHeadlessMap

  constructor(map: HelixHeadlessMap) {
    this.map = map
    map.addController(this)
  }

  /** Whether the menu is open. */
  get open(): boolean {
    return (this.map as unknown as Frame).layersOpen
  }

  /** Opens or closes the menu, and listens for a press outside it while it is open. */
  set(open: boolean): void {
    if (open === this.open) {
      return
    }
    ;(this.map as unknown as Frame).layersOpen = open
    if (open) {
      document.addEventListener('pointerdown', this.handleOutside)
    } else {
      document.removeEventListener('pointerdown', this.handleOutside)
    }
  }

  hostDisconnected(): void {
    document.removeEventListener('pointerdown', this.handleOutside)
  }

  /** Closes the menu on a press anywhere outside the frame. */
  private readonly handleOutside = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this.map)) {
      this.set(false)
    }
  }

  /**
   * Closes the menu when focus moves on from its button and the menu, as a Tab
   * past the last tile does. Focus leaving the page, with nothing focused in
   * its place, leaves the menu as it is.
   */
  readonly handleFocusOut = (event: FocusEvent): void => {
    const to = event.relatedTarget as Node | null
    if (!(this.open && to)) {
      return
    }
    const owners = this.map.renderRoot.querySelectorAll(
      '[part="layers-toggle"], [part="layers-menu"]',
    )
    if (![...owners].some((owner) => owner.contains(to))) {
      this.set(false)
    }
  }

  /**
   * Keys pressed in the menu. Escape closes it and returns to its button, and
   * no key reaches the region, where the arrows would pan the map.
   */
  readonly handleKeydown = (event: KeyboardEvent): void => {
    event.stopPropagation()
    if (event.key === 'Escape' && this.open) {
      this.set(false)
      this.map.renderRoot.querySelector<HTMLElement>('[part="layers-toggle"]')?.focus()
    }
  }
}

/** The menu each map was given. */
const menus = new WeakMap<HelixHeadlessMap, LayersMenu>()

/** A map type's name on its card. */
const nameOf = (map: HelixHeadlessMap, type: MapType): string =>
  type === 'hybrid'
    ? map.hybridLabel
    : type === 'satellite'
      ? map.satelliteLabel
      : map.standardLabel

/**
 * The imagery among the layers: raster layers drawn as the ground, which the
 * map types show and hide rather than a tile of their own.
 */
const imageryOf = (layers: readonly MapLayer[]): MapLayer[] =>
  layers.filter((layer) => layer.layerKind === 'raster' && layer.ground === true)

/**
 * Shows or hides layers, which `connectMap` draws or takes off the map.
 *
 * **Asked first, from the layer.** The tile wrote `hidden` onto the
 * consumer's element and said nothing, so a page could neither keep the
 * choice nor keep its own state in step. The request comes from the first
 * layer of the tile, which is the element the page wrote. Once `hidden`
 * holds the answer, the same layer sends `helix-toggle`, the request's verb
 * without `before`, since the platform has no word for a layer shown.
 */
const showLayers = (map: HelixHeadlessMap, layers: readonly MapLayer[], shown: boolean): void => {
  const first = layers[0]
  if (!first) {
    return
  }
  const applied = requestChange({
    apply: () => {
      for (const layer of layers) {
        layer.hidden = !shown
      }
      map.requestUpdate()
    },
    event: (checked) => new HelixBeforeToggleEvent({ checked }),
    host: first,
    next: shown,
  })
  if (applied) {
    first.dispatchEvent(new HelixToggleEvent({ checked: shown }))
  }
}

/** Asks for a map type, and sends `change` once it holds. */
const chooseMapType = (map: HelixHeadlessMap, type: MapType): void => {
  const applied = requestChange({
    apply: (value) => {
      map.mapType = value === 'standard' ? undefined : (value as 'hybrid' | 'satellite')
    },
    event: (value) => new HelixBeforeChangeEvent({ value }),
    host: map,
    next: type as string,
  })
  if (applied) {
    map.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    /* Refused: the radio the reader pressed is checked, and the type is not. */
    map.requestUpdate()
  }
}

/**
 * The menu's entries, in the order the layers are written: a layer of its
 * own, or every layer in a group, at the place of the first.
 */
const entriesOf = (layers: readonly MapLayer[]): MapLayer[][] => {
  const entries: MapLayer[][] = []
  const groups = new Map<string, MapLayer[]>()
  const imagery = imageryOf(layers)
  for (const layer of layers.filter((one) => !imagery.includes(one))) {
    const had = layer.group ? groups.get(layer.group) : undefined
    if (had) {
      had.push(layer)
      continue
    }
    const entry = [layer]
    entries.push(entry)
    if (layer.group) {
      groups.set(layer.group, entry)
    }
  }
  return entries
}

/**
 * The map types, as cards with a picture of the map in each: Standard,
 * Hybrid, and Satellite. One is chosen, so they are radio buttons, and the
 * arrow keys move between them as a group of radios does.
 */
const renderMapTypes = (map: HelixHeadlessMap): TemplateResult => {
  const chosen = map.mapType ?? 'standard'
  return html`<div part="map-types" role="radiogroup" aria-label=${map.mapTypeLabel}>
    ${MAP_TYPES.map((type) => {
      const preview = map.mapPreviews[type]
      return html`<label part="map-type">
        <input
          type="radio"
          name="map-type"
          .checked=${live(chosen === type)}
          @change=${(event: Event) => {
            event.stopPropagation()
            chooseMapType(map, type)
          }}
        />
        ${
          preview
            ? html`<img part="map-type-preview" alt="" src=${preview} />`
            : html`<span part="map-type-preview"></span>`
        }
        <span part="map-type-name">${nameOf(map, type)}</span>
      </label>`
    })}
  </div>`
}

/**
 * The layers button and its menu: a tile for each layer or group, in the
 * order they are written, with its picture and name, pressed while it is
 * shown. A group's tile is pressed while any of its layers is shown.
 */
export const drawLayersMenu = (map: HelixHeadlessMap): TemplateResult => {
  const menu = menus.get(map) ?? new LayersMenu(map)
  menus.set(map, menu)
  const frame = map as unknown as Frame
  const { layers } = frame
  const entries = entriesOf(layers)
  return html`<button
      part="layers-toggle"
      aria-controls="layers-menu"
      aria-expanded=${menu.open ? 'true' : 'false'}
      aria-label=${map.layersLabel}
      type="button"
      @click=${() => {
        menu.set(!menu.open)
        /* Opening asks the connector for fresh previews of the map types. */
        if (menu.open) {
          map.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'menu' }))
        }
      }}
      @focusout=${menu.handleFocusOut}
      @keydown=${menu.handleKeydown}
    >
      ${frame.renderLayersIcon()}
    </button>
    <div
      part="layers-menu"
      id="layers-menu"
      role="group"
      aria-label=${map.layersLabel}
      ?hidden=${!menu.open}
      @focusout=${menu.handleFocusOut}
      @keydown=${menu.handleKeydown}
    >
      ${imageryOf(layers).length > 0 ? renderMapTypes(map) : nothing}
      ${
        entries.length > 0
          ? html`<div part="layer-choices">
              ${entries.map((entry) => {
                const shown = entry.some((layer) => !layer.hidden)
                return html`<button
                  part="layer-choice"
                  aria-pressed=${shown ? 'true' : 'false'}
                  type="button"
                  @click=${() => showLayers(map, entry, !shown)}
                >
                  <svg part="layer-icon" aria-hidden="true" fill="currentColor" viewBox=${iconOf(entry[0]).viewBox}>
                    ${unsafeSVG(iconOf(entry[0]).content)}
                  </svg>
                  <span part="layer-name">${entry[0]?.label ?? ''}</span>
                </button>`
              })}
            </div>`
          : nothing
      }
    </div>`
}
