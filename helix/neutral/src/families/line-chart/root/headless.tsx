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
 * Line Chart's headless tier: a chart that draws series over time as lines,
 * read from a table.
 *
 * **Core draws it, on a phone as on the web.** The table a `for` names, or
 * `data`, gives one series for each column of numbers, and core gives each
 * series' line as one path through its runs, its wash under `area`, its marks
 * under `markers` and on a reading no line reaches, and where it ended, over a
 * scale that covers the range of the series drawn, or from zero under `zero`.
 * The rules `gridlines` asks for, the rule at zero, and the numbers of
 * `value-axis` stand at the levels core picks, and the names under the plot
 * are the ones that fit.
 *
 * **The lines and the reading are two layers**, so moving the reading draws
 * the band, the guide, and the bubble again and leaves the lines as they are.
 *
 * **The plot is read.** On the web it takes focus and the arrow keys walk the
 * readings and the series; on a phone a press-and-drag scrubs it with a tick
 * at each reading, a tap shows a reading and presses it, and a screen reader
 * adjusts the plot as one control whose value is the reading in words. The
 * bubble is a Tooltip over the topmost series at the reading, with the
 * reading's row.
 *
 * **A chart with nothing to draw says so**: `empty-text` in the plot, or
 * `loading-text` while `loading` is set, or what is passed into `empty` and
 * `loading`.
 * `error-text`, set when the readings did not load, stands in place of both,
 * in the danger ink, followed by what is passed into `error`.
 *
 * **Web only:** the hidden table drawn from `data`, the summary sentence, the
 * Listen button `sonify` draws, a reading shown under a mouse, the hole a
 * `ring` terminus cuts out of the lines, the drawing mirrored on a
 * right-to-left page, and the lines drawing on as they arrive and easing to
 * new readings, which a phone draws at once.
 */
export default headless('line-chart', {
  props: {
    area: false,
    curve: oneOf(['smooth', 'step', 'straight']),
    dashed: '',
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    emptyText: 'No readings',
    errorText: '',
    for: '',
    gridlines: oneOf(['both', 'category', 'value']),
    label: '',
    loading: false,
    loadingText: 'Loading readings',
    locale: '',
    markers: false,
    nextReadingsLabel: web('Next readings'),
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    summary: web(oneOf(['hidden', 'visible'])),
    terminus: oneOf(['none', 'ring', 'square', 'triangle']),
    valueAxis: false,
    zero: false,
  },
  events: {
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
  },
  states: ['active', 'empty', 'error', 'loading', 'settled'],
  lineChart: {
    axisWidth: 'axisWidth',
    axised: 'axised',
    bandWidth: 'bandWidth',
    bandX: 'bandX',
    based: 'based',
    baseline: 'baseline',
    cells: 'cells',
    drawn: 'drawn',
    empty: 'empty',
    error: 'error',
    ends: 'ends',
    gridlines: 'gridlines',
    guideX: 'guideX',
    labels: 'labels',
    layers: 'layers',
    live: 'live',
    loading: 'loading',
    markX: 'markX',
    markY: 'markY',
    marks: 'marks',
    named: 'named',
    onReadingChange: 'readingChange',
    onReadingPress: 'readingPress',
    placement: 'placement',
    reading: 'reading',
    role: 'role',
    summary: 'summary',
    ticks: 'ticks',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
  },
  render: ({ entry, lineChart, props }) => (
    <>
      {lineChart.axised && (
        <View
          ariaHidden
          part="axis"
          style={{ '--line-chart-axis': lineChart.axisWidth }}
        >
          <Repeat
            each={lineChart.ticks}
            key="key"
            part="ticks"
          >
            <View
              part="tick"
              style={{ '--chart-tick-y': entry.y }}
            >
              <Text part="tick-text">{entry.text}</Text>
            </View>
          </Repeat>
        </View>
      )}
      <View
        label={lineChart.named}
        part="plot"
        role={lineChart.role}
      >
        {/* The reading's slot and the rule down it, behind the lines, which
            a phone draws as views under its canvas and the web in its drawing. */}
        {lineChart.reading && (
          <View
            ariaHidden
            part="band"
            style={{ '--chart-band-width': lineChart.bandWidth, '--chart-band-x': lineChart.bandX }}
          />
        )}
        {lineChart.reading && (
          <View
            ariaHidden
            part="guide"
            style={{ '--chart-guide-x': lineChart.guideX }}
          />
        )}
        {lineChart.drawn && (
          <Svg
            ariaHidden
            part="svg"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <Repeat
              each={lineChart.gridlines}
              key="key"
              part="gridlines"
            >
              <Path
                d={entry.d}
                part="gridline"
              />
            </Repeat>
            {lineChart.based && (
              <Path
                d={lineChart.baseline}
                part="baseline"
              />
            )}
            <Repeat
              each={lineChart.layers}
              key="key"
              part="series"
            >
              <Path
                d={entry.wash}
                data-series={entry.series}
                part="area"
                style={{ '--chart-series': entry.color }}
              />
              <Path
                also={{ 'line-dashed': entry.dashed }}
                d={entry.line}
                data-series={entry.series}
                part="line"
                style={{ '--chart-series': entry.color }}
              />
            </Repeat>
            <Repeat
              each={lineChart.marks}
              key="key"
              part="markers"
            >
              <Path
                d={entry.ring}
                data-series={entry.series}
                part="marker-ring"
              />
              <Path
                d={entry.marks}
                data-series={entry.series}
                part="marker"
                style={{ '--chart-series': entry.color }}
              />
              <Path
                also={{ 'marker-lone': true }}
                d={entry.lone}
                data-series={entry.series}
                part="marker"
                style={{ '--chart-series': entry.color }}
              />
            </Repeat>
          </Svg>
        )}
        <Repeat
          each={lineChart.ends}
          key="key"
          part="termini"
        >
          <View
            ariaHidden
            part="terminus"
            style={{
              '--chart-series': entry.color,
              '--chart-terminus-x': entry.x,
              '--chart-terminus-y': entry.y,
            }}
          />
        </Repeat>
        {lineChart.error && (
          <View
            part="error"
            role="alert"
          >
            <Text part="error-words">{props.errorText}</Text>
            <Slot name="error" />
          </View>
        )}
        {lineChart.loading && (
          <View part="loading">
            <Slot name="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </Slot>
          </View>
        )}
        {lineChart.empty && (
          <View part="empty">
            <Slot name="empty">
              <Text part="empty-words">{props.emptyText}</Text>
            </Slot>
          </View>
        )}
        {/* The bubble, a Tooltip hung on a mark over the topmost series. */}
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
          gives={{ open: lineChart.tipped, persist: true, placement: lineChart.placement }}
          part="tooltip"
          platform="native"
          when={lineChart.tipped}
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
              <Text part="tooltip-label-words">{lineChart.tipLabel}</Text>
            </View>
            <Repeat
              each={lineChart.cells}
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
          follows={lineChart.live}
          part="live"
        >
          {lineChart.live}
        </Announce>
      </View>
      {lineChart.drawn && (
        <View
          ariaHidden
          part="labels"
        >
          <Repeat
            each={lineChart.labels}
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
        <Text part="summary-words">{lineChart.summary}</Text>
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
