import { bind, headless, prop, region } from '../../../tree.js'

/**
 * Stat Group's headless tier: a row of related measurements.
 *
 * **A named group is a group**, so a screen reader announces the stats
 * together under its name, and an unnamed one has no role. `label` names it
 * on both platforms. The web element also hears `aria-label` and
 * `aria-labelledby` written on its host, which a phone does not read.
 */
export default headless('stat-group', {
  events: [],
  host: { label: bind('label'), role: 'group' },
  props: [prop('label', 'string', { default: '' })],
  states: ['settled'],
  tree: [region('default')],
})
