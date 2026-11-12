import {
  Announce,
  headless,
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
 * Spatial Scatter Chart's headless tier: each row a point in three
 * dimensions, across, up, and in depth, in a box seen from a camera that
 * turns and tilts. **Core draws it, on a phone as on the web.** Core's
 * `fieldOf` reads the table a `for` names, or `data`, as points and axes, and
 * `boxView` lays the box, its grid at the ticks, and its numbers and names
 * along the edges that face the reader, so a reading stands at one place in
 * either drawing. A phone draws it in react-native-svg, each point painted
 * back to front, its numbers and names as words over the drawing.
 *
 * **The plot is read**: by the arrow keys on the web and a hardware keyboard,
 * and on a phone by a tap on the point nearest it and as one adjustable
 * control. A drag across the drawing turns the view, and Shift with an arrow
 * does too. The bubble is a Tooltip over the point, with its row. With
 * nothing to draw it says so, as the other charts do.
 *
 * **Web only:** the renderer the default region holds, which `helix-plot`'s
 * three.js driver draws in, the hidden table drawn from `data`, the summary
 * sentence, and the Listen button `sonify` draws.
 */
export default headless('spatial-scatter-chart', {
  props: {
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    dropLines: false,
    emptyText: 'No readings',
    errorText: '',
    for: '',
    groupBy: '',
    label: '',
    loading: false,
    loadingText: 'Loading readings',
    locale: '',
    nextReadingsLabel: web('Next readings'),
    noBox: false,
    plotLabel: '3D scatter chart',
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    summary: web(oneOf(['hidden', 'visible'])),
    summaryLabel: web(
      '{count, plural, one {# point} other {# points}}: {x} across, {y} up, and {z} in depth.',
    ),
  },
  events: {
    plotChange: web(['kind']),
    plotTurn: web(['across', 'up']),
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
  },
  states: ['active', 'drawn', 'empty', 'error', 'loading', 'settled'],
  spatialChart: {
    cells: 'cells',
    drawn: 'drawn',
    empty: 'empty',
    error: 'error',
    grid: 'grid',
    live: 'live',
    loading: 'loading',
    markX: 'markX',
    markY: 'markY',
    marks: 'marks',
    named: 'named',
    names: 'names',
    onReadingChange: 'readingChange',
    onReadingPress: 'readingPress',
    placement: 'placement',
    ring: 'ring',
    role: 'role',
    ticks: 'ticks',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
    viewBox: 'viewBox',
  },
  render: ({ entry, spatialChart, props }) => (
    <>
      <View
        label={spatialChart.named}
        part="plot"
        role={spatialChart.role}
      >
        {/* The renderer's box, which the 3D drawing is made in on the web. */}
        <Slot />
        {spatialChart.drawn && (
          <View
            ariaHidden
            part="fallback"
          >
            {/* The box's grid, then each point back to front, its line down
                to the floor before it, then the ring on the reading. */}
            <Svg
              part="drawing"
              viewBox={spatialChart.viewBox}
            >
              <Path
                d={spatialChart.grid}
                part="grid"
              />
              <Repeat
                each={spatialChart.marks}
                key="key"
                part="marks"
              >
                <Path
                  d={entry.line}
                  part="drop-line"
                  style={{ '--chart-series': entry.color }}
                />
                <Path
                  also={{ 'point-active': entry.current }}
                  d={entry.d}
                  part="point"
                  style={{ '--chart-series': entry.color }}
                />
              </Repeat>
              <Path
                d={spatialChart.ring}
                part="ring"
              />
            </Svg>
            {/* A phone's numbers and names, words over the drawing at the
                places core gives them, where the web writes them in it. */}
            <Repeat
              each={spatialChart.ticks}
              key="key"
              part="ticks"
            >
              <View
                part="tick"
                platform="native"
                style={{ '--spatial-label-x': entry.x, '--spatial-label-y': entry.y }}
              >
                <Text part="tick-words">{entry.text}</Text>
              </View>
            </Repeat>
            <Repeat
              each={spatialChart.names}
              key="key"
              part="names"
            >
              <View
                part="axis-name"
                platform="native"
                style={{ '--spatial-label-x': entry.x, '--spatial-label-y': entry.y }}
              >
                <Text part="axis-name-words">{entry.text}</Text>
              </View>
            </Repeat>
            {/* The bubble, a Tooltip hung on a mark over the point. */}
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
              gives={{
                open: spatialChart.tipped,
                persist: true,
                placement: spatialChart.placement,
              }}
              part="tooltip"
              platform="native"
              when={spatialChart.tipped}
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
                  <Text part="tooltip-label-words">{spatialChart.tipLabel}</Text>
                </View>
                <Repeat
                  each={spatialChart.cells}
                  key="key"
                  part="tooltip-cells"
                >
                  <View
                    also={{ 'tooltip-cell-current': entry.current }}
                    data-series={entry.series}
                    part="tooltip-cell"
                    style={{ '--chart-series': entry.color }}
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
          </View>
        )}
        {/* The web's numbers and names, which it writes in its own drawing. */}
        <View
          part="tick"
          platform="web"
        />
        <View
          part="axis-name"
          platform="web"
        />
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
          follows={spatialChart.live}
          part="live"
        >
          {spatialChart.live}
        </Announce>
      </View>
      {spatialChart.error && (
        <View
          part="error"
          role="alert"
        >
          <Text part="error-words">{props.errorText}</Text>
          <Slot name="error" />
        </View>
      )}
      {spatialChart.loading && (
        <View part="loading">
          <Slot name="loading">
            <Text part="loading-words">{props.loadingText}</Text>
          </Slot>
        </View>
      )}
      {spatialChart.empty && (
        <View part="empty">
          <Slot name="empty">
            <Text part="empty-words">{props.emptyText}</Text>
          </Slot>
        </View>
      )}
      <View
        part="summary"
        platform="web"
      />
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
