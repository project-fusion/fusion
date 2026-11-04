import {
  Announce,
  headless,
  LinearGradient,
  oneOf,
  Path,
  Rect,
  Repeat,
  Stop,
  Svg,
  Text,
  View,
} from '../../../render.js'

/**
 * Sparkline's headless tier: a small chart with no axes that shows the shape
 * of a series beside its number.
 *
 * **Core draws it, on a phone as on the web.** The readings come from
 * `values`, or from the table a `for` names, and core's `sparklinePlot` gives
 * the line, the wash under it, the columns of a bar plot, the band `range`
 * asks for, and where the terminus, each lone reading, and the `marks` stand.
 * The vector draws the shapes from it, stretched to fill any box, and the
 * marks stand over it in percentages of the box, which nothing stretches.
 *
 * **The vector and the marks are two layers**, so moving the reading draws
 * the cursor and the readout again and leaves the line as it is.
 *
 * **Named by `label`, the plot is read.** On the web it takes focus and the
 * arrow keys walk the readings; on a phone a press-and-drag scrubs it with a
 * tick at each reading, a tap shows a reading and presses it, and a screen
 * reader adjusts the plot as one control whose value is the reading in words.
 * Unnamed, the drawing is decoration and is hidden from a screen reader.
 *
 * **Web only:** a reading shown under a mouse, and the mark of a `ring`
 * terminus cut out of the line, which a phone draws over the line.
 */
export default headless('sparkline', {
  props: {
    curve: oneOf(['smooth', 'step', 'straight']),
    for: '',
    label: '',
    locale: '',
    marks: '',
    overviewLabel: 'From {first} to {last}, highest {high}, lowest {low}',
    plot: oneOf(['area', 'bar', 'line']),
    positionLabel: '{position} of {count}',
    range: '',
    values: '',
  },
  events: {
    readingChange: ['index', 'label', 'pointerType', 'series'],
    readingPress: ['index', 'label', 'pointerType', 'series'],
  },
  states: ['settled'],
  sparkline: {
    area: 'area',
    bandHeight: 'bandHeight',
    bandY: 'bandY',
    banded: 'banded',
    bars: 'bars',
    cursorX: 'cursorX',
    cursorY: 'cursorY',
    ended: 'ended',
    high: 'high',
    highX: 'highX',
    highY: 'highY',
    line: 'line',
    lined: 'lined',
    live: 'live',
    lone: 'lone',
    low: 'low',
    lowX: 'lowX',
    lowY: 'lowY',
    named: 'named',
    onReadingChange: 'readingChange',
    onReadingPress: 'readingPress',
    overview: 'overview',
    readout: 'readout',
    reading: 'reading',
    role: 'role',
    terminusX: 'terminusX',
    terminusY: 'terminusY',
    washed: 'washed',
  },
  render: ({ entry, sparkline }) => (
    <>
      <Svg
        label={sparkline.named}
        part="svg"
        preserveAspectRatio="none"
        role={sparkline.role}
        viewBox="0 0 100 32"
      >
        <LinearGradient
          id="sparkline-wash"
          part="wash"
          x1={0}
          x2={0}
          y1={0}
          y2={1}
        >
          <Stop
            offset={0}
            part="wash-start"
          />
          <Stop
            offset={1}
            part="wash-end"
          />
        </LinearGradient>
        {sparkline.banded && (
          <Rect
            height={sparkline.bandHeight}
            part="range"
            width={100}
            x={0}
            y={sparkline.bandY}
          />
        )}
        {sparkline.lined && (
          <Path
            d={sparkline.line}
            part="line"
          />
        )}
        {sparkline.washed && (
          <Path
            d={sparkline.area}
            part="area"
          />
        )}
        <Repeat
          each={sparkline.bars}
          key="key"
          part="bars"
        >
          <Rect
            height={entry.height}
            part="bar"
            width={entry.width}
            x={entry.x}
            y={entry.y}
          />
        </Repeat>
      </Svg>
      {sparkline.ended && (
        <View
          ariaHidden
          part="terminus"
          style={{
            '--chart-terminus-x': sparkline.terminusX,
            '--chart-terminus-y': sparkline.terminusY,
          }}
        />
      )}
      <Repeat
        each={sparkline.lone}
        key="key"
        part="lones"
      >
        <View
          ariaHidden
          part="lone"
          style={{ '--sparkline-x': entry.x, '--sparkline-y': entry.y }}
        />
      </Repeat>
      {sparkline.high && (
        <View
          ariaHidden
          part="high"
          style={{ '--sparkline-x': sparkline.highX, '--sparkline-y': sparkline.highY }}
        />
      )}
      {sparkline.low && (
        <View
          ariaHidden
          part="low"
          style={{ '--sparkline-x': sparkline.lowX, '--sparkline-y': sparkline.lowY }}
        />
      )}
      {sparkline.reading && (
        <View
          ariaHidden
          part="cursor"
          style={{ '--sparkline-x': sparkline.cursorX, '--sparkline-y': sparkline.cursorY }}
        />
      )}
      {sparkline.reading && (
        <View
          ariaHidden
          part="readout"
          style={{ '--sparkline-x': sparkline.cursorX, '--sparkline-y': sparkline.cursorY }}
        >
          <Text part="readout-text">{sparkline.readout}</Text>
        </View>
      )}
      <Announce
        follows={sparkline.live}
        part="live"
      >
        {sparkline.live}
      </Announce>
      <View
        hidden
        part="overview"
        platform="web"
      >
        <Text part="overview-text">{sparkline.overview}</Text>
      </View>
    </>
  ),
})
