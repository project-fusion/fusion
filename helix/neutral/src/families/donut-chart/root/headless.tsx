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
 * Donut Chart's headless tier: a chart that shows parts of a whole as a ring,
 * read from a table.
 *
 * **Core draws it, on a phone as on the web.** The table a `for` names gives
 * one column of amounts, each row a slice, and core's `donutShares` gives
 * each slice's share of the whole, leaving out a row with no amount and a row
 * a legend hid. The web draws a slice as a dash on a circle its sheet turns
 * to start at twelve; a phone draws the same slice as an arc already turned,
 * `donutArc`, and the closed wedge an outline traces, `donutEdge`. `hole`
 * sets how thick the band is, `none` a pie, and `sweep="half"` spreads the
 * shares over a half ring opening downward.
 *
 * **The ring and the bubble are two layers**, so moving the reading draws the
 * bubble again and leaves the ring as it is.
 *
 * **The ring is read.** On the web the plot takes focus and the arrow keys
 * walk the slices; on a phone a press-and-drag around the ring scrubs it with
 * a tick at each slice, found from the touch's angle, a tap shows a slice and
 * presses it, and a screen reader adjusts the plot as one control whose value
 * is the slice in words. The bubble is a Tooltip on the slice's own bearing,
 * outside the ring, with the slice's row and its share.
 *
 * **A chart with nothing to draw says so**: `empty-text` in the plot, or
 * `loading-text` while `loading` is set, or what is passed into `empty` and
 * `loading`. The middle of the ring holds what is passed in, usually a total.
 * `error-text`, set when the readings did not load, stands in place of both,
 * in the danger ink, followed by what is passed into `error`.
 *
 * **Web only:** the hidden table drawn from `data`, the summary sentence, the
 * Listen button `sonify` draws, a slice shown under a mouse, and the ring's
 * sweep on arrival and its eased changes, which a phone draws at once.
 */
export default headless('donut-chart', {
  props: {
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    emptyText: 'No readings',
    errorText: '',
    for: '',
    hole: oneOf(['large', 'none', 'small']),
    label: '',
    loading: false,
    loadingText: 'Loading readings',
    locale: '',
    nextReadingsLabel: web('Next readings'),
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    sliceLabels: false,
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    summary: web(oneOf(['hidden', 'visible'])),
    sweep: oneOf(['half']),
  },
  events: {
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
  },
  states: ['active', 'empty', 'error', 'loading', 'settled'],
  donutChart: {
    aspect: 'aspect',
    cells: 'cells',
    centered: 'centered',
    drawn: 'drawn',
    empty: 'empty',
    error: 'error',
    frame: 'frame',
    labeled: 'labeled',
    labels: 'labels',
    live: 'live',
    loading: 'loading',
    markX: 'markX',
    markY: 'markY',
    named: 'named',
    onReadingChange: 'readingChange',
    onReadingPress: 'readingPress',
    placement: 'placement',
    role: 'role',
    slices: 'slices',
    stroke: 'stroke',
    summary: 'summary',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
    track: 'track',
  },
  render: ({ donutChart, entry, props }) => (
    <>
      <View
        label={donutChart.named}
        part="plot"
        role={donutChart.role}
        style={{
          '--donut-chart-aspect': donutChart.aspect,
          '--donut-chart-stroke': donutChart.stroke,
        }}
      >
        {donutChart.drawn && (
          <Svg
            ariaHidden
            part="ring"
            viewBox={donutChart.frame}
          >
            {/* A phone's custom properties do not inherit from a tree's style,
                so each shape carries the thickness it is stroked at. */}
            <Path
              d={donutChart.track}
              part="track"
              style={{ '--donut-chart-stroke': donutChart.stroke }}
            />
            <Repeat
              each={donutChart.slices}
              key="key"
              part="slices"
            >
              <Path
                also={{ 'segment-active': entry.active }}
                d={entry.arc}
                data-active={entry.active}
                data-series={entry.series}
                part="segment"
                style={{ '--chart-series': entry.color, '--donut-chart-stroke': donutChart.stroke }}
              />
              <Path
                d={entry.edge}
                data-active={entry.active}
                data-series={entry.series}
                part="segment-edge"
                style={{ '--chart-series': entry.color }}
              />
            </Repeat>
          </Svg>
        )}
        {donutChart.centered && (
          <View
            part="center"
            style={{ '--donut-chart-stroke': donutChart.stroke }}
          >
            <Slot />
          </View>
        )}
        {donutChart.labeled && (
          <Repeat
            each={donutChart.labels}
            key="key"
            part="slice-labels"
          >
            <View
              ariaHidden
              data-series={entry.series}
              part="slice-label"
              style={{
                '--chart-series': entry.color,
                '--donut-chart-x': entry.x,
                '--donut-chart-y': entry.y,
              }}
            >
              <Text part="slice-label-text">{entry.text}</Text>
            </View>
          </Repeat>
        )}
        {donutChart.error && (
          <View
            part="error"
            role="alert"
          >
            <Text part="error-words">{props.errorText}</Text>
            <Slot name="error" />
          </View>
        )}
        {donutChart.loading && (
          <View part="loading">
            <Slot name="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </Slot>
          </View>
        )}
        {donutChart.empty && (
          <View part="empty">
            <Slot name="empty">
              <Text part="empty-words">{props.emptyText}</Text>
            </Slot>
          </View>
        )}
        {/* The bubble, a Tooltip hung on a mark on the slice's bearing. */}
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
          gives={{ open: donutChart.tipped, persist: true, placement: donutChart.placement }}
          part="tooltip"
          platform="native"
          when={donutChart.tipped}
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
              <Text part="tooltip-label-words">{donutChart.tipLabel}</Text>
            </View>
            <Repeat
              each={donutChart.cells}
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
          follows={donutChart.live}
          part="live"
        >
          {donutChart.live}
        </Announce>
      </View>
      <View
        part="summary"
        platform="web"
      >
        <Text part="summary-words">{donutChart.summary}</Text>
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
