import {
  Announce,
  bare,
  cancelable,
  headless,
  number,
  oneOf,
  Path,
  Pressable,
  Repeat,
  Slot,
  Svg,
  string,
  Text,
  View,
  web,
} from '../../../render.js'

/**
 * Map's headless tier: a frame around a map, its controls, and the list that
 * names its layers.
 *
 * **On the web the frame draws no map itself.** A renderer such as MapLibre
 * or Leaflet draws in the default region, which `connectMap` from
 * `@fusion.dev/helix-map` keeps in step with the frame. **A phone draws the
 * map itself**, through the renderer capability: MapLibre Native, an
 * optional peer, in the frame's themed style from core's `mapLibreStyle`,
 * with the frame's routes, areas, points, buildings, imagery and shading as
 * its layers from core's `geoJson`, `LAYERS` and `pointsLayers`. Where the
 * app does not carry MapLibre Native, as Expo Go does not, the frame draws a
 * still picture of its own shapes from core's projection on the land's
 * color, and the markers stand on it.
 *
 * **The view opens at `view`**, a place and a zoom, or framed around every
 * place the frame holds. The zoom, rotate, tilt and pan controls move it,
 * and two fingers on MapLibre Native's map.
 *
 * **What a screen reader hears comes from core and the children, never from
 * the drawing**: the list of layers, each marker's button, the points in
 * view as buttons, and what each move did, said after it settles.
 *
 * **Web only:** the renderer the page connects and its events, the gestures
 * a page shares and their hints, fullscreen, the idle fade, clusters of
 * markers, the arrow keys, and the previews on the map-type cards.
 */
export default headless('map', {
  props: {
    activateHintLabel: web('Press the map to use it'),
    bearing: 0,
    cluster: web(false),
    controls: string(),
    controlsLabel: 'Map controls',
    controlsPlacement: oneOf(['top-start', 'top-end', 'bottom-start', 'bottom-end']),
    faceNorthLabel: 'Face north',
    fallbackLabel: 'Map',
    flatLabel: 'Looking straight down',
    fullscreenLabel: web('Fill the screen'),
    gestures: web(oneOf(['activate', 'always', 'cooperative'])),
    hybridLabel: 'Hybrid',
    idleDelay: web(0),
    label: '',
    layersLabel: 'Map layers',
    mapType: oneOf(['hybrid', 'satellite']),
    mapTypeLabel: 'Map type',
    movedDownLabel: 'Moved down',
    movedLeftLabel: 'Moved left',
    movedRightLabel: 'Moved right',
    movedUpLabel: 'Moved up',
    northLabel: 'Facing north',
    panDownLabel: 'Pan down',
    panLeftLabel: 'Pan left',
    panRightLabel: 'Pan right',
    panStep: 0.25,
    panUpLabel: 'Pan up',
    pitch: 0,
    roleLabel: 'map',
    rotateLeftLabel: 'Rotate left',
    rotateRightLabel: 'Rotate right',
    satelliteLabel: 'Satellite',
    standardLabel: 'Standard',
    tiltedLabel: '{degrees, plural, one {Tilted # degree} other {Tilted # degrees}}',
    tiltLabel: 'Show in 3D',
    turnedLabel: '{degrees, plural, one {Facing # degree} other {Facing # degrees}}',
    twoFingerHintLabel: web('Use two fingers to move the map'),
    usingLabel: web('Using the map. Press Escape to scroll the page again.'),
    view: string(),
    wheelHintLabel: web('Use {key} and scroll to zoom the map'),
    zoomedLabel: 'Zoom level {level}',
    zoomInLabel: 'Zoom in',
    zoomLevel: number(),
    zoomOutLabel: 'Zoom out',
  },
  events: {
    activate: ['value'],
    beforeChange: cancelable(['value']),
    beforeCheck: web(cancelable(['checked'])),
    change: bare(),
    check: web(['checked']),
    mapCluster: web(['key', 'labels']),
    mapPan: ['by', 'to'],
    mapPartChange: web(['kind']),
    mapReady: [],
    mapRotate: ['by', 'to'],
    mapTilt: ['by', 'to'],
    mapZoom: ['by'],
  },
  states: [
    'fullscreen',
    'idle',
    'layersOpen',
    'ready',
    'rotated',
    'settled',
    'sharing',
    'tilted',
    'using',
  ],
  map: {
    compassed: 'compassed',
    entries: 'entries',
    layered: 'layered',
    layers: 'layers',
    named: 'named',
    onActivate: 'activate',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onMapPan: 'mapPan',
    onMapReady: 'mapReady',
    onMapRotate: 'mapRotate',
    onMapTilt: 'mapTilt',
    onMapZoom: 'mapZoom',
    open: 'open',
    pans: 'pans',
    rotates: 'rotates',
    said: 'said',
    tilted: 'tilted',
    tilts: 'tilts',
    typed: 'typed',
    types: 'types',
    zooms: 'zooms',
  },
  render: ({ entry, map, props }) => (
    <View
      label={map.named}
      part="region"
      role="group"
    >
      <View part="header">
        <Slot name="header" />
      </View>
      <View part="viewport">
        {/* The map a phone draws, MapLibre Native's or the still picture,
            under the markers. The renderer's box on the web is the slot. */}
        <View
          ariaHidden
          part="drawing"
          platform="native"
        />
        <Slot />
        <View
          part="gesture-hint"
          platform="web"
        />
        <View
          part="gesture-status"
          platform="web"
        />
        {/* The controls over the map, in its box on a phone, so a bottom
            corner stands above the credit, as the web's controls take the
            map's row of the frame's grid. */}
        <View
          label={props.controlsLabel}
          part="controls"
          role="toolbar"
        >
          {map.layered && (
            <Pressable
              expanded={map.open}
              label={props.layersLabel}
              part="layers-toggle"
              role="button"
            >
              <Slot name="layers-icon">
                <View
                  ariaHidden
                  icon="stack"
                  part="layers-toggle-mark"
                  platform="native"
                />
              </Slot>
            </Pressable>
          )}
          {map.layered && (
            <View
              hidden={!map.open}
              label={props.layersLabel}
              part="layers-menu"
              role="group"
            >
              <View
                hidden={!map.typed}
                label={props.mapTypeLabel}
                part="map-types"
                role="radiogroup"
              >
                <Repeat
                  each={map.types}
                  key="key"
                  part="map-type-items"
                >
                  <Pressable
                    checked={entry.chosen}
                    data-chosen={entry.chosen}
                    label={entry.name}
                    part="map-type"
                    role="radio"
                  >
                    <View
                      ariaHidden
                      data-chosen={entry.chosen}
                      part="map-type-preview"
                    />
                    <View part="map-type-name">
                      <Text part="map-type-name-words">{entry.name}</Text>
                    </View>
                  </Pressable>
                </Repeat>
              </View>
              <View part="layer-choices">
                <Repeat
                  each={map.entries}
                  key="key"
                  part="layer-choice-items"
                >
                  <Pressable
                    data-shown={entry.shown}
                    label={entry.name}
                    part="layer-choice"
                    pressed={entry.shown}
                    role="button"
                  >
                    <View
                      ariaHidden
                      data-shown={entry.shown}
                      part="layer-icon"
                    >
                      <View
                        icon={entry.icon}
                        part="layer-icon-mark"
                        platform="native"
                      />
                    </View>
                    <View part="layer-name">
                      <Text part="layer-name-words">{entry.name}</Text>
                    </View>
                  </Pressable>
                </Repeat>
              </View>
            </View>
          )}
          {map.tilts && (
            <Pressable
              label={props.tiltLabel}
              part="tilt"
              pressed={map.tilted}
              role="button"
            >
              <Slot name="tilt-icon">
                <Text part="tilt-words">3D</Text>
              </Slot>
            </Pressable>
          )}
          {map.zooms && (
            <Pressable
              label={props.zoomInLabel}
              part="zoom-in"
              role="button"
            >
              <Slot name="zoom-in-icon">
                <View
                  ariaHidden
                  icon="plus"
                  part="zoom-in-mark"
                  platform="native"
                />
              </Slot>
            </Pressable>
          )}
          {map.zooms && (
            <Pressable
              label={props.zoomOutLabel}
              part="zoom-out"
              role="button"
            >
              <Slot name="zoom-out-icon">
                <View
                  ariaHidden
                  icon="minus"
                  part="zoom-out-mark"
                  platform="native"
                />
              </Slot>
            </Pressable>
          )}
          {map.compassed && (
            <View part="compass">
              {map.rotates && (
                <Pressable
                  label={props.rotateLeftLabel}
                  part="rotate-left"
                  role="button"
                >
                  <Slot name="rotate-left-icon">
                    <View
                      ariaHidden
                      icon="arrow-counter-clockwise"
                      part="rotate-left-mark"
                      platform="native"
                    />
                  </Slot>
                </Pressable>
              )}
              {map.pans && (
                <Pressable
                  label={props.panUpLabel}
                  part="pan-up"
                  role="button"
                >
                  <Slot name="pan-up-icon">
                    <View
                      ariaHidden
                      icon="arrow-up"
                      part="pan-up-mark"
                      platform="native"
                    />
                  </Slot>
                </Pressable>
              )}
              {map.rotates && (
                <Pressable
                  label={props.rotateRightLabel}
                  part="rotate-right"
                  role="button"
                >
                  <Slot name="rotate-right-icon">
                    <View
                      ariaHidden
                      icon="arrow-clockwise"
                      part="rotate-right-mark"
                      platform="native"
                    />
                  </Slot>
                </Pressable>
              )}
              {map.pans && (
                <Pressable
                  label={props.panLeftLabel}
                  part="pan-start"
                  role="button"
                >
                  <Slot name="pan-start-icon">
                    <View
                      ariaHidden
                      icon="arrow-left"
                      part="pan-start-mark"
                      platform="native"
                    />
                  </Slot>
                </Pressable>
              )}
              <Pressable
                label={props.faceNorthLabel}
                part="face-north"
                role="button"
              >
                <Slot name="face-north-icon">
                  <Svg
                    ariaHidden
                    part="needle"
                    viewBox="0 0 16 16"
                  >
                    <Path
                      d="M8 1.5 10.5 8h-5Z"
                      part="needle-north"
                      platform="native"
                    />
                    <Path
                      d="M8 14.5 5.5 8h5Z"
                      part="needle-south"
                      platform="native"
                    />
                  </Svg>
                </Slot>
              </Pressable>
              {map.pans && (
                <Pressable
                  label={props.panRightLabel}
                  part="pan-end"
                  role="button"
                >
                  <Slot name="pan-end-icon">
                    <View
                      ariaHidden
                      icon="arrow-right"
                      part="pan-end-mark"
                      platform="native"
                    />
                  </Slot>
                </Pressable>
              )}
              {map.pans && (
                <Pressable
                  label={props.panDownLabel}
                  part="pan-down"
                  role="button"
                >
                  <Slot name="pan-down-icon">
                    <View
                      ariaHidden
                      icon="arrow-down"
                      part="pan-down-mark"
                      platform="native"
                    />
                  </Slot>
                </Pressable>
              )}
            </View>
          )}
          {/* The web's fullscreen control, and the parts each web control's
              Icon Button exports. */}
          <Pressable
            also={{
              'face-north-button': true,
              'face-north-live': true,
              'face-north-spinner': true,
              'face-north-text': true,
              'fullscreen-button': true,
              'fullscreen-live': true,
              'fullscreen-spinner': true,
              'fullscreen-text': true,
              'layers-toggle-button': true,
              'layers-toggle-live': true,
              'layers-toggle-spinner': true,
              'layers-toggle-text': true,
              'pan-down-button': true,
              'pan-down-live': true,
              'pan-down-spinner': true,
              'pan-down-text': true,
              'pan-end-button': true,
              'pan-end-live': true,
              'pan-end-spinner': true,
              'pan-end-text': true,
              'pan-start-button': true,
              'pan-start-live': true,
              'pan-start-spinner': true,
              'pan-start-text': true,
              'pan-up-button': true,
              'pan-up-live': true,
              'pan-up-spinner': true,
              'pan-up-text': true,
              'rotate-left-button': true,
              'rotate-left-live': true,
              'rotate-left-spinner': true,
              'rotate-left-text': true,
              'rotate-right-button': true,
              'rotate-right-live': true,
              'rotate-right-spinner': true,
              'rotate-right-text': true,
              'tilt-button': true,
              'tilt-live': true,
              'tilt-spinner': true,
              'tilt-text': true,
              'zoom-in-button': true,
              'zoom-in-live': true,
              'zoom-in-spinner': true,
              'zoom-in-text': true,
              'zoom-out-button': true,
              'zoom-out-live': true,
              'zoom-out-spinner': true,
              'zoom-out-text': true,
            }}
            part="fullscreen"
            platform="web"
            role="button"
          >
            <Slot name="fullscreen-icon" />
          </Pressable>
          {/* The parts each web control's Tooltip exports. */}
          <View
            also={{
              'tooltip-arrow-bottom': true,
              'tooltip-arrow-left': true,
              'tooltip-arrow-right': true,
              'tooltip-arrow-top': true,
            }}
            part="tooltip-arrow"
            platform="web"
          />
          <View
            also={{
              'tooltip-surface-bottom': true,
              'tooltip-surface-left': true,
              'tooltip-surface-right': true,
              'tooltip-surface-top': true,
            }}
            part="tooltip-surface"
            platform="web"
          />
        </View>
      </View>
      <View
        label={props.layersLabel}
        part="layers"
        role="list"
      >
        <Repeat
          each={map.layers}
          key="key"
          part="layer-items"
        >
          <View
            part="layer"
            role="listitem"
          >
            <Text part="layer-words">{entry.text}</Text>
          </View>
        </Repeat>
      </View>
      <View part="footer">
        <Slot name="footer" />
      </View>
      <View part="attribution">
        <Slot name="attribution" />
      </View>
      <Announce
        follows={map.said}
        part="live"
      >
        {map.said}
      </Announce>
    </View>
  ),
})
