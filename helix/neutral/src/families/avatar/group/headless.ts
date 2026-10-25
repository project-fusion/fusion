import { bind, box, derive, fold, headless, prop, region, text, when } from '../../../tree.js'

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
  derived: {
    count: derive('avatar-group-count'),
    folds: derive('avatar-group-folds'),
    'overflow-name': derive('avatar-group-overflow-name'),
  },
  events: [],
  fold: fold({ max: 'max' }),
  host: { label: bind('label'), role: 'group' },
  props: [
    prop('label', 'string', { default: '' }),
    prop('max', 'number'),
    prop('overflow-label', 'string', {
      default: '{count, plural, one {# more: {names}} other {# more: {names}}}',
    }),
  ],
  states: ['settled'],
  tree: [
    region('default'),
    when(
      'folds',
      box('overflow', { label: bind('overflow-name'), role: 'img' }, [
        text('overflow-count', { says: bind('count') }),
      ]),
    ),
  ],
})
