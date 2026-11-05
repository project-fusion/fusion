import {
  Announce,
  bare,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Heatmap's headless tier: a strip of cells, each colored by its reading,
 * read from a table, for uptime, contributions, or activity.
 *
 * **Core lays it out, on a phone as on the web.** The table a `for` names, or
 * `data`, gives a reading a row from its first column of numbers, and a cell
 * takes its tone from its own `data-tone` or from `thresholds` and `tones`.
 * The cells fill `rows` down each column and then across, so a week is a
 * column with `rows="7"`, and a strip too narrow for them all draws as many
 * whole columns as fit, the newest kept. The web lays them out in a grid that
 * flows by column; a phone has no such grid, so each cell stands where core
 * places it.
 *
 * **The cells and the reading are two layers**, so moving the reading draws
 * the cell it rests on again over the rest, ringed, and the bubble, and
 * leaves the other cells as they are.
 *
 * **The strip is read.** The arrows walk a cell down and a column across,
 * Page Up and Page Down a month where the rows carry dates, a tap shows the
 * cell under it and presses it, and a screen reader adjusts the strip as one
 * control whose value is the cell's row in words, described by the busiest
 * reading and the total. The bubble is a Tooltip over the cell, with its row.
 *
 * **`selection-mode` lets a reader select cells**: a press selects the cell
 * or lets it go, and under `multiple` Shift with a key that moves takes in
 * the range, or the rectangle under `selection-shape="rectangle"`. `value`
 * names each day selected, a change asks first and tells `change`, and the
 * `selection` part says how many are selected.
 *
 * **A strip with nothing to draw says so** under the strip: `empty-text`, or
 * `loading-text` while `loading` is set, or what is passed into `empty` and
 * `loading`. The footer holds the `start`, `summary`, and `end` slots.
 *
 * **Web only:** the grid's rows and cell roles under `selection-mode`, a
 * reading shown under a mouse, the hidden table drawn from `data`, the Listen
 * button `sonify` draws, and `gap` and `min-cell`, which the web's sheet
 * reads back.
 */
export default headless('heatmap', {
  props: {
    busiestLabel: 'Busiest',
    /* The readings as data, where no table is named, as a phone's app hands them over. */
    data: property(object()),
    emptyText: 'No readings',
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
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
    resize: ['size'],
  },
  states: ['active', 'empty', 'loading', 'settled'],
  heatmap: {
    actives: 'actives',
    cells: 'cells',
    drawn: 'drawn',
    empty: 'empty',
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
    tipCells: 'tipCells',
    tipLabel: 'tipLabel',
    tipped: 'tipped',
  },
  render: ({ entry, heatmap, props }) => (
    <>
      <View
        also={{ plot: true }}
        label={heatmap.named}
        part="strip"
        role={heatmap.role}
      >
        {/* Each cell, where core stands it, in its tone. */}
        <Repeat
          each={heatmap.cells}
          key="key"
          part="cells"
        >
          <View
            also={{ 'cell-selected': entry.selected }}
            ariaHidden
            data-tone={entry.tone}
            part="cell"
            style={{
              '--heatmap-fill': entry.fill,
              '--heatmap-ring': entry.ring,
              '--heatmap-x': entry.x,
              '--heatmap-y': entry.y,
            }}
          />
        </Repeat>
        {/* The cell the reading rests on, drawn again over the rest and ringed. */}
        <Repeat
          each={heatmap.actives}
          key="key"
          part="actives"
        >
          <View
            also={{ 'cell-active': true, 'cell-selected': entry.selected }}
            ariaHidden
            data-tone={entry.tone}
            part="cell"
            style={{
              '--heatmap-fill': entry.fill,
              '--heatmap-ring': entry.ring,
              '--heatmap-x': entry.x,
              '--heatmap-y': entry.y,
            }}
          />
        </Repeat>
        {/* The web's column of cells, which a grid reads as a row under `selection-mode`. */}
        <View
          part="row"
          platform="web"
        />
        {/* The bubble, a Tooltip hung on a mark over the cell. */}
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
      {/* The three slots under the strip, drawn where any holds something. */}
      {heatmap.footed && (
        <View part="footer">
          <View part="start">
            <Slot name="start" />
          </View>
          <View part="summary">
            <Slot name="summary" />
          </View>
          <View part="end">
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
