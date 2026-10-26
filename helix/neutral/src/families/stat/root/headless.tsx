import { headless, number, object, oneOf, Slot, Text, View, Wrap } from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Stat's headless tier: one measurement, with the label that names it.
 *
 * **Each piece is a region and a part of the same name**: the label, the
 * value, the unit and the trend. The label comes first, so a screen reader
 * reads what the figure counts before the number. A Trend passed into
 * `trend` is read after the figure it qualifies.
 *
 * **A stat with a label is a group named by it**, through the host, where
 * the web element sets the role and the name through `ElementInternals`. A
 * phone names the group with the words passed into the label, and gives a
 * stat with no label no role.
 *
 * **`value` writes the figure** with `format-options` in `locale`, in place
 * of the default region, by core's `stat-figure` derivation, which the web
 * element's `formatNumber` call matches. A phone reads the reader's locale
 * where `locale` is empty.
 *
 * **A phone lays the figure and the unit out on one line**, `figure`, which
 * the web lays out on its grid's two columns, and draws the label after the
 * figure under `column-reverse`, which the web places with `order`. The
 * `has-label`, `has-unit` and `has-trend` states are whether each region
 * holds something.
 */
export default headless('stat', {
  props: {
    direction: oneOf(['column-reverse', 'row', 'row-reverse']),
    /* JSON on the web's attribute, such as `{"notation":"compact"}`. */
    formatOptions: object(),
    locale: '',
    value: number(),
  },
  events: {},
  states: ['has-label', 'has-trend', 'has-unit', 'settled'],
  derived: {
    hasLabel: bind('label'),
    hasTrend: bind('trend'),
    hasUnit: bind('unit'),
    labelLast: derive('stat-label-last'),
    written: derive('stat-figure'),
  },
  host: { label: bind('label'), role: 'group' },
  render: ({ derived }) => (
    <>
      {!derived.labelLast && (
        <Slot
          name="label"
          part="label"
        />
      )}
      <Wrap
        part="figure"
        platform="native"
      >
        {!derived.written ? (
          <Slot part="value" />
        ) : (
          <View part="value">
            <Text part="figure">{derived.written}</Text>
          </View>
        )}
        <Slot
          name="unit"
          part="unit"
        />
      </Wrap>
      <Slot
        name="trend"
        part="trend"
      />
      {derived.labelLast && (
        <Slot
          name="label"
          part="label"
        />
      )}
    </>
  ),
})
