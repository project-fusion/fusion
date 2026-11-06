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
 * Scatter Chart's headless tier: a chart that shows whether two measures move
 * together, with one point per row, read from a table.
 *
 * **Core draws it, on a phone as on the web.** The table a `for` names, or
 * `data`, gives its first column of numbers across and every other one up as
 * a series, less the column `size-by` names, which sizes the points. Core
 * gives each series' points as a few layers of paths, a path a size, so the
 * points of 100,000 rows are a few dozen paths, each layer at the points'
 * opacity, so a cluster reads darker where it is denser. The rules
 * `gridlines` asks for, the lines of best fit under `trend`, and the numbers
 * of both scales stand at the levels core picks.
 *
 * **The points and the reading are two layers**, so moving the reading draws
 * the point it rests on and the bubble again and leaves the points as they
 * are.
 *
 * **The plot is read.** On the web it takes focus and the arrow keys walk the
 * points left to right and the series of a row; on a phone a tap shows the
 * point nearest it and presses it, a drag moves to the point nearest the
 * finger, and a screen reader adjusts the plot as one control whose value is
 * the row in words. The bubble is a Tooltip over the point, with its row.
 *
 * **A chart with nothing to draw says so**: `empty-text` in the plot, or
 * `loading-text` while `loading` is set, or what is passed into `empty` and
 * `loading`.
 * `error-text`, set when the readings did not load, stands in place of both,
 * in the danger ink, followed by what is passed into `error`.
 *
 * **Web only:** the hidden table drawn from `data`, the summary sentence, the
 * Listen button `sonify` draws, a reading shown under a mouse, and the plane
 * held left to right on a right-to-left page.
 */
export default headless('scatter-chart', {
  props: {
    correlationLabel: web('correlation'),
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    emptyText: 'No readings',
    errorText: '',
    for: '',
    gridlines: oneOf(['both', 'x', 'y']),
    label: '',
    loading: false,
    loadingText: 'Loading readings',
    locale: '',
    nextReadingsLabel: web('Next readings'),
    pointsLabel: web('{count, plural, one {point} other {points}}'),
    positionLabel: '{position} of {count}',
    previousReadingsLabel: web('Previous readings'),
    readingsLabel: web('Readings {first} to {last} of {count}'),
    seriesLabel: web(
      '{correlation, select, none {{y} / {x}: {count} {pointsLabel}} other {{y} / {x}: {count} {pointsLabel}, {correlationLabel} {correlation}}}',
    ),
    sizeBy: '',
    sonify: web(false),
    sonifyDuration: web(3000),
    sonifyLabel: web('Listen'),
    sonifyStopLabel: web('Stop'),
    summary: web(oneOf(['hidden', 'visible'])),
    trend: false,
  },
  events: {
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
  },
  states: ['active', 'empty', 'error', 'loading', 'settled'],
  scatterChart: {
    active: 'active',
    cells: 'cells',
    drawn: 'drawn',
    empty: 'empty',
    error: 'error',
    gridlines: 'gridlines',
    layers: 'layers',
    live: 'live',
    loading: 'loading',
    markX: 'markX',
    markY: 'markY',
    named: 'named',
    onReadingChange: 'readingChange',
    onReadingPress: 'readingPress',
    placement: 'placement',
    role: 'role',
    summary: 'summary',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
    trends: 'trends',
    xName: 'xName',
    xTicks: 'xTicks',
    yName: 'yName',
    yTicks: 'yTicks',
  },
  render: ({ entry, scatterChart, props }) => (
    <>
      <View part="plane">
        {/* What is measured up, over the plot. */}
        {scatterChart.drawn && (
          <View
            ariaHidden
            part="y-name"
          >
            <Text part="y-name-words">{scatterChart.yName}</Text>
          </View>
        )}
        <View
          label={scatterChart.named}
          part="plot"
          role={scatterChart.role}
        >
          {/* The numbers up, beside the plot: inside it on a phone, which stands
              them in the room at its start, as tall as it is. */}
          {scatterChart.drawn && (
            <View
              ariaHidden
              part="y-axis"
            >
              <Repeat
                each={scatterChart.yTicks}
                key="key"
                part="y-ticks"
              >
                <View
                  part="y-tick"
                  style={{ '--chart-tick': entry.at }}
                >
                  <Text part="y-tick-text">{entry.text}</Text>
                </View>
              </Repeat>
            </View>
          )}

          {/* The rules and the lines of best fit, behind the points. */}
          {scatterChart.drawn && (
            <Svg
              ariaHidden
              part="svg"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <Repeat
                each={scatterChart.gridlines}
                key="key"
                part="gridlines"
              >
                <Path
                  d={entry.d}
                  part="gridline"
                />
              </Repeat>
              <Repeat
                each={scatterChart.trends}
                key="key"
                part="trends"
              >
                <Path
                  d={entry.d}
                  data-series={entry.series}
                  part="trend"
                  style={{ '--chart-series': entry.color }}
                />
              </Repeat>
            </Svg>
          )}
          {/* Each layer of a series' points, a canvas at the points' opacity,
              its rings under its dots, a path a size. */}
          <Repeat
            each={scatterChart.layers}
            key="key"
            part="layers"
          >
            <View
              ariaHidden
              data-series={entry.series}
              part="points"
            >
              <Svg
                part="points-svg"
                platform="native"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <Repeat
                  each={entry.rings}
                  key="key"
                  part="rings"
                >
                  <Path
                    d={entry.d}
                    part="point-ring"
                    style={{ '--chart-point-weight': entry.weight }}
                  />
                </Repeat>
                <Repeat
                  each={entry.dots}
                  key="key"
                  part="dots"
                >
                  <Path
                    d={entry.d}
                    part="point"
                    style={{ '--chart-point-weight': entry.weight, '--chart-series': entry.color }}
                  />
                </Repeat>
              </Svg>
            </View>
          </Repeat>
          {/* The web's paths of a layer, which it draws in its own drawing. */}
          <View
            part="point-ring"
            platform="web"
          />
          <View
            part="point"
            platform="web"
          />
          {/* The row the reading rests on, drawn again over the rest. */}
          <Repeat
            each={scatterChart.active}
            key="key"
            part="actives"
          >
            <View
              ariaHidden
              data-series={entry.series}
              part="point-active"
              style={{
                '--chart-point-weight': entry.weight,
                '--chart-point-x': entry.x,
                '--chart-point-y': entry.y,
                '--chart-series': entry.color,
              }}
            />
          </Repeat>
          {scatterChart.error && (
            <View
              part="error"
              role="alert"
            >
              <Text part="error-words">{props.errorText}</Text>
              <Slot name="error" />
            </View>
          )}
          {scatterChart.loading && (
            <View part="loading">
              <Slot name="loading">
                <Text part="loading-words">{props.loadingText}</Text>
              </Slot>
            </View>
          )}
          {scatterChart.empty && (
            <View part="empty">
              <Slot name="empty">
                <Text part="empty-words">{props.emptyText}</Text>
              </Slot>
            </View>
          )}
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
            gives={{ open: scatterChart.tipped, persist: true, placement: scatterChart.placement }}
            part="tooltip"
            platform="native"
            when={scatterChart.tipped}
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
                <Text part="tooltip-label-words">{scatterChart.tipLabel}</Text>
              </View>
              <Repeat
                each={scatterChart.cells}
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
            follows={scatterChart.live}
            part="live"
          >
            {scatterChart.live}
          </Announce>
        </View>
        {/* The numbers across under the plot, and what is measured across at their far end. */}
        {scatterChart.drawn && (
          <View
            ariaHidden
            part="x-axis"
          >
            <Repeat
              each={scatterChart.xTicks}
              key="key"
              part="x-ticks"
            >
              <View
                data-edge={entry.edge}
                part="x-tick"
                style={{ '--chart-tick': entry.at }}
              >
                <Text part="x-tick-text">{entry.text}</Text>
              </View>
            </Repeat>
          </View>
        )}
        {scatterChart.drawn && (
          <View
            ariaHidden
            part="x-name"
          >
            <Text part="x-name-words">{scatterChart.xName}</Text>
          </View>
        )}
      </View>
      <View
        part="summary"
        platform="web"
      >
        <Text part="summary-words">{scatterChart.summary}</Text>
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
