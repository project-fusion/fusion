import {
  Announce,
  headless,
  LinearGradient,
  object,
  oneOf,
  Path,
  Pressable,
  property,
  Repeat,
  Slot,
  Stop,
  Svg,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Bar Chart's headless tier: a table's categories as columns, or as bars down
 * the side under `orientation="horizontal"`, which core draws on a phone as on
 * the web: `barFrame` measures each column from zero, `barBox` stands a
 * category's columns abreast or stacked, `barPaths` draws a dense chart as a
 * path for each series, tone, and side of zero, and a series `lines` names is
 * a line. `outlined`, `subtle`, and `glass` are written onto the columns of
 * the series they name, as `data-emphasis` and `data-material`.
 *
 * **The columns and the reading are two layers**: a phone fades its canvas of
 * every column while a reading is shown and draws the category shown again
 * over it. **Web only:** the hidden table, the summary, the Listen button, a
 * reading under a mouse, a mirrored drawing, and the columns easing in.
 */
export default headless('bar-chart', {
  props: {
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    emptyText: 'No readings',
    for: '',
    glass: '',
    gridlines: oneOf(['both', 'category', 'value']),
    highestLabel: 'Highest',
    label: '',
    lines: '',
    loading: false,
    loadingText: 'Loading readings',
    locale: '',
    nextReadingsLabel: web('Next readings'),
    orientation: oneOf(['horizontal']),
    outlined: '',
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    secondary: '',
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    stacked: false,
    subtle: '',
    summary: web(oneOf(['hidden', 'visible'])),
    summaryLabel: '{highestLabel}: {readings}.',
    valueAxis: false,
  },
  events: {
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
  },
  states: ['active', 'empty', 'loading', 'settled'],
  barChart: {
    axes: 'axes',
    bandHeight: 'bandHeight',
    bandWidth: 'bandWidth',
    bandX: 'bandX',
    bandY: 'bandY',
    bars: 'bars',
    baseline: 'baseline',
    cells: 'cells',
    drawn: 'drawn',
    empty: 'empty',
    gridlines: 'gridlines',
    labels: 'labels',
    lines: 'lines',
    live: 'live',
    loading: 'loading',
    markX: 'markX',
    markY: 'markY',
    named: 'named',
    onReadingChange: 'readingChange',
    onReadingPress: 'readingPress',
    placement: 'placement',
    reading: 'reading',
    role: 'role',
    summary: 'summary',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
  },
  render: ({ entry, barChart, props }) => (
    <>
      <Repeat
        each={barChart.axes}
        key="key"
        part="axes"
      >
        <View
          ariaHidden
          data-axis={entry.which}
          part="axis"
          style={{ '--bar-chart-axis': entry.width, '--bar-chart-secondary': entry.tint }}
        >
          <Repeat
            each={entry.ticks}
            key="key"
            part="ticks"
          >
            <View
              data-axis={entry.which}
              part="tick"
              style={{ '--chart-tick-at': entry.at }}
            >
              <Text part="tick-text">{entry.text}</Text>
            </View>
          </Repeat>
        </View>
      </Repeat>
      <View
        label={barChart.named}
        part="plot"
        role={barChart.role}
      >
        {barChart.drawn && (
          <Svg
            ariaHidden
            part="svg"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <Repeat
              each={barChart.gridlines}
              key="key"
              part="gridlines"
            >
              <Path
                d={entry.d}
                part="gridline"
              />
            </Repeat>
            <Path
              d={barChart.baseline}
              part="baseline"
            />
          </Svg>
        )}
        {barChart.reading && (
          <View
            ariaHidden
            part="band"
            style={{
              '--chart-band-height': barChart.bandHeight,
              '--chart-band-width': barChart.bandWidth,
              '--chart-band-x': barChart.bandX,
              '--chart-band-y': barChart.bandY,
            }}
          />
        )}
        <Repeat
          each={barChart.bars}
          key="key"
          part="canvases"
        >
          <View
            data-faded={entry.faded}
            part="columns"
            platform="native"
          >
            <Svg
              part="columns-svg"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <Repeat
                each={entry.washes}
                key="key"
                part="washes"
              >
                <LinearGradient
                  id={entry.id}
                  part="bar-wash"
                  x1="0"
                  x2={entry.x2}
                  y1="0"
                  y2={entry.y2}
                >
                  <Stop
                    offset="0"
                    part="bar-wash-start"
                    style={{ '--chart-series': entry.color }}
                  />
                  <Stop
                    offset="1"
                    part="bar-wash-end"
                    style={{ '--chart-series': entry.color }}
                  />
                </LinearGradient>
              </Repeat>
              <Repeat
                each={entry.columns}
                key="key"
                part="column-list"
              >
                <Path
                  also={{
                    'bar-end': entry.end,
                    'bar-end-negative': entry.endNegative,
                    'bar-negative': entry.negative,
                  }}
                  d={entry.d}
                  data-emphasis={entry.emphasis}
                  data-material={entry.material}
                  data-series={entry.series}
                  data-tone={entry.tone}
                  part="bar"
                  style={{ '--chart-bar-wash': entry.wash, '--chart-series': entry.color }}
                />
                <Path
                  d={entry.edge}
                  data-material={entry.material}
                  data-tone={entry.tone}
                  part="bar-edge"
                  style={{ '--chart-series': entry.color }}
                />
              </Repeat>
            </Svg>
          </View>
        </Repeat>
        <View
          also={{ 'group-active': true }}
          part="group"
          platform="web"
        />
        {barChart.drawn && (
          <Svg
            part="lines-svg"
            platform="native"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <Repeat
              each={barChart.lines}
              key="key"
              part="lines"
            >
              <Path
                d={entry.d}
                data-series={entry.series}
                part="line"
                style={{ '--chart-series': entry.color }}
              />
            </Repeat>
          </Svg>
        )}
        {barChart.loading && (
          <View part="loading">
            <Slot name="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </Slot>
          </View>
        )}
        {barChart.empty && (
          <View part="empty">
            <Slot name="empty">
              <Text part="empty-words">{props.emptyText}</Text>
            </Slot>
          </View>
        )}
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
          gives={{ open: barChart.tipped, persist: true, placement: barChart.placement }}
          part="tooltip"
          platform="native"
          when={barChart.tipped}
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
              <Text part="tooltip-label-words">{barChart.tipLabel}</Text>
            </View>
            <Repeat
              each={barChart.cells}
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
          follows={barChart.live}
          part="live"
        >
          {barChart.live}
        </Announce>
      </View>
      {barChart.drawn && (
        <View
          ariaHidden
          part="labels"
        >
          <Repeat
            each={barChart.labels}
            key="key"
            part="label-list"
          >
            <View
              part="label"
              style={{ '--chart-label-size': entry.size, '--chart-label-start': entry.start }}
            >
              <Text part="label-text">{entry.text}</Text>
            </View>
          </Repeat>
        </View>
      )}
      <View
        part="summary"
        platform="web"
      >
        <Text part="summary-words">{barChart.summary}</Text>
      </View>
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
