import {
  Announce,
  callback,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Path,
  Pressable,
  property,
  Repeat,
  Slot,
  Svg,
  string,
  Text,
  TextInput,
  View,
  web,
} from '../../../render.js'

/**
 * Graph's headless tier: a frame around a graph of notes, and the list that
 * makes it readable.
 *
 * **On the web the frame draws no graph itself.** A renderer such as Sigma.js
 * or cosmos.gl draws in the default region, which `connectGraph` from
 * `@fusion.dev/helix-graph` keeps in step with the frame, and the frame asks
 * it to pan and zoom. **A phone draws the graph itself**, in react-native-svg
 * from core's `graphPicture`, the picture `graphSnapshot` paints before a
 * renderer loads: each note at its `x` and `y`, or where core's
 * `seedPositions` starts one, its size and its group's or tone's color, the
 * links tinted by the note they leave, and the names placed clear of each
 * other. Two fingers pinch it and one drags it, through the pan and pinch
 * driver, and the zoom controls zoom it.
 *
 * **The list is the graph for a screen reader**, on both platforms: the
 * selected note first, then the notes it links to and from, then every other
 * note, which the search field narrows, from core's `entriesOf`. A press on a
 * row or on a note in the drawing selects it. The legend shows or hides each
 * group's notes.
 *
 * **Web only:** the renderer and the events it hears (`graph-layout`,
 * `graph-pan`, `graph-zoom`, `graph-part-change`, `graph-ready`,
 * `graph-signal`), the layout's settling and its stop button, the gestures a
 * page shares, fullscreen, the walk along the links with Alt and an arrow,
 * and `noteContent`.
 */
export default headless('graph', {
  props: {
    activateHintLabel: web('Press the graph to use it'),
    active: string(),
    controls: string(),
    controlsLabel: 'Graph controls',
    controlsPlacement: oneOf(['top-start', 'top-end', 'bottom-start', 'bottom-end']),
    countLabel: '{count, plural, one {# note} other {# notes}}',
    defaultActive: '',
    depth: number(),
    /* The old name of `empty-text`, the web's for one release. */
    emptyLabel: web(string()),
    emptyText: 'No notes',
    fallbackLabel: 'Graph',
    fullscreenLabel: web('Fill the screen'),
    gestures: web(oneOf(['activate', 'always', 'cooperative'])),
    hiddenGroups: property(object()),
    idleDelay: web(0),
    label: '',
    legend: false,
    legendLabel: 'Groups',
    linkCountLabel: web('{note}. {count, plural, =0 {No links} one {# link} other {# links}}'),
    linkedBothLabel: 'Linked both ways with {note}',
    linkedFromLabel: 'Linked from {note}',
    links: property(object()),
    linksToLabel: 'Links to {note}',
    loading: false,
    /* The old name of `loading-text`, the web's for one release. */
    loadingLabel: web(string()),
    loadingText: 'Loading notes',
    movedDownLabel: web('Moved down'),
    movedLeftLabel: web('Moved left'),
    movedRightLabel: web('Moved right'),
    movedUpLabel: web('Moved up'),
    nodes: property(object()),
    noPanel: false,
    noteContent: web(callback('(node: GraphNode) => unknown')),
    notesLabel: 'Notes',
    panDownLabel: 'Pan down',
    panLeftLabel: 'Pan left',
    panRightLabel: 'Pan right',
    panStep: 0.25,
    panUpLabel: 'Pan up',
    roleLabel: 'graph',
    searchLabel: 'Find a note',
    selectedLabel: 'Selected',
    selectionLabel: '{note}, selected. {count}',
    settlingLabel: web('Placing the notes'),
    stopLayoutLabel: web('Stop the layout'),
    twoFingerHintLabel: web('Use two fingers to move the graph'),
    usingLabel: web('Using the graph. Press Escape to scroll the page again.'),
    walkLabel: web('{note}. {relation}. {index} of {count}'),
    wheelHintLabel: web('Use {key} and scroll to zoom the graph'),
    zoomedInLabel: 'Zoomed in',
    zoomedOutLabel: 'Zoomed out',
    zoomInLabel: 'Zoom in',
    zoomOutLabel: 'Zoom out',
  },
  events: {
    activate: ['value'],
    beforeActivate: cancelable(['value']),
    beforeGraphFilter: cancelable(['hidden']),
    graphFilter: ['hidden'],
    graphLayout: web(['positions']),
    graphPan: web(['by', 'to']),
    graphPartChange: web(['kind']),
    graphReady: web([]),
    graphSignal: web(['from', 'to', 'tone']),
    graphZoom: web(['by']),
  },
  states: [
    'empty',
    'fullscreen',
    'idle',
    'loading',
    'local',
    'panelOpen',
    'ready',
    'searching',
    'selected',
    'settled',
    'settling',
    'settlingUnseen',
    'sharing',
    'using',
  ],
  graph: {
    count: 'count',
    drawn: 'drawn',
    groups: 'groups',
    legended: 'legended',
    lines: 'lines',
    marks: 'marks',
    named: 'named',
    names: 'names',
    notes: 'notes',
    onActivate: 'activate',
    onBeforeActivate: 'beforeActivate',
    onBeforeGraphFilter: 'beforeGraphFilter',
    onGraphFilter: 'graphFilter',
    panelHidden: 'panelHidden',
    pans: 'pans',
    regions: 'regions',
    said: 'said',
    toggles: 'toggles',
    viewBox: 'viewBox',
    zooms: 'zooms',
  },
  render: ({ entry, graph, props, state }) => (
    <View
      label={graph.named}
      part="region"
      role="group"
    >
      <View part="header">
        <Slot name="header" />
      </View>
      <View part="body">
        <View part="stage">
          <View part="viewport">
            {/* The renderer's box on the web. A phone draws the picture here. */}
            <Slot />
            {graph.drawn && (
              <View
                ariaHidden
                part="drawing-box"
                platform="native"
              >
                <Svg
                  part="drawing"
                  viewBox={graph.viewBox}
                >
                  <Repeat
                    each={graph.lines}
                    key="key"
                    part="links"
                  >
                    <Path
                      d={entry.d}
                      part="link"
                      style={{ '--graph-ink': entry.ink, '--graph-line': entry.width }}
                    />
                  </Repeat>
                  {/* Each note's glow, its body, and its band, in the order
                      core paints them, the selected one last. */}
                  <Repeat
                    each={graph.marks}
                    key="key"
                    part="marks"
                  >
                    <Path
                      d={entry.d}
                      part="mark"
                      style={{
                        '--graph-fill': entry.fill,
                        '--graph-fill-opacity': entry.fillOpacity,
                        '--graph-ink': entry.stroke,
                        '--graph-line': entry.width,
                      }}
                    />
                  </Repeat>
                </Svg>
                {/* The groups' and the notes' names, words over the drawing at
                    the places core gives them. */}
                <Repeat
                  each={graph.regions}
                  key="key"
                  part="regions"
                >
                  <View
                    part="region-name"
                    style={{
                      '--graph-label-fade': entry.fade,
                      '--graph-label-ink': entry.ink,
                      '--graph-label-x': entry.x,
                      '--graph-label-y': entry.y,
                    }}
                  >
                    <Text part="region-name-words">{entry.text}</Text>
                  </View>
                </Repeat>
                <Repeat
                  each={graph.names}
                  key="key"
                  part="names"
                >
                  <View
                    also={{ 'note-label-strong': entry.strong }}
                    part="note-label"
                    style={{
                      '--graph-label-ink': entry.ink,
                      '--graph-label-x': entry.x,
                      '--graph-label-y': entry.y,
                    }}
                  >
                    <Text part="note-label-words">{entry.text}</Text>
                  </View>
                </Repeat>
              </View>
            )}
            <View
              part="gesture-hint"
              platform="web"
            />
            <View
              part="gesture-status"
              platform="web"
            />
            <View
              part="settling"
              platform="web"
            />
            <Pressable
              part="stop-layout"
              platform="web"
              role="button"
            />
          </View>
          <View
            label={props.controlsLabel}
            part="controls"
            role="toolbar"
          >
            {graph.pans && (
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
            {graph.pans && (
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
            {graph.pans && (
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
            {graph.pans && (
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
            {graph.zooms && (
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
            {graph.zooms && (
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
            {graph.toggles && (
              <Pressable
                expanded={!graph.panelHidden}
                label={props.notesLabel}
                part="notes-toggle"
                role="button"
              >
                <View
                  ariaHidden
                  icon="list"
                  part="notes-toggle-mark"
                  platform="native"
                />
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
                'notes-toggle-button': true,
                'notes-toggle-live': true,
                'notes-toggle-spinner': true,
                'notes-toggle-text': true,
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
          {graph.legended && (
            <View
              label={props.legendLabel}
              part="legend"
              role="toolbar"
            >
              <Repeat
                each={graph.groups}
                key="key"
                part="legend-items"
              >
                <Pressable
                  also={{ 'legend-item-hidden': entry.hidden }}
                  data-tone={entry.tone}
                  label={entry.name}
                  part="legend-item"
                  pressed={entry.shown}
                  role="button"
                >
                  <View
                    ariaHidden
                    part="legend-swatch"
                    style={{ '--graph-swatch': entry.swatch, '--graph-swatch-fill': entry.fill }}
                  />
                  <Text part="legend-item-words">{entry.name}</Text>
                </Pressable>
              </Repeat>
            </View>
          )}
        </View>
        <View
          hidden={graph.panelHidden}
          part="panel"
        >
          <View part="search">
            <View
              ariaHidden
              part="filter-icon"
            >
              <Slot name="filter-icon">
                <View
                  icon="magnifying-glass"
                  part="filter-mark"
                />
              </Slot>
            </View>
            <TextInput
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              label={props.searchLabel}
              part="search-field"
              placeholder={props.searchLabel}
            />
            <View
              ariaHidden
              part="count"
            >
              <Text part="count-words">{graph.count}</Text>
            </View>
          </View>
          <View
            busy={props.loading}
            label={props.notesLabel}
            part="list"
            role="listbox"
          >
            <View
              part="before"
              platform="web"
            />
            <Repeat
              each={graph.notes}
              key="key"
              part="notes"
              windowed
            >
              <Pressable
                also={{
                  'note-cursor': entry.cursor,
                  'note-linked': entry.linked,
                  'note-selected': entry.selected,
                }}
                description={entry.relation}
                label={entry.name}
                part="note"
                role="option"
                selected={entry.selected}
              >
                <View
                  data-selected={entry.selected}
                  part="note-name"
                >
                  <Text part="note-name-words">{entry.name}</Text>
                </View>
                <View
                  ariaHidden
                  hidden={entry.unrelated}
                  part="note-relation"
                >
                  <Text part="note-relation-words">{entry.relation}</Text>
                </View>
              </Pressable>
            </Repeat>
            <View
              part="after"
              platform="web"
            />
          </View>
          {state.empty && props.loading && (
            <View part="loading">
              <Slot name="loading">
                <Text part="loading-words">{props.loadingText}</Text>
              </Slot>
            </View>
          )}
          {state.empty && !props.loading && (
            <View part="empty">
              <Slot name="empty">
                <Text part="empty-words">{props.emptyText}</Text>
              </Slot>
            </View>
          )}
        </View>
      </View>
      <View part="footer">
        <Slot name="footer" />
      </View>
      <Announce
        follows={graph.said}
        part="live"
      >
        {graph.said}
      </Announce>
    </View>
  ),
})
