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
 * Area Chart's headless tier: a chart that shows how a total is made up over
 * time, as bands stacked on one another, read from a table.
 *
 * **Core draws it, on a phone as on the web.** The table a `for` names, or
 * `data`, gives one part for each column of numbers, and core's `areaStack`
 * adds them up at each reading, less a part a legend hid, which closes and
 * keeps its color. Each band is drawn as everything under its top edge, the
 * widest first, so what shows of each is the strip between its edge and the
 * edge below. The scale starts at zero; `share` draws each reading as a
 * hundred percent, and `overlap` draws every band from zero, the first in
 * front. The rules `gridlines` asks for and the numbers of `value-axis` stand
 * at the levels core picks, and the names under the plot are the ones that
 * fit.
 *
 * **The bands and the reading are two layers**, so moving the reading draws
 * the guide and the bubble again and leaves the bands as they are.
 *
 * **The plot is read.** On the web it takes focus and the arrow keys walk the
 * readings and the parts; on a phone a press-and-drag scrubs it with a tick
 * at each reading, a tap shows a reading and presses it, and a screen reader
 * adjusts the plot as one control whose value is the reading in words. The
 * bubble is a Tooltip over the top of the stack, with the reading's row and
 * its total.
 *
 * **A chart with nothing to draw says so**: `empty-text` in the plot, or
 * `loading-text` while `loading` is set, or what is passed into `empty` and
 * `loading`.
 *
 * **Web only:** the hidden table drawn from `data`, the summary sentence, the
 * Listen button `sonify` draws, a reading shown under a mouse, the drawing
 * mirrored on a right-to-left page, and the bands fading in and easing to new
 * readings, which a phone draws at once.
 */
export default headless('area-chart', {
  props: {
    curve: oneOf(['smooth', 'step', 'straight']),
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    emptyText: 'No readings',
    for: '',
    gridlines: oneOf(['both', 'category', 'value']),
    label: '',
    loading: false,
    loadingText: 'Loading readings',
    locale: '',
    nextReadingsLabel: web('Next readings'),
    overlap: false,
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    share: false,
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    summary: web(oneOf(['hidden', 'visible'])),
    summaryLabel: '{reading}: {totalLabel} {total}; {shares}.',
    totalLabel: 'Total',
    valueAxis: false,
  },
  events: {
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
  },
  states: ['active', 'empty', 'loading', 'settled'],
  areaChart: {
    axisWidth: 'axisWidth',
    axised: 'axised',
    cells: 'cells',
    drawn: 'drawn',
    empty: 'empty',
    gridlines: 'gridlines',
    guideX: 'guideX',
    labels: 'labels',
    layers: 'layers',
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
    ticks: 'ticks',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
  },
  render: ({ entry, areaChart, props }) => (
    <>
      {areaChart.axised && (
        <View
          ariaHidden
          part="axis"
          style={{ '--area-chart-axis': areaChart.axisWidth }}
        >
          <Repeat
            each={areaChart.ticks}
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
        label={areaChart.named}
        part="plot"
        role={areaChart.role}
      >
        {areaChart.drawn && (
          <Svg
            ariaHidden
            part="svg"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <Repeat
              each={areaChart.layers}
              key="key"
              part="bands"
            >
              <Path
                d={entry.wash}
                data-series={entry.series}
                part="area"
                style={{ '--chart-series': entry.color }}
              />
              <Path
                d={entry.line}
                data-series={entry.series}
                part="line"
                style={{ '--chart-series': entry.color }}
              />
            </Repeat>
            <Repeat
              each={areaChart.gridlines}
              key="key"
              part="gridlines"
            >
              <Path
                d={entry.d}
                part="gridline"
              />
            </Repeat>
            <Path
              d="M0,100L100,100"
              part="baseline"
            />
          </Svg>
        )}
        {areaChart.loading && (
          <View part="loading">
            <Slot name="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </Slot>
          </View>
        )}
        {areaChart.empty && (
          <View part="empty">
            <Slot name="empty">
              <Text part="empty-words">{props.emptyText}</Text>
            </Slot>
          </View>
        )}
        {/* The rule down the reading, over the bands, as the web draws it. */}
        {areaChart.reading && (
          <View
            ariaHidden
            part="guide"
            style={{ '--chart-guide-x': areaChart.guideX }}
          />
        )}
        {/* The bubble, a Tooltip hung on a mark over the top of the stack. */}
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
          gives={{ open: areaChart.tipped, persist: true, placement: areaChart.placement }}
          part="tooltip"
          platform="native"
          when={areaChart.tipped}
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
              <Text part="tooltip-label-words">{areaChart.tipLabel}</Text>
            </View>
            <Repeat
              each={areaChart.cells}
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
          follows={areaChart.live}
          part="live"
        >
          {areaChart.live}
        </Announce>
      </View>
      {areaChart.drawn && (
        <View
          ariaHidden
          part="labels"
        >
          <Repeat
            each={areaChart.labels}
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
        <Text part="summary-words">{areaChart.summary}</Text>
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
