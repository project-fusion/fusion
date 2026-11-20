import {
  Announce,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Path,
  Pressable,
  Rect,
  Repeat,
  Slot,
  Svg,
  string,
  Text,
  View,
  web,
} from '../../../render.js'

/**
 * Canvas's headless tier: a board of cards placed where somebody put them,
 * the connections between them, and the frame that pans and zooms it.
 *
 * **The cards are the board's children**, each a Canvas Node, and the
 * connections Canvas Edges, which draw nothing themselves: the board reads
 * them, draws each connection along the line core's `connector` gives, with
 * its arrowheads and its label, and places each card on the plane. A pinch
 * zooms the board, from a tenth to eight times, one finger moves it, and the
 * zoom controls zoom it by a quarter. The board opens fitted, never larger
 * than its own size and never smaller than core's `FIT_MIN`. `grid` rules
 * the plane in lines or dots that move and scale with it. The minimap shows
 * every card and the part on screen, and a press on it brings that place to
 * the middle.
 *
 * **A screen reader walks the board as the arrows do**: each card in core's
 * reading order, then the connections leaving it, each one named for the
 * two cards it joins. A phone gives each connection a view of its own over
 * its middle, since a line in a vector is no element a screen reader can
 * reach. A press on a card or a connection selects it, asking first with
 * `before-select`.
 *
 * **A phone's board is read-only.** Moving, resizing, connecting,
 * reconnecting, relabeling, removing, copying and pasting cards, the arrow
 * keys and the keyboard's shortcuts, undo, the marquee, the gestures a page
 * shares, fullscreen, `edgeRoute`, and `view` are the web's, as are the
 * events they send.
 */
export default headless('canvas', {
  props: {
    activateHintLabel: web('Press the board to use it'),
    arrangedLabel: web('Cards arranged'),
    comesFromLabel: 'from {cards}',
    connectedLabel: web('Asked to connect {from} to {to}.'),
    connectingLabel: web(
      'Connecting from {from}. Move to another card and press Enter, or Escape to stop.',
    ),
    connectionLabel: 'From {from} to {to}',
    controls: string(),
    controlsLabel: 'Board controls',
    controlsPlacement: oneOf(['top-start', 'top-end', 'bottom-start', 'bottom-end']),
    copiedLabel: web('{count, plural, one {# card copied} other {# cards copied}}'),
    fallbackLabel: 'Canvas',
    fullscreenLabel: web('Fill the screen'),
    gestures: web(oneOf(['activate', 'always', 'cooperative'])),
    idleDelay: web(0),
    label: '',
    labelEditorLabel: web('Label for {name}'),
    leadsToLabel: 'leads to {cards}',
    linkedLabel: '{leadsTo}; {comesFrom}',
    loading: false,
    movedLabel: web('{name} moved to {x}, {y}'),
    order: oneOf(['edges', 'spatial']),
    panDownLabel: 'Pan down',
    panLeftLabel: 'Pan left',
    panRightLabel: 'Pan right',
    panStep: 0.25,
    panUpLabel: 'Pan up',
    pastedLabel: web('{count, plural, one {# card pasted} other {# cards pasted}}'),
    path: oneOf(['step', 'straight']),
    readonly: false,
    reconnectingLabel: web(
      'Moving the end of the connection from {from} to {to}. Move to a card and press Enter, or Escape to stop.',
    ),
    redoneLabel: web('Move made again'),
    removedLabel: web(
      '{count, plural, one {Asked to remove {name}.} other {Asked to remove # items.}}',
    ),
    resizedLabel: web('{name} resized to {width} by {height}'),
    roleLabel: web('canvas'),
    selected: '',
    selectedLabel: 'selected',
    selectionLabel: web('{count} selected'),
    snap: web(number()),
    stoppedLabel: web('Stopped connecting.'),
    toneLabels: object(),
    twoFingerHintLabel: web('Use two fingers to move the board'),
    undoneLabel: web('Move undone'),
    usingLabel: web('Using the board. Press Escape to scroll the page again.'),
    wheelHintLabel: web('Use {key} and scroll to zoom the board'),
    zoomedLabel: 'Zoom {zoom}',
    zoomInLabel: 'Zoom in',
    zoomOutLabel: 'Zoom out',
  },
  events: {
    beforeMove: web(cancelable(['nodes'])),
    beforePaste: web(cancelable(['document'])),
    beforeReconnect: web(cancelable(['from', 'fromSide', 'name', 'to', 'toSide', 'was'])),
    beforeRelabel: web(cancelable(['from', 'label', 'name', 'target', 'to', 'was'])),
    beforeSelect: cancelable(['value']),
    canvasEdit: web(['name']),
    canvasPan: ['by', 'to'],
    canvasView: ['x', 'y', 'zoom'],
    canvasZoom: ['by'],
    connect: web(['from', 'fromSide', 'to', 'toSide']),
    move: web(['nodes']),
    pasted: web(['document']),
    reconnect: web(['from', 'fromSide', 'name', 'to', 'toSide', 'was']),
    relabel: web(['from', 'label', 'name', 'target', 'to', 'was']),
    remove: web(['edges', 'nodes']),
    select: ['value'],
  },
  states: [
    'connecting',
    'direct',
    'empty',
    'fullscreen',
    'holding',
    'idle',
    'loading',
    'pressing',
    'settled',
    'sharing',
    'using',
  ],
  canvas: {
    drafting: 'drafting',
    labels: 'labels',
    lines: 'lines',
    minimapFrame: 'minimapFrame',
    minimapNodes: 'minimapNodes',
    minimapped: 'minimapped',
    minimapView: 'minimapView',
    named: 'named',
    onBeforeSelect: 'beforeSelect',
    onCanvasPan: 'canvasPan',
    onCanvasView: 'canvasView',
    onCanvasZoom: 'canvasZoom',
    onSelect: 'select',
    pans: 'pans',
    ruled: 'ruled',
    said: 'said',
    viewBox: 'viewBox',
    zooms: 'zooms',
  },
  render: ({ canvas, entry, props }) => (
    <View
      busy={props.loading}
      label={canvas.named}
      part="region"
      role="group"
    >
      <View part="header">
        <Slot name="header" />
      </View>
      <View part="viewport">
        {/* A phone's ruling, which the board draws in step with the plane.
            The web draws it as the viewport's background. */}
        {canvas.ruled && (
          <View
            ariaHidden
            part="ruling"
            platform="native"
          />
        )}
        <View part="board">
          {/* The web's layer of the arrowhead and the connection being
              drawn, and the paths each card's connections draw there. */}
          {canvas.drafting && (
            <Svg
              ariaHidden
              part="edges"
              viewBox={canvas.viewBox}
            >
              <Path
                d="M0 0"
                part="arrow"
              />
              <Path
                d="M0 0"
                part="draft"
              />
              <Path
                d="M0 0"
                part="edge-target"
              />
              <Path
                d="M0 0"
                part="edge"
              />
            </Svg>
          )}
          {/* A phone's connections, each in a box of its own around its
              line, its path drawn in the box's hundredths: the target the
              web's press and focus land on, the line, and its arrowheads. */}
          <Repeat
            each={canvas.lines}
            key="key"
            part="lines"
          >
            <View
              part="line"
              platform="native"
              style={{
                '--_canvas-line-block-size': entry.height,
                '--_canvas-line-inline-size': entry.width,
                '--_canvas-line-x': entry.x,
                '--_canvas-line-y': entry.y,
              }}
            >
              <Svg
                ariaHidden
                part="edges"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <Path
                  d={entry.d}
                  part="edge-target"
                />
                <Path
                  d={entry.d}
                  data-selected={entry.selected}
                  data-stroke={entry.stroke}
                  data-tone={entry.tone}
                  part="edge"
                  style={{ '--_canvas-edge-color': entry.color }}
                />
                <Path
                  d={entry.head}
                  data-selected={entry.selected}
                  data-tone={entry.tone}
                  part="arrow"
                  style={{ '--_canvas-edge-color': entry.color }}
                />
              </Svg>
            </View>
          </Repeat>
          <Repeat
            each={canvas.labels}
            key="key"
            part="labels"
          >
            <View
              ariaHidden
              part="label"
              style={{ '--_canvas-label-x': entry.x, '--_canvas-label-y': entry.y }}
            >
              <Text part="label-words">{entry.text}</Text>
            </View>
          </Repeat>
          {/* The cards, in the order a screen reader walks them, each
              connection's view after the card it leaves on a phone. */}
          <Slot />
          {/* The web's editing: the ends of a selected connection, the field
              a label is edited in, and the box a Shift-drag draws. */}
          <View
            part="edge-end"
            platform="web"
          />
          <View
            part="label-editor"
            platform="web"
          />
          <View
            part="marquee"
            platform="web"
          />
        </View>
        <Slot name="empty" />
        {props.loading && <Slot name="loading" />}
        <View
          part="gesture-hint"
          platform="web"
        />
        <View
          part="gesture-status"
          platform="web"
        />
      </View>
      <View
        label={props.controlsLabel}
        part="controls"
        role="toolbar"
      >
        {canvas.pans && (
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
        {canvas.pans && (
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
        {canvas.pans && (
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
        {canvas.pans && (
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
        {canvas.zooms && (
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
        {canvas.zooms && (
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
        {/* The web's fullscreen control, and the parts each web control's
            Icon Button exports. */}
        <Pressable
          also={{
            'fullscreen-button': true,
            'fullscreen-live': true,
            'fullscreen-spinner': true,
            'fullscreen-text': true,
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
      {/* A picture for a finger, hidden from a screen reader: every card,
          and a frame around what is on screen. */}
      {canvas.minimapped && (
        <Svg
          ariaHidden
          part="minimap"
          viewBox={canvas.minimapView}
        >
          <Repeat
            each={canvas.minimapNodes}
            key="key"
            part="minimap-nodes"
          >
            <Rect
              data-group={entry.group}
              height={entry.height}
              part="minimap-node"
              width={entry.width}
              x={entry.x}
              y={entry.y}
            />
          </Repeat>
          <Repeat
            each={canvas.minimapFrame}
            key="key"
            part="minimap-frame"
          >
            <Rect
              height={entry.height}
              part="minimap-view"
              width={entry.width}
              x={entry.x}
              y={entry.y}
            />
          </Repeat>
        </Svg>
      )}
      <Announce
        follows={canvas.said}
        part="live"
      >
        {canvas.said}
      </Announce>
      <View part="footer">
        <Slot name="footer" />
      </View>
    </View>
  ),
})
