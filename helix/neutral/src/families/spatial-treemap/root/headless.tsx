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
 * Spatial Treemap's headless tier: each row an item, the first numeric column
 * its size and the second, where there is one, its height, drawn as a block
 * on a floor shared out in proportion, in a box seen from a camera that turns
 * and tilts, `group-by` naming a column whose text groups the blocks and
 * colors them. **Core draws it, on a phone as on the web.** Core's
 * `treemapOf` shares the floor out and `blocksDrawn` and `blockOrder` lay
 * each block's faces and the order to paint them, so a block stands at one
 * place in either drawing. A phone draws it in react-native-svg, its numbers
 * and names as words over the drawing.
 *
 * **The plot is read**: by the arrow keys on the web and a hardware keyboard,
 * from item to item in the table's order, and on a phone by a tap on the
 * block under it and as one adjustable control. A drag across the drawing
 * turns the view, and Shift with an arrow does too. The bubble is a Tooltip
 * over the block's top, with its row.
 *
 * **Web only:** the renderer the default region holds, which `helix-plot`'s
 * three.js driver draws in, the hidden table drawn from `data`, the summary
 * sentence, and the Listen button `sonify` draws.
 */
export default headless('spatial-treemap', {
  props: {
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
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
    plotLabel: '3D treemap',
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    summary: web(oneOf(['hidden', 'visible'])),
    summaryLabel: web(
      '{count, plural, one {# item} other {# items}} in {groups, plural, one {# group} other {# groups}}, sized from {low} to {high}.',
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
    faces: 'faces',
    grid: 'grid',
    live: 'live',
    loading: 'loading',
    markX: 'markX',
    markY: 'markY',
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
            {/* The box's grid, then each face of each block in the order
                the blocks are painted, the ring straight after the block
                the reading rests on, so the blocks in front cover it, then
                its outline again, faint, over every block. */}
            <Svg
              part="drawing"
              viewBox={spatialChart.viewBox}
            >
              <Path
                d={spatialChart.grid}
                part="grid"
              />
              <Repeat
                each={spatialChart.faces}
                key="key"
                part="faces"
              >
                <Path
                  d={entry.d}
                  part="face"
                  style={{
                    '--chart-series': entry.color,
                    '--spatial-treemap-edge': entry.edge,
                    '--spatial-treemap-face': entry.face,
                  }}
                />
                <Path
                  d={entry.line}
                  part="ring"
                />
              </Repeat>
              <Path
                d={spatialChart.ring}
                part="ring-behind"
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
                style={{
                  '--spatial-label-size': entry.size,
                  '--spatial-label-x': entry.x,
                  '--spatial-label-y': entry.y,
                }}
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
                style={{
                  '--spatial-label-size': entry.size,
                  '--spatial-label-x': entry.x,
                  '--spatial-label-y': entry.y,
                }}
              >
                <Text part="axis-name-words">{entry.text}</Text>
              </View>
            </Repeat>
            {/* The bubble, a Tooltip hung on a mark over the reading. */}
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
        {/* The web's blocks, numbers, and names, which it draws in its own
            drawing: each block a group of its faces. */}
        <View
          also={{ 'block-active': true }}
          part="block"
          platform="web"
        />
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
