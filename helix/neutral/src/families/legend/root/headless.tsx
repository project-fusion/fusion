import {
  bare,
  cancelable,
  headless,
  oneOf,
  Pressable,
  Repeat,
  Text,
  View,
} from '../../../render.js'

/**
 * Legend's headless tier: a list of the series in a chart, each name beside
 * the color it is drawn in.
 *
 * **It reads the table a `for` names**, as the charts do, so the two always
 * match: one entry for each column of numbers under `series`, one for each row
 * under `categories`, for a ring whose slices are the rows, and each column
 * but the first under `measures`, for a scatter. Each entry carries its
 * series' palette slot as `--chart-series`, which the swatch reads.
 *
 * **`toggles` makes each entry a button that hides its series** in every
 * chart reading the same table, which a phone holds by the table's id as the
 * web holds it on the table. The button is pressed while its series is shown.
 * `hidden-series` holds the hidden names, separated by commas, so a page can
 * start with some hidden; a press asks first, with `before-change` carrying
 * the list it would leave, and sends `change` once it stands.
 *
 * **Named by `label`**, or by the table's caption.
 *
 * **Web only:** the arrow keys, Home, End, and typed letters that move among
 * the toggles as one tab stop, which a phone's screen reader walks one by one.
 */
export default headless('legend', {
  props: {
    entries: oneOf(['categories', 'measures', 'series']),
    for: '',
    hiddenSeries: '',
    label: '',
    toggles: false,
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare([]),
  },
  states: ['settled'],
  legend: {
    entries: 'entries',
    named: 'named',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    role: 'role',
  },
  render: ({ entry, legend, props }) => (
    <View
      label={legend.named}
      part="list"
      role={legend.role}
    >
      <Repeat
        each={legend.entries}
        key="key"
        part="entries"
      >
        <View
          also={{ 'entry-hidden': entry.hidden }}
          data-emphasis={entry.emphasis}
          data-material={entry.material}
          data-series={entry.series}
          part="entry"
          role={props.toggles ? 'presentation' : 'listitem'}
          style={{ '--chart-series': entry.color }}
        >
          {props.toggles && (
            <Pressable
              label={entry.name}
              part="toggle"
              pressed={entry.pressed}
              role="button"
            >
              <View part="name">
                <Text part="name-words">{entry.name}</Text>
              </View>
            </Pressable>
          )}
          {!props.toggles && (
            <View part="name">
              <Text part="name-words">{entry.name}</Text>
            </View>
          )}
        </View>
      </Repeat>
    </View>
  ),
})
