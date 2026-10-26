import { headless, number, Slot, Text, View } from '../../../render.js'
import { bind, derive, fold } from '../../../tree.js'

/**
 * Avatar Group's headless tier: a row of avatars that overlap, folded into a
 * count past `max`.
 *
 * **A group named by `label`**, and a phone gives it no role without one.
 *
 * **Past `max`, the avatars fold into a count**, `+3`, drawn last along the
 * row. The folded avatars are left out of what a screen reader reaches, so
 * the count is a picture named by `overflow-label`, with how many it stands
 * for and their names.
 */
export default headless('avatar-group', {
  props: {
    label: '',
    max: number(),
    overflowLabel: '{count, plural, one {# more: {names}} other {# more: {names}}}',
  },
  events: {},
  states: ['settled'],
  derived: {
    count: derive('avatar-group-count'),
    folds: derive('avatar-group-folds'),
    overflowName: derive('avatar-group-overflow-name'),
  },
  fold: fold({ max: 'max' }),
  host: { label: bind('label'), role: 'group' },
  render: ({ derived }) => (
    <>
      <Slot />
      {derived.folds && (
        <View
          label={derived.overflowName}
          part="overflow"
          role="img"
        >
          <Text part="overflow-count">{derived.count}</Text>
        </View>
      )}
    </>
  ),
})
