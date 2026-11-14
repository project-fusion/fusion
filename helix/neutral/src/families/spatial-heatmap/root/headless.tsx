import {
  Announce,
  bare,
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
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Spatial Heatmap's headless tier: Heatmap's strip of readings drawn as a
 * relief, each reading a prism as tall as its value, on a slab, seen from
 * above at an angle.
 *
 * **Core draws it, on a phone as on the web.** Core reads the readings, their
 * tones, and how many whole columns fit as for Heatmap, and `reliefOf` lays
 * each prism's faces, the slab, and the order to paint them from the camera.
 * A phone draws them in react-native-svg, each face's colors worked out in
 * its machine.
 *
 * **The strip is read as Heatmap's is**: the arrows walk a reading down and a
 * column across, a tap shows the prism under it and presses it, a screen
 * reader adjusts the strip as one control, and `selection-mode` selects. A
 * drag turns the view, and so does Shift with an arrow, but under
 * `selection-mode="multiple"`, where it selects. The bubble is a Tooltip over
 * the reading's top face. The first and last labels stand under their ends
 * of the front edge, where core's `labelPlaces` puts them.
 *
 * **Web only:** the grid's row and cell roles under `selection-mode`, a
 * reading shown under a mouse, the renderer the `renderer` region holds, the
 * hidden table drawn from `data`, the Listen button, `gap`, and `min-cell`.
 */
export default headless('spatial-heatmap', {
  props: {
    busiestLabel: 'Busiest',
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    emptyText: 'No readings',
    errorText: '',
    flat: false,
    for: '',
    gap: web(number()),
    label: '',
    loading: false,
    loadingText: 'Loading readings',
    locale: '',
    minCell: web(number()),
    nextReadingsLabel: web('Next readings'),
    overviewLabel: '{busiestLabel}: {busiest}; {totalLabel} {total}.',
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    relief: 2,
    rows: 1,
    selectedLabel: web('selected'),
    selectionLabel: '{count, plural, one {# selected} other {# selected}}',
    selectionMode: oneOf(['multiple', 'single']),
    selectionShape: oneOf(['linear', 'rectangle']),
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    stripLabel: 'Heatmap',
    summary: web(oneOf(['hidden', 'visible'])),
    thresholds: '',
    tones: '',
    totalLabel: 'Total',
    value: '',
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    plotChange: web(['kind']),
    plotTurn: web(['across', 'up']),
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
    resize: ['size'],
  },
  states: ['active', 'drawn', 'empty', 'error', 'loading', 'settled'],
  heatmap: {
    base: 'base',
    cells: 'cells',
    drawn: 'drawn',
    empty: 'empty',
    endX: 'endX',
    endY: 'endY',
    error: 'error',
    footed: 'footed',
    live: 'live',
    loading: 'loading',
    markX: 'markX',
    markY: 'markY',
    named: 'named',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onReadingChange: 'readingChange',
    onReadingPress: 'readingPress',
    onResize: 'resize',
    overview: 'overview',
    placement: 'placement',
    role: 'role',
    selection: 'selection',
    startX: 'startX',
    startY: 'startY',
    tipCells: 'tipCells',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
    viewBox: 'viewBox',
  },
  render: ({ entry, heatmap, props }) => (
    <>
      <View
        also={{ plot: true }}
        label={heatmap.named}
        part="strip"
        role={heatmap.role}
      >
        {/* The renderer's box, which a 3D drawing is made in on the web. */}
        <Slot
          name="renderer"
          platform="web"
        />
        {heatmap.drawn && (
          <Svg
            ariaHidden
            part="drawing"
            viewBox={heatmap.viewBox}
          >
            {/* The slab first, so every prism stands on it. */}
            <Repeat
              each={heatmap.base}
              key="key"
              part="slab"
            >
              <Path
                d={entry.left}
                part="base-left"
                style={{
                  '--spatial-heatmap-fill': entry.leftFill,
                  '--spatial-heatmap-stroke': entry.leftStroke,
                }}
              />
              <Path
                d={entry.right}
                part="base-right"
                style={{
                  '--spatial-heatmap-fill': entry.rightFill,
                  '--spatial-heatmap-stroke': entry.rightStroke,
                }}
              />
              <Path
                d={entry.top}
                part="base-top"
                style={{
                  '--spatial-heatmap-fill': entry.topFill,
                  '--spatial-heatmap-stroke': entry.topStroke,
                }}
              />
            </Repeat>
            {/* Each prism back to front, its sides lighter first, then its top;
                the reading's and a selected one's edges thicker where they stand. */}
            <Repeat
              each={heatmap.cells}
              key="key"
              part="prisms"
            >
              <Path
                d={entry.left}
                part="left-face"
                style={{
                  '--spatial-heatmap-dash': entry.dash,
                  '--spatial-heatmap-fill': entry.leftFill,
                  '--spatial-heatmap-stroke': entry.leftStroke,
                  '--spatial-heatmap-width': entry.width,
                }}
              />
              <Path
                d={entry.right}
                part="right-face"
                style={{
                  '--spatial-heatmap-dash': entry.dash,
                  '--spatial-heatmap-fill': entry.rightFill,
                  '--spatial-heatmap-stroke': entry.rightStroke,
                  '--spatial-heatmap-width': entry.width,
                }}
              />
              <Path
                d={entry.top}
                part="top-face"
                style={{
                  '--spatial-heatmap-dash': entry.dash,
                  '--spatial-heatmap-fill': entry.topFill,
                  '--spatial-heatmap-stroke': entry.topStroke,
                  '--spatial-heatmap-width': entry.width,
                }}
              />
            </Repeat>
          </Svg>
        )}
        {/* The web's groups: the slab's, and the column of grid cells a
            grid reads as a row under `selection-mode`. */}
        <View
          part="base"
          platform="web"
        />
        <Repeat
          each={heatmap.cells}
          key="key"
          part="cells"
        >
          {/* The web's group of a prism's faces, in its tone. */}
          <View
            also={{ 'cell-active': entry.active, 'cell-selected': entry.selected }}
            data-tone={entry.tone}
            part="cell"
            platform="web"
          />
        </Repeat>
        <View
          part="row"
          platform="web"
        />
        {/* The bubble, a Tooltip hung on a mark over the reading's top face. */}
        <Wrap
          draws="tooltip"
          exports={{
            arrow: 'native',
            'arrow-bottom': 'native',
            'arrow-left': 'native',
            'arrow-right': 'native',
            'arrow-top': 'native',
            surface: 'native',
            'surface-bottom': 'native',
            'surface-left': 'native',
            'surface-right': 'native',
            'surface-top': 'native',
            trigger: 'native',
          }}
          gives={{ open: heatmap.tipped, persist: true, placement: heatmap.placement }}
          part="tooltip"
          platform="native"
          when={heatmap.tipped}
        >
          <View
            ariaHidden
            part="mark"
          />
          <Wrap
            into="content"
            part="tooltip-content"
            platform="native"
          >
            <View part="tooltip-label">
              <Text part="tooltip-label-words">{heatmap.tipLabel}</Text>
            </View>
            <Repeat
              each={heatmap.tipCells}
              key="key"
              part="tooltip-cells"
            >
              <View
                also={{ 'tooltip-cell-current': entry.current }}
                part="tooltip-cell"
              >
                <View part="tooltip-name">
                  <Text part="tooltip-name-words">{entry.name}</Text>
                </View>
                <View part="tooltip-value">
                  <Text part="tooltip-value-words">{entry.text}</Text>
                </View>
              </View>
            </Repeat>
          </Wrap>
        </Wrap>
        {/* The web's bubble, a `Tooltip` whose parts its `drawTooltip` names
            `tooltip-*`, which a phone's names as the parts of `tooltip`. */}
        <View
          part="tooltip-anchor"
          platform="web"
        >
          <View
            also={{
              'tooltip-arrow-bottom': true,
              'tooltip-arrow-left': true,
              'tooltip-arrow-right': true,
              'tooltip-arrow-top': true,
            }}
            part="tooltip-arrow"
          />
          <View
            also={{
              'tooltip-surface-bottom': true,
              'tooltip-surface-left': true,
              'tooltip-surface-right': true,
              'tooltip-surface-top': true,
            }}
            part="tooltip-surface"
          />
        </View>
        <Announce
          follows={heatmap.live}
          part="live"
        >
          {heatmap.live}
        </Announce>
      </View>
      {heatmap.error && (
        <View
          part="error"
          role="alert"
        >
          <Text part="error-words">{props.errorText}</Text>
          <Slot name="error" />
        </View>
      )}
      {heatmap.loading && (
        <View part="loading">
          <Slot name="loading">
            <Text part="loading-words">{props.loadingText}</Text>
          </Slot>
        </View>
      )}
      {heatmap.empty && (
        <View part="empty">
          <Slot name="empty">
            <Text part="empty-words">{props.emptyText}</Text>
          </Slot>
        </View>
      )}
      {/* The three slots under the strip: the first and last labels at the
          ends of the front edge, where core places them, and the summary in
          the middle. */}
      {heatmap.footed && (
        <View part="footer">
          <View
            part="start"
            style={{
              '--spatial-heatmap-label-x': heatmap.startX,
              '--spatial-heatmap-label-y': heatmap.startY,
            }}
          >
            <Slot name="start" />
          </View>
          <View part="summary">
            <Slot name="summary" />
          </View>
          <View
            part="end"
            style={{
              '--spatial-heatmap-label-x': heatmap.endX,
              '--spatial-heatmap-label-y': heatmap.endY,
            }}
          >
            <Slot name="end" />
          </View>
        </View>
      )}
      {/* What the strip holds, in a sentence, which describes it. */}
      <View
        part="overview"
        platform="web"
      >
        <Text part="overview-words">{heatmap.overview}</Text>
      </View>
      <Announce
        follows={heatmap.selection}
        part="selection"
      >
        {heatmap.selection}
      </Announce>
      {/* What is passed in, as the table a phone reads by its id, hidden from sight and still read. */}
      <Slot platform="native" />
      <Pressable
        part="sonify"
        platform="web"
        role="button"
      />
      <View
        part="table"
        platform="web"
      />
      <View
        part="table-pages"
        platform="web"
      />
    </>
  ),
})
